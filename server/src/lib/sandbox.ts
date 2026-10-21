/**
 * Provides utilities for managing project sandbox directories, including
 * path validation, directory creation, file reading and writing, command
 * execution, and recursive collection of project files.
 *
 * Commands are executed with the sandbox directory as their working directory.
 */

import { exec, type ExecException } from "child_process";
import path from "path";
import fs from "fs/promises";
import type { Dirent } from "fs";
import { sandboxRoot } from "../config/sandbox.js";
import { promisify } from "util";

/**
 * This is a TypeScript type that represents a collection of files.
 *
 * Key   = relative file path
 * Value = file content
 *
 * Example:
 * {
 *   "src/App.tsx": "export default function App() {...}",
 *   "src/index.css": "body { margin: 0; }"
 * }
 */
export type FileCollection = Record<string, string>;

/**
 * This is a TypeScript type that represents the content of a single file in the sandbox.
 *
 * `path`    = file's location relative to the project directory
 * `content` = contents of the file
 *
 * Example:
 * {
 *   path: "src/App.tsx",
 *   content: "export default function App() {...}"
 * }
 */
export type SandboxFileContent = {
  path: string;
  content: string;
};

/**
 * Checks whether targetPath stays inside root.
 *
 * Why do we need this?
 * A project should not be able to access files outside
 * its permitted directory through a manipulated file path.
 *
 * Example:
 * root       = "C:\Projects\lovable-clone\data\sandbox\project_123"
 * targetPath = "C:\Projects\lovable-clone\data\sandbox\project_123\src\App.tsx"
 * Result: allowed.
 *
 * But a path pointing to another project's directory is rejected.
 *
 */
function assertPathInsideRoot(
  root: string,
  targetPath: string,
  errorMessage = "Invalid path",
): void {
  // Calculate the path needed to reach targetPath from root.
  const relativePath = path.relative(root, targetPath);

  // A path beginning with ".." escapes the root.
  // An absolute relativePath is also rejected defensively.
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(errorMessage);
  }
}

/**
 * Checks whether a sandbox directory is inside sandboxRoot.
 *
 * This is a specialized wrapper around assertPathInsideRoot().
 * It supplies the common root and a sandbox-specific error message.
 *
 * Example:
 * sandboxRoot = "C:\Projects\lovable-clone\data\sandbox"
 * sandboxPath = "C:\Projects\lovable-clone\data\sandbox\project_123"
 * Result: allowed.
 */
function assertSandboxPathInsideRoot(sandboxPath: string): void {
  assertPathInsideRoot(
    sandboxRoot,
    sandboxPath,
    "Sandbox path is outside the root directory",
  );
}

/**
 * Cleans a user-supplied relative file path.
 *
 * Why?
 * Paths may contain inconsistent separators, leading slashes,
 * empty segments, "." or ".." segments.
 *
 * Example:
 * Input:  "/src\components\App.tsx"
 * Output on Windows: "src\components\App.tsx"
 * Output on Linux:   "src/components/App.tsx"
 *
 * This function normalizes the path. It does not independently
 * guarantee security; the resolved path must also be validated.
 */
function sanitizeSandboxRelativePath(relativePath: string): string {
  // Remove leading forward or backward slashes.
  const withoutLeadingSlashes = relativePath.replace(/^[/\\]+/, "");

  // Normalize separators, split into segments, and remove empties.
  const segments = withoutLeadingSlashes
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment.length > 0);

  const safeSegments: string[] = [];

  for (const segment of segments) {
    // Ignore current-directory and parent-directory segments.
    if (segment === "." || segment === "..") {
      continue;
    }

    safeSegments.push(segment);
  }

  // Rebuild the path using the current operating system's separator.
  const cleaned = safeSegments.join(path.sep);

  // Reject paths that become empty after cleaning.
  if (!cleaned) {
    throw new Error("Invalid file path");
  }

  return cleaned;
}

/**
 * Converts a relative file path into an absolute path
 * and checks that it stays inside the specified project.
 *
 * Example:
 * sandboxDir   = "C:\Projects\lovable-clone\data\sandbox\project_123"
 * relativePath = "src/App.tsx"
 *
 * Returns:
 * cleanedPath = "src\App.tsx"
 * filePath    = "C:\Projects\lovable-clone\data\sandbox\project_123\src\App.tsx"
 *
 * cleanedPath is useful for identifying the file.
 * filePath is used for filesystem operations.
 */
