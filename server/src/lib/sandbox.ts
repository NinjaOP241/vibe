/**
 * E2B-backed project sandbox utilities.
 *
 * A Project stores the E2B sandbox ID in the database. Every operation first
 * resolves the project through projectService, so callers cannot operate on a
 * project that does not belong to their user.
 */

import { FileType, Sandbox } from "e2b";
import fs from "fs/promises";
import path from "path";

import { notFound } from "../utils/api-error.js";
import { projectService } from "../container.js";

/** Root directory used by generated applications inside every E2B sandbox. */
export const SANDBOX_WORKDIR = "/home/user/app";

/** Compile script copied into each E2B sandbox during provisioning. */
const COMPILE_SCRIPT_NAME = ".lovable-compile.mjs";

/** Backend-side location of the compile script that is copied to E2B. */
const COMPILE_SCRIPT_SOURCE_PATH = path.resolve(
  __dirname,
  "../../scripts/sandbox-compile-preview.mjs",
);

/** HTML file written by the compile script and returned by the preview API. */
const PREVIEW_OUTPUT_HTML = ".preview-output.html";

/** Maximum time allowed for a preview compilation. */
const COMPILE_SCRIPT_TIMEOUT_MS = 120_000;

/** Maximum time allowed for an arbitrary builder command. */
const SANDBOX_COMMAND_TIMEOUT_MS = 60_000;

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

const MAX_TRACKED_BYTE_SIZE = 10 * 1024 * 1024;

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
  const segments = relativePath
    .replace(/^[/\\]+/, "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(
      (segment) => segment.length > 0 && segment !== "." && segment !== "..",
    );

  const cleanedPath = segments.join("/");
  if (!cleanedPath) {
    throw new Error("Invalid file path");
  }

  return cleanedPath;
}

/**
 * Converts a project-relative path to an absolute Linux path inside E2B.
 *
 * Example:
 * relativePath = "src/App.tsx"
 * result       = "/home/user/app/src/App.tsx"
 *
 * The relative-path check prevents a path from escaping SANDBOX_WORKDIR.
 */
export function toSandboxAbsolute(relativePath: string): string {
  const cleanedPath = sanitizeSandboxRelativePath(relativePath);
  const absolutePath = path.posix.join(SANDBOX_WORKDIR, cleanedPath);
  const relativeToWorkdir = path.posix.relative(SANDBOX_WORKDIR, absolutePath);

  if (
    relativeToWorkdir.startsWith("..") ||
    path.posix.isAbsolute(relativeToWorkdir)
  ) {
    throw new Error(`Unsafe sandbox path: ${relativePath}`);
  }

  return absolutePath;
}

/**
 * Returns both the normalized project path and its E2B absolute path.
 *
 * Keeping both values avoids reconstructing the relative path after a file
 * operation and gives callers a consistent response shape.
 */
function resolveE2bSandboxPath(relativePath: string): {
  cleanedPath: string;
  absolutePath: string;
} {
  const cleanedPath = sanitizeSandboxRelativePath(relativePath);
  return {
    cleanedPath,
    absolutePath: toSandboxAbsolute(cleanedPath),
  };
}

/**
 * Creates or reuses the E2B sandbox for a project and returns its ID.
 *
 * Existing projects reuse their stored sandbox. New projects receive a
 * sandbox, whose ID is persisted through the project service before use.
 */
export async function provisionProjectSandbox(
  projectId: string,
  userId: string,
): Promise<string> {
  const project = await projectService.getProjectById(projectId, userId);

  if (!project) {
    throw notFound("Project not found");
  }

  if (project.e2bSandboxId) {
    const sandbox = await Sandbox.connect(project.e2bSandboxId);
    await ensureSandboxReady(sandbox);
    return project.e2bSandboxId;
  }

  const sandbox = await Sandbox.create({
    metadata: { projectId },
  });

  const updatedProject = await projectService.updateProjectE2BSandboxId(
    projectId,
    sandbox.sandboxId,
  );

  if (!updatedProject?.e2bSandboxId) {
    throw new Error("Project sandbox ID was not saved");
  }

  await bootstrapSandbox(sandbox);
  return updatedProject.e2bSandboxId;
}

