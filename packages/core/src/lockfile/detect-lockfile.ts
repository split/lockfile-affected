import { access } from 'node:fs/promises';
import { join } from 'node:path';
import type { LockfileParser } from '../types/lockfile.js';

export type DetectedLockfile = {
  readonly path: string;
  readonly format: string;
};

/**
 * Finds the first known lockfile in `dir` by checking each parser's `lockfileNames`.
 * Returns the absolute path and the format name from the matching parser.
 * Throws if no lockfile is found.
 *
 * Supports: pnpm, npm, yarn, and bun lockfile formats.
 */
export async function detectLockfile(
  dir: string,
  parsers: readonly LockfileParser[],
): Promise<DetectedLockfile> {
  for (const parser of parsers) {
    for (const filename of parser.lockfileNames) {
      const fullPath = join(dir, filename);
      try {
        await access(fullPath);
        return { path: fullPath, format: parser.format };
      } catch {
        // not found, try next
      }
    }
  }

  const allNames = parsers.flatMap((p) => p.lockfileNames);
  throw new Error(`No lockfile found in ${dir}. Expected one of: ${allNames.join(', ')}`);
}
