import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import { parse, type ParsedDependency } from 'lockparse';

/**
 * Parses a pnpm-lock.yaml file into a normalized LockfileSnapshot.
 * Uses lockparse as the underlying parser for a unified IR.
 *
 * Package names with peer dependency suffixes (e.g. react@18.0.0(typescript@5.0.0))
 * are normalized to just name → version.
 */
export async function parsePnpmLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = await parse(content, 'pnpm');
  return toSnapshot(parsed.packages);
}

function toSnapshot(packages: readonly ParsedDependency[]): LockfileSnapshot {
  const snapshot = new Map<string, string>();

  for (const pkg of packages) {
    if (pkg.name && pkg.version) {
      // First-encountered version wins. lockparse normalizes peer suffixes already.
      if (!snapshot.has(pkg.name)) {
        snapshot.set(pkg.name, pkg.version);
      }
    }
  }

  return snapshot;
}

/**
 * The LockfileParser adapter for pnpm, conforming to the core contract.
 */
export const pnpmLockfileParser: LockfileParser = {
  format: 'pnpm',
  lockfileNames: ['pnpm-lock.yaml'],
  parse: parsePnpmLockfile,
};
