import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import { parse as jsoncParse } from 'jsonc-parser';

interface BunLockfile {
  workspaces?: Record<string, { dependencies?: Record<string, string> }>;
  packages: Record<string, string[]>;
}

export function parseBunLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = jsoncParse(content) as BunLockfile;
  return Promise.resolve(toSnapshot(parsed));
}

function toSnapshot(lockfile: BunLockfile): LockfileSnapshot {
  const snapshot = new Map<string, ReadonlyMap<string, string>>();

  if (lockfile.workspaces) {
    for (const [workspacePath, workspace] of Object.entries(lockfile.workspaces)) {
      const packages = new Map<string, string>();
      const context = workspacePath === '' ? '.' : workspacePath;

      if (workspace.dependencies) {
        for (const [pkgName, specifier] of Object.entries(workspace.dependencies)) {
          const resolvedVersion = resolveVersion(pkgName, specifier, lockfile.packages);
          if (resolvedVersion) {
            packages.set(pkgName, resolvedVersion);
          }
        }
      }

      if (packages.size > 0) {
        snapshot.set(context, packages);
      }
    }
  }

  return snapshot;
}

function resolveVersion(
  pkgName: string,
  _specifier: string,
  packages: Record<string, string[]>,
): string | undefined {
  const exactKey = pkgName;
  if (packages[exactKey]?.[0]) {
    return extractVersion(packages[exactKey][0]);
  }

  for (const [key, value] of Object.entries(packages)) {
    if (key === pkgName || key.startsWith(pkgName + '@')) {
      return extractVersion(value[0]);
    }
  }

  return undefined;
}

function extractVersion(nameAtVersion: string | undefined): string | undefined {
  if (!nameAtVersion) return undefined;
  const atIndex = nameAtVersion.lastIndexOf('@');
  return atIndex === -1 ? nameAtVersion : nameAtVersion.slice(atIndex + 1);
}

export function detectBunLockfile(content: string): boolean {
  return content.includes('workspaces') && content.includes('packages');
}

export const bunLockfileParser: LockfileParser = {
  format: 'bun',
  lockfileNames: ['bun.lock'],
  detect: detectBunLockfile,
  parse: parseBunLockfile,
};
