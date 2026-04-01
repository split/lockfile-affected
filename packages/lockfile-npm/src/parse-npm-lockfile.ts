import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';

interface NpmPackageLock {
  packages: Record<string, NpmPackageEntry>;
}

interface NpmPackageEntry {
  version?: string;
  resolved?: string;
  dependencies?: Record<string, string>;
}

export function parseNpmLockfile(content: string): Promise<LockfileSnapshot> {
  const lockfile = JSON.parse(content) as NpmPackageLock;
  return Promise.resolve(toSnapshot(lockfile));
}

function toSnapshot(lockfile: NpmPackageLock): LockfileSnapshot {
  const snapshot = new Map<string, ReadonlyMap<string, string>>();

  const contexts = new Set<string>();
  contexts.add('.');

  for (const key of Object.keys(lockfile.packages)) {
    if (key.startsWith('packages/')) {
      const workspacePath = key.split('/node_modules/')[0];
      if (workspacePath && !workspacePath.includes('node_modules')) {
        contexts.add(workspacePath);
      }
    }
  }

  for (const context of contexts) {
    const packages = extractContextPackages(context, lockfile.packages);
    if (packages.size > 0) {
      snapshot.set(context, packages);
    }
  }

  return snapshot;
}

function extractContextPackages(
  context: string,
  packages: Record<string, NpmPackageEntry>,
): Map<string, string> {
  const result = new Map<string, string>();

  const depKeys = getDependencyKeys(context, packages);

  for (const depKey of depKeys) {
    const pkg = packages[depKey];
    if (pkg?.version) {
      const depName = depKey
        .replace(/^node_modules\//, '')
        .split('/node_modules/')
        .pop();
      if (depName) {
        const nameParts = depName.split('/');
        const name = depName.startsWith('@') ? nameParts.slice(0, 2).join('/') : nameParts[0];
        if (name && !result.has(name)) {
          result.set(name, pkg.version);
        }
      }
    }
  }

  return result;
}

function getDependencyKeys(context: string, packages: Record<string, NpmPackageEntry>): string[] {
  const keys: string[] = [];

  if (context === '.') {
    const rootPkg = packages[''];
    if (rootPkg?.dependencies) {
      for (const dep of Object.keys(rootPkg.dependencies)) {
        keys.push(`node_modules/${dep}`);
      }
    }
  } else {
    const workspacePkg = packages[context];
    if (workspacePkg?.dependencies) {
      for (const dep of Object.keys(workspacePkg.dependencies)) {
        const nestedPath = `${context}/node_modules/${dep}`;
        if (packages[nestedPath]) {
          keys.push(nestedPath);
        } else {
          keys.push(`node_modules/${dep}`);
        }
      }
    }
  }

  return keys;
}

export function detectNpmLockfile(content: string): boolean {
  try {
    const parsed: unknown = JSON.parse(content);
    return typeof parsed === 'object' && parsed !== null && 'packages' in parsed;
  } catch {
    return false;
  }
}

export const npmLockfileParser: LockfileParser = {
  format: 'npm',
  lockfileNames: ['package-lock.json'],
  detect: detectNpmLockfile,
  parse: parseNpmLockfile,
};