function resolveSandboxFilePath(
  sandboxDir: string,
  relativePath: string,
): { cleanedPath: string; filePath: string } {
  // Step 1: Normalize the relative path.
  const cleanedPath = sanitizeSandboxRelativePath(relativePath);

  // Step 2: Construct the absolute filesystem path.
  const filePath = path.resolve(sandboxDir, cleanedPath);

  // Step 3: Ensure the file belongs to this specific project
  assertPathInsideRoot(
    sandboxDir,
    filePath,
    `Unsafe file path: ${relativePath}`,
  );

  // Return both representations for different use cases.
  return { cleanedPath, filePath };
}

/**
 * Converts a sandbox ID into its absolute project directory.
 *
 * Example:
 * sandboxRoot = "C:\Projects\lovable-clone\data\sandbox"
 * sandboxId   = "project_123"
 *
 * Result:
 * "C:\Projects\lovable-clone\data\sandbox\project_123"
 *
 * This function calculates and validates the path.
 * It does not create the directory.
 */
function resolveSandboxDir(sandboxId: string): string {
  // A sandbox ID should be an identifier, not an arbitrary path.
  if (!sandboxId || sandboxId.includes("..") || path.isAbsolute(sandboxId)) {
    throw new Error("Invalid sandbox ID");
  }

  // Construct the project's absolute directory.
  const sandboxDir = path.resolve(sandboxRoot, sandboxId);

  // Verify that the directory remains inside sandboxRoot.
  assertSandboxPathInsideRoot(sandboxDir);

  return sandboxDir;
}

/**
 * Ensures that a project's directory exists.
 *
 * If it doesn't exist, create it.
 * If it already exists, leave it in place.
 *
 * Returns the absolute directory path.
 */
export async function ensureSandbox(sandboxId: string): Promise<string> {
  // Find and validate the project's directory.
  const sandboxPath = resolveSandboxDir(sandboxId);

  // Create the directory and any missing parent directories.
  await fs.mkdir(sandboxPath, { recursive: true });

  return sandboxPath;
}

/**
 * Writes multiple files into a project's directory.
 *
 * Example input:
 * {
 *   "package.json": "{\"name\":\"my-app\"}",
 *   "src/App.tsx": "export default function App() {...}"
 * }
 *
 * The function creates required directories and writes each file.
 * Existing files with the same paths have their contents replaced.
 *
 * Returns the project's absolute directory.
 */
export async function writeSandboxFiles(
  sandboxId: string,
  fileCollection: FileCollection,
): Promise<string> {
  // Ensure the project directory exists before writing.
  const sandboxDir = await ensureSandbox(sandboxId);

  // Process all supplied files concurrently.
  await Promise.all(
    Object.entries(fileCollection).map(async ([relativePath, content]) => {
      // Calculate and validate the full path for this file.
      const { filePath } = resolveSandboxFilePath(sandboxDir, relativePath);

      // Create the file's parent directory if necessary.
      // For "src/App.tsx", this creates the "src" directory.
      await fs.mkdir(path.dirname(filePath), {
        recursive: true,
      });

      // Write the supplied content as text.
      await fs.writeFile(filePath, content, "utf-8");
    }),
  );

  return sandboxDir;
}

/**
 * Reads specific files from an existing project.
 *
 * Example:
 * readSandboxFiles("project_123", [
 *   "src/App.tsx",
 *   "package.json"
 * ]);
 *
 * Returns an array containing each file's relative path
 * and its content.
 *
 * If a requested file is missing or unreadable, the promise rejects.
 */
export async function readSandboxFiles(
  sandboxId: string,
  relativePaths: string[],
): Promise<SandboxFileContent[]> {
  // Resolve the project directory without creating it.
  const sandboxDir = resolveSandboxDir(sandboxId);

  // Read the requested files concurrently.
  return Promise.all(
    relativePaths.map(async (relativePath) => {
      // Validate and resolve each requested file path.
      const { cleanedPath, filePath } = resolveSandboxFilePath(
        sandboxDir,
        relativePath,
      );

      // Read the file as text.
      const content = await fs.readFile(filePath, "utf-8");

      // Return the relative path alongside its contents.
      return { path: cleanedPath, content };
    }),
  );
}

