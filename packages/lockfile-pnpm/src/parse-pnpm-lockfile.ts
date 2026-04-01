import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import YAML from 'yaml';

interface PnpmImporter {
  dependencies?: Record<string, { specifier: string; version: string }>;
  devDependencies?: Record<string, { specifier: string; version: string }>;
  peerDependencies?: Record<string, { specifier: string; version: string }>;
  optionalDependencies?: Record<string, { specifier: string; version: string }>;
}

interface PnpmLockfile {
  importers: Record<string, PnpmImporter>;
}

export function parsePnpmLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = YAML.parse(content) as PnpmLockfile;
  return Promise.resolve(toSnapshot(parsed));
}

function stripPeerSuffix(version: string): string {
  const parenIndex = version.indexOf('(');
  return parenIndex === -1 ? version : version.slice(0, parenIndex);
}

function toSnapshot(lockfile: PnpmLockfile): LockfileSnapshot {
  const snapshot = new Map<string, ReadonlyMap<string, string>>();

  for (const [importerPath, importer] of Object.entries(lockfile.importers)) {
    const packages = new Map<string, string>();

    const depTypes = [
      importer.dependencies,
      importer.devDependencies,
      importer.peerDependencies,
      importer.optionalDependencies,
    ];

    for (const deps of depTypes) {
      if (deps) {
        for (const [pkgName, pkgInfo] of Object.entries(deps)) {
          const version = stripPeerSuffix(pkgInfo.version);
          packages.set(pkgName, version);
        }
      }
    }

    if (packages.size > 0) {
      snapshot.set(importerPath, packages);
    }
  }

  return snapshot;
}

export function detectPnpmLockfile(content: string): boolean {
  return content.includes('importers:');
}

export const pnpmLockfileParser: LockfileParser = {
  format: 'pnpm',
  lockfileNames: ['pnpm-lock.yaml'],
  detect: detectPnpmLockfile,
  parse: parsePnpmLockfile,
};