/**
 * Connects to a project's E2B sandbox and makes sure its bootstrap files and
 * dependencies are available before the caller starts using it.
 */
async function connectE2bSandbox(
  projectId: string,
  userId: string,
): Promise<Sandbox> {
  const e2bSandboxId = await provisionProjectSandbox(projectId, userId);
  const sandbox = await Sandbox.connect(e2bSandboxId);
  await ensureSandboxReady(sandbox);
  return sandbox;
}

/**
 * Checks whether a sandbox has already been bootstrapped.
 *
 * Reading the compile script is a lightweight readiness check. If the read
 * fails because the sandbox is new or incomplete, bootstrapSandbox repairs it.
 */
async function ensureSandboxReady(sandbox: Sandbox): Promise<void> {
  const compileScriptPath = `${SANDBOX_WORKDIR}/${COMPILE_SCRIPT_NAME}`;

  try {
    await sandbox.files.read(compileScriptPath);
  } catch {
    await bootstrapSandbox(sandbox);
  }
}

/**
 * Runs a command inside E2B and throws useful command output on failure.
 */
async function runE2bSandboxCommand(
  sandbox: Sandbox,
  command: string,
  options?: { cwd?: string; requestTimeoutMs?: number },
): Promise<void> {
  const result = await sandbox.commands.run(command, {
    cwd: options?.cwd,
    requestTimeoutMs: options?.requestTimeoutMs,
  });

  if (result.exitCode !== 0) {
    const detail = [result.error, result.stderr, result.stdout]
      .filter((part) => part && part.trim().length > 0)
      .join("\n");

    throw new Error(
      `Sandbox command failed (exit ${result.exitCode}): ${command}${
        detail ? `\n${detail}` : ""
      }`,
    );
  }
}

/**
 * Initializes the E2B project directory, installs runtime dependencies, and
 * copies the preview compiler into the sandbox.
 */
export async function bootstrapSandbox(sandbox: Sandbox): Promise<void> {
  await runE2bSandboxCommand(sandbox, `mkdir -p ${SANDBOX_WORKDIR}`);

  const compileScriptSource = await fs.readFile(
    COMPILE_SCRIPT_SOURCE_PATH,
    "utf8",
  );
  await sandbox.files.write(
    `${SANDBOX_WORKDIR}/${COMPILE_SCRIPT_NAME}`,
    compileScriptSource,
  );

  await runE2bSandboxCommand(sandbox, "npm init -y", {
    cwd: SANDBOX_WORKDIR,
  });
  await runE2bSandboxCommand(
    sandbox,
    "npm install react react-dom esbuild lucide-react --yes",
    {
      cwd: SANDBOX_WORKDIR,
      requestTimeoutMs: 300_000,
    },
  );
}

/**
 * Writes generated project files to the E2B sandbox.
 *
 * Each parent directory is created before its file is uploaded. All paths are
 * validated against SANDBOX_WORKDIR before any E2B filesystem call.
 */
export async function writeSandboxFiles(
  sandboxId: string,
  fileCollection: FileCollection,
  userId: string,
): Promise<string> {
  const sandbox = await connectE2bSandbox(sandboxId, userId);

  await Promise.all(
    Object.entries(fileCollection).map(async ([relativePath, content]) => {
      const { absolutePath } = resolveE2bSandboxPath(relativePath);
      await runE2bSandboxCommand(
        sandbox,
        `mkdir -p ${JSON.stringify(path.posix.dirname(absolutePath))}`,
      );
      await sandbox.files.write(absolutePath, content);
    }),
  );

  return SANDBOX_WORKDIR;
}

/**
 * Reads selected project files from E2B and returns their relative paths.
 */
export async function readSandboxFiles(
  sandboxId: string,
  relativePaths: string[],
  userId: string,
): Promise<SandboxFileContent[]> {
  const sandbox = await connectE2bSandbox(sandboxId, userId);

  return Promise.all(
    relativePaths.map(async (relativePath) => {
      const { cleanedPath, absolutePath } = resolveE2bSandboxPath(relativePath);
      const content = await sandbox.files.read(absolutePath);
      return { path: cleanedPath, content };
    }),
  );
}

/**
 * Recursively reads eligible project files from E2B.
 *
 * Dependency folders, build output, hidden files, lockfiles, and files over
 * 10 MiB are skipped so the agent receives useful source files only.
 */
