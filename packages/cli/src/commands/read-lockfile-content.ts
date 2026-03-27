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
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}
