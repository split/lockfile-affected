import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import { parse, type ParsedDependency } from 'lockparse';

/**
 * Parses a bun.lock file into a normalized LockfileSnapshot.
 * Uses lockparse as the underlying parser for a unified IR.
 */
export async function parseBunLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = await parse(content, 'bun');
  return toSnapshot(parsed.packages);
}

function toSnapshot(packages: readonly ParsedDependency[]): LockfileSnapshot {
  const snapshot = new Map<string, string>();

  for (const pkg of packages) {
    if (pkg.name && pkg.version) {
      if (!snapshot.has(pkg.name)) {
        snapshot.set(pkg.name, pkg.version);
      }
    }
  }

  return snapshot;
}

/**
 * The LockfileParser adapter for Bun, conforming to the core contract.
 */
export const bunLockfileParser: LockfileParser = {
  format: 'bun',
  lockfileNames: ['bun.lock'],
  parse: parseBunLockfile,
};
