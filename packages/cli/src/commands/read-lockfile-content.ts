import { readFile } from 'node:fs/promises';

/**
 * Reads lockfile content from a file path or stdin.
 * Pass '-' to read from stdin (process.stdin).
 */
export async function readLockfileContent(pathOrDash: string): Promise<string> {
  if (pathOrDash === '-') {
    return readStdin();
  }
  return readFile(pathOrDash, 'utf-8');
}

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
  }
  return chunks.join('');
}