export async function readSandboxTree(
  sandboxId: string,
  userId: string,
): Promise<FileCollection> {
  const sandbox = await connectE2bSandbox(sandboxId, userId);
  const files: FileCollection = {};

  const walk = async (currentDirectory: string): Promise<void> => {
    let entries;
    try {
      entries = await sandbox.files.list(currentDirectory);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;

      const absolutePath = path.posix.join(currentDirectory, entry.name);
      if (entry.type === FileType.DIR) {
        if (!SKIP_DIRS.has(entry.name)) {
          await walk(absolutePath);
        }
        continue;
      }

      if (entry.type !== FileType.FILE || SKIP_FILES.has(entry.name)) {
        continue;
      }
      if (entry.size > MAX_TRACKED_BYTE_SIZE) continue;

      try {
        const relativePath = path.posix.relative(SANDBOX_WORKDIR, absolutePath);
        if (!relativePath || relativePath.startsWith("..")) continue;
        files[relativePath] = await sandbox.files.read(absolutePath);
      } catch {
        // Continue walking when an individual file is unreadable or binary.
      }
    }
  };

  await walk(SANDBOX_WORKDIR);
  return files;
}

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

/**
 * Runs an arbitrary builder command in the project's E2B working directory.
 *
 * The tool returns a formatted failure string instead of throwing so the
 * language model can inspect the command output and repair the project.
 */
export async function runSandboxCommand(
  sandboxId: string,
  command: string,
  userId: string,
): Promise<string> {
  try {
    const sandbox = await connectE2bSandbox(sandboxId, userId);
    const result = await sandbox.commands.run(command, {
      cwd: SANDBOX_WORKDIR,
      requestTimeoutMs: SANDBOX_COMMAND_TIMEOUT_MS,
    });

    if (result.exitCode !== 0) {
      return formatCommandFailure(
        result.error ?? `Command exited with code ${result.exitCode}`,
        result.stdout,
        result.stderr,
      );
    }

    return formatCommandSuccess(result.stdout, result.stderr);
  } catch (error) {
    return formatCommandFailure(
      error instanceof Error ? error.message : String(error),
    );
  }
}

function compileScriptCommand(extraArgs = ""): string {
  const scriptPath = `${SANDBOX_WORKDIR}/${COMPILE_SCRIPT_NAME}`;
  return `node ${JSON.stringify(scriptPath)}${extraArgs ? ` ${extraArgs}` : ""}`;
}

async function runCompileScript(
  sandbox: Sandbox,
  extraArgs = "",
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return sandbox.commands.run(compileScriptCommand(extraArgs), {
    cwd: SANDBOX_WORKDIR,
    requestTimeoutMs: COMPILE_SCRIPT_TIMEOUT_MS,
  });
}

/**
 * Compiles the E2B project and returns the generated HTML document.
 */
export async function compileSandbox(
  sandboxId: string,
  userId: string,
): Promise<string> {
  const sandbox = await connectE2bSandbox(sandboxId, userId);
  const result = await runCompileScript(sandbox);

  if (result.exitCode !== 0) {
    const detail = [result.stderr, result.stdout]
      .filter((part) => part.trim().length > 0)
      .join("\n");
    throw new Error(
      detail || `Preview compile failed with exit code ${result.exitCode}`,
    );
  }

  return sandbox.files.read(`${SANDBOX_WORKDIR}/${PREVIEW_OUTPUT_HTML}`);
}

/**
 * Performs the same compilation in check mode for the builder agent.
 *
 * The compile script intentionally exits with code 0 in --check mode even
 * when compilation fails, so this function returns a model-readable status.
 */
export async function compileSandboxCheck(
  sandboxId: string,
  userId: string,
): Promise<string> {
  try {
    const sandbox = await connectE2bSandbox(sandboxId, userId);
    const result = await runCompileScript(sandbox, "--check");
    const output = result.stdout.trim() || result.stderr.trim();

    if (output) return output;
    if (result.exitCode !== 0) {
      return `COMPILE FAILED:\nPreview compile exited with code ${result.exitCode}`;
    }
    return "COMPILE FAILED:\nPreview compile produced no output";
  } catch (error) {
    return `COMPILE FAILED:\n${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
