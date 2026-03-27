import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import { parse, type ParsedDependency } from 'lockparse';

/**
 * Parses a yarn.lock file into a normalized LockfileSnapshot.
 * Supports both classic (v1) and berry (v2+) formats — lockparse handles both
 * via the same 'yarn' format key.
 *
 * Multi-range entries (e.g. `lodash@^4.17.20, lodash@^4.17.21`) produce
 * duplicate package entries from lockparse; first-encountered version wins.
 */
export async function parseYarnLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = await parse(content, 'yarn');
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
 * The LockfileParser adapter for yarn, conforming to the core contract.
 * Both classic (v1) and berry (v2+) use the same filename.
 */
export const yarnLockfileParser: LockfileParser = {
  format: 'yarn',
  lockfileNames: ['yarn.lock'],
  parse: parseYarnLockfile,
};
