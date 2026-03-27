import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import { parse, type ParsedDependency } from 'lockparse';

/**
 * Parses a package-lock.json file into a normalized LockfileSnapshot.
 * Supports lockfileVersion 2 and 3.
 * Uses lockparse as the underlying parser for a unified IR.
 */
export async function parseNpmLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = await parse(content, 'npm');
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
 * The LockfileParser adapter for npm, conforming to the core contract.
 */
export const npmLockfileParser: LockfileParser = {
  format: 'npm',
  lockfileNames: ['package-lock.json'],
  parse: parseNpmLockfile,
};
