import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import { parse, type ParsedDependency } from 'lockparse';

export async function parseYarnLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = await parse(content, 'yarn');
  return toSnapshot(parsed.packages);
}

function toSnapshot(packages: readonly ParsedDependency[]): LockfileSnapshot {
  const snapshot = new Map<string, ReadonlyMap<string, string>>();

  const rootPackages = new Map<string, string>();

  for (const pkg of packages) {
    if (pkg.name && pkg.version) {
      rootPackages.set(pkg.name, pkg.version);
    }
  }

  if (rootPackages.size > 0) {
    snapshot.set('.', rootPackages);
  }

  return snapshot;
}

export const yarnLockfileParser: LockfileParser = {
  format: 'yarn',
  lockfileNames: ['yarn.lock'],
  parse: parseYarnLockfile,
};