const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  "tmp",
  "temp",
  "cache",
  ".git",
]);
const SKIP_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

// Maximum size of an individual file to include: 10 MiB, in bytes.
const MAX_TRACKED_BYTE_SIZE = 1024 * 1024 * 10;

/**
 * This function recursively traverses a project's directory tree and collects all eligible files.
 */
export async function readSandboxTree(
  sandboxId: string,
): Promise<FileCollection> {
  // Construct the project's absolute path and ensure it stays inside the allowed root.
  const projectRoot = path.join(sandboxRoot, sandboxId);
  assertSandboxPathInsideRoot(projectRoot);

  // Collect each eligible file's relative path and content.
  const files: FileCollection = {};

  // Define a recursive function to traverse the directory tree.
  const dfs = async (currentAbsolutePath: string): Promise<void> => {
    // entries is an array of Dirent objects representing the contents of the current directory.
    let entries: Dirent[];

    try {
      /**
       * Get the files and the sub-directories in the current directory.
       * fs.readdir() lists the contents of a directory on the filesystem.
       *
       * withFileTypes: true option tells fs.readdir() to return Dirent objects instead of just file names.
       */
      entries = await fs.readdir(currentAbsolutePath, { withFileTypes: true });
    } catch (error) {
      console.error(`Failed to read directory: ${currentAbsolutePath}`, error);
      return;
    }

    for (const entry of entries) {
      // Ignore hidden files and directories, such as .env and .git.
      if (entry.name.startsWith(".")) continue;

      const fullPath = path.join(currentAbsolutePath, entry.name);

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) await dfs(fullPath);
        continue;
      }

      if (!entry.isFile() || SKIP_FILES.has(entry.name)) continue;

      try {
        const stats = await fs.stat(fullPath);
        if (stats.size > MAX_TRACKED_BYTE_SIZE) {
          console.warn(
            `Skipping large file: ${fullPath} (${stats.size} bytes)`,
          );
          continue;
        }

        files[path.relative(projectRoot, fullPath)] = await fs.readFile(
          fullPath,
          {
            encoding: "utf-8",
          },
        );
      } catch (error) {
        console.error(`Failed to get stats for file: ${fullPath}`, error);
      }
    }
  };

  // Start the DFS traversal from the sandbox's root directory.
  await dfs(projectRoot);

  return files;
}

const execAsync = promisify(exec);

const SANDBOX_COMMAND_TIMEOUT_MS = 60_000;
const SANDBOX_COMMAND_MAX_BUFFER = 1024 * 1024; // 1MB

function formatCommandSuccess(stdout: string, stderr: string): string {
  const trimmedStdout = stdout.trim();
  const trimmedStderr = stderr.trim();
  if (trimmedStdout) return trimmedStdout;
  if (trimmedStderr) return trimmedStderr;
  return "no output";
}

function formatCommandFailure(
  message: string,
  stdout = "",
  stderr = "",
): string {
  const parts = [`Error: ${message}`];
  const trimmedStdout = stdout.trim();
  const trimmedStderr = stderr.trim();
  if (trimmedStdout) parts.push(`stdout:\n${trimmedStdout}`);
  if (trimmedStderr) parts.push(`stderr:\n${trimmedStderr}`);
  return parts.join("\n\n");
}

function asExecException(error: unknown): ExecException | null {
  if (!(error instanceof Error)) return null;
  if (!("stdout" in error || "stderr" in error)) return null;
  return error as ExecException;
}

export async function runSandboxCommand(
  sandboxId: string,
  command: string,
): Promise<string> {
  try {
    const sandboxDir = await ensureSandbox(sandboxId);
    const { stdout, stderr } = await execAsync(command, {
      cwd: sandboxDir,
      timeout: SANDBOX_COMMAND_TIMEOUT_MS,
      maxBuffer: SANDBOX_COMMAND_MAX_BUFFER,
    });
    return formatCommandSuccess(String(stdout), String(stderr));
  } catch (error) {
    const execError = asExecException(error);
    if (execError) {
      return formatCommandFailure(
        execError.message,
        String(execError.stdout ?? ""),
        String(execError.stderr ?? ""),
      );
    }
    return formatCommandFailure(
      error instanceof Error ? error.message : String(error),
    );
  }
}
