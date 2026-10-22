export async function pingWorkflow(name: string): Promise<string> {
  return `Hello, ${name}! The ping workflow has been successfully executed.`;
}
