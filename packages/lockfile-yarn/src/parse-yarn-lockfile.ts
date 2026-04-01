import type { LockfileParser, LockfileSnapshot } from '@lockfile-affected/core';
import YAML from 'yaml';

export function detectYarnLockfile(content: string): boolean {
  try {
    const parsed: unknown = YAML.parse(content);
    return typeof parsed === 'object' && parsed !== null && '__metadata' in parsed;
  } catch {
    return false;
  }
}

export function parseYarnLockfile(content: string): Promise<LockfileSnapshot> {
  const parsed = YAML.parse(content) as Record<string, unknown>;
  return Promise.resolve(toSnapshot(parsed));
}

interface YarnBerryEntry {
  version?: string;
  resolution?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function toSnapshot(parsed: Record<string, unknown>): LockfileSnapshot {
  const snapshot = new Map<string, Map<string, string>>();
  const rootPackages = new Map<string, string>();
  const workspacePackages = new Map<string, Map<string, string>>();

  for (const [key, value] of Object.entries(parsed)) {
    if (key === '__metadata') continue;
    if (!value || typeof value !== 'object') continue;

    const entry = value as YarnBerryEntry;
    if (!entry.version) continue;

    const parsed_ = parseBerryKey(key);
    if (parsed_) {
      if (parsed_.context === '.') {
        if (!rootPackages.has(parsed_.name)) {
          rootPackages.set(parsed_.name, entry.version);
        }
      } else {
        if (!workspacePackages.has(parsed_.context)) {
          workspacePackages.set(parsed_.context, new Map());
        }
        const ctxPackages = workspacePackages.get(parsed_.context)!;
        if (!ctxPackages.has(parsed_.name)) {
          ctxPackages.set(parsed_.name, entry.version);
        }
      }
    }
  }

  for (const [context, packages] of workspacePackages) {
    if (packages.size > 0) {
      snapshot.set(context, packages);
    }
  }

  if (rootPackages.size > 0) {
    snapshot.set('.', rootPackages);
  }

  return snapshot;
}

function parseBerryKey(key: string): { context: string; name: string } {
  const cleanKey = key;

  const nmMatch = cleanKey.match(/^(.+?)\/node-?modules\/(.+)$/);
  if (nmMatch) {
    const workspacePath = nmMatch[1];
    const packagePath = nmMatch[2];

    if (
      workspacePath &&
      packagePath &&
      !workspacePath.includes('node_modules') &&
      workspacePath !== 'node-modules'
    ) {
      return {
        context: workspacePath,
        name: extractPackageName(packagePath),
      };
    }
  }

  return { context: '.', name: extractPackageName(cleanKey) };
}

function extractPackageName(key: string): string {
  let cleanKey = key;

  const npmMatch = key.match(/^(.+?)@npm:/);
  if (npmMatch?.[1]) {
    cleanKey = npmMatch[1];
  }

  if (cleanKey.startsWith('@')) {
    const parts = cleanKey.split('/');
    if (parts.length >= 2) {
      return parts.slice(0, 2).join('/');
    }
  }

  const slashIndex = cleanKey.indexOf('/');
  return slashIndex === -1 ? cleanKey : cleanKey.slice(0, slashIndex);
}

export const yarnLockfileParser: LockfileParser = {
  format: 'yarn',
  lockfileNames: ['yarn.lock'],
  detect: detectYarnLockfile,
  parse: parseYarnLockfile,
};
