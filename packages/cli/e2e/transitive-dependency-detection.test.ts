import { describe, expect, it } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { runAffectedCommand } from '../src/commands/run-affected-command.js';
import type { CliOptions } from '../src/options/cli-options.types.js';
import { resolveAffectedPackages, ALL_DEPENDENCY_TYPES } from '@lockfile-affected/core';
import type { LockfileDiff, WorkspaceGraph } from '@lockfile-affected/core';

function pkgWith(deps: { dependencies?: string[]; devDependencies?: string[] } = {}) {
  return {
    dependencies: new Set(deps.dependencies ?? []),
    devDependencies: new Set(deps.devDependencies ?? []),
    peerDependencies: new Set<string>(),
    optionalDependencies: new Set<string>(),
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const fixtures = [
  {
    format: 'pnpm',
    name: 'pnpm',
    beforeLock: 'before-pnpm-lock.yaml',
    afterLock: 'after-pnpm-lock.yaml',
  },
  {
    format: 'npm',
    name: 'npm',
    beforeLock: 'before-package-lock.json',
    afterLock: 'after-package-lock.json',
  },
  {
    format: 'yarn',
    name: 'yarn',
    beforeLock: 'before-yarn.lock',
    afterLock: 'after-yarn.lock',
  },
  {
    format: 'bun',
    name: 'bun',
    beforeLock: 'before-bun.lock',
    afterLock: 'after-bun.lock',
  },
] as const;

describe.each(fixtures)(
  'E2E: Transitive dependency detection ($name)',
  ({ format, name, beforeLock, afterLock }) => {
    const fixturesDir = join(__dirname, 'fixtures', `${name}-transitive`);

    it('detects changes when lodash version changes in lockfile', async () => {
      const workspaceRoot = join(fixturesDir, 'workspace');
      const beforeLockfilePath = join(fixturesDir, beforeLock);
      const afterLockfilePath = join(fixturesDir, afterLock);

      const options: CliOptions = {
        lockfileBefore: beforeLockfilePath,
        lockfileAfter: afterLockfilePath,
        workspaceRoot,
        output: 'json',
        format,
        deps: true,
        dev: true,
        peer: true,
        optional: true,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toContain('pkg-base');
    });

    it('detects transitive dependencies when workspace package depends on another workspace package', async () => {
      const workspaceRoot = join(fixturesDir, 'workspace');
      const beforeLockfilePath = join(fixturesDir, beforeLock);
      const afterLockfilePath = join(fixturesDir, afterLock);

      const options: CliOptions = {
        lockfileBefore: beforeLockfilePath,
        lockfileAfter: afterLockfilePath,
        workspaceRoot,
        output: 'json',
        format,
        deps: true,
        dev: true,
        peer: true,
        optional: true,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toContain('pkg-base');
      expect(affected).toContain('pkg-middle');
    });

    it('respects dependency type filtering for transitive dependencies', async () => {
      const workspaceRoot = join(fixturesDir, 'workspace');
      const beforeLockfilePath = join(fixturesDir, beforeLock);
      const afterLockfilePath = join(fixturesDir, afterLock);

      const options: CliOptions = {
        lockfileBefore: beforeLockfilePath,
        lockfileAfter: afterLockfilePath,
        workspaceRoot,
        output: 'json',
        format,
        deps: true,
        dev: false,
        peer: false,
        optional: false,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toContain('pkg-base');
      expect(affected).toContain('pkg-middle');
    });

    it('returns empty when lockfiles are identical', async () => {
      const workspaceRoot = join(fixturesDir, 'workspace');
      const beforeLockfilePath = join(fixturesDir, beforeLock);

      const options: CliOptions = {
        lockfileBefore: beforeLockfilePath,
        lockfileAfter: beforeLockfilePath,
        workspaceRoot,
        output: 'json',
        format,
        deps: true,
        dev: true,
        peer: true,
        optional: true,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toEqual([]);
    });
  },
);

describe('E2E: Per-importer detection (pnpm only)', () => {
  const fixturesDir = join(__dirname, 'fixtures', 'pnpm-transitive');

  it('detects changes in specific importer even when root unchanged', async () => {
    const workspaceRoot = join(fixturesDir, 'workspace');
    const beforeLockfilePath = join(fixturesDir, 'before-pnpm-lock.yaml');
    const afterLockfilePath = join(fixturesDir, 'after-pnpm-lock.yaml');

    const options: CliOptions = {
      lockfileBefore: beforeLockfilePath,
      lockfileAfter: afterLockfilePath,
      workspaceRoot,
      output: 'json',
      format: 'pnpm',
      deps: true,
      dev: true,
      peer: true,
      optional: true,
    };

    const result = await runAffectedCommand(options);
    const affected = JSON.parse(result);

    expect(affected).toContain('pkg-a');
  });
});

describe('E2E: Deep transitive dependency chain (4+ levels)', () => {
  const fixturesDir = join(__dirname, 'fixtures', 'pnpm-deep-chain');

  it('marks all packages affected when external dep changes at 4-level depth', async () => {
    const workspaceRoot = join(fixturesDir, 'workspace');
    const beforeLockfilePath = join(fixturesDir, 'before-pnpm-lock.yaml');
    const afterLockfilePath = join(fixturesDir, 'after-pnpm-lock.yaml');

    const options: CliOptions = {
      lockfileBefore: beforeLockfilePath,
      lockfileAfter: afterLockfilePath,
      workspaceRoot,
      output: 'json',
      format: 'pnpm',
      deps: true,
      dev: true,
      peer: true,
      optional: true,
    };

    const result = await runAffectedCommand(options);
    const affected = JSON.parse(result);

    expect(affected).toContain('pkg-leaf');
    expect(affected).toContain('pkg-base');
    expect(affected).toContain('pkg-middle');
    expect(affected).toContain('pkg-top');
  });
});

describe('E2E: Diamond dependency graph', () => {
  it('marks all packages that depend on changed package via multiple paths', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ dependencies: ['lib-a', 'lib-b'] }) }],
      ['lib-a', { name: 'lib-a', dependencyGroups: pkgWith({ dependencies: ['lib-c'] }) }],
      ['lib-b', { name: 'lib-b', dependencyGroups: pkgWith({ dependencies: ['lib-c'] }) }],
      ['lib-c', { name: 'lib-c', dependencyGroups: pkgWith({ dependencies: ['shared-dep'] }) }],
    ]);
    const diff: LockfileDiff = {
      addedContexts: new Map(),
      removedContexts: new Map(),
      changed: new Map([
        [
          '.',
          {
            added: new Map(),
            removed: new Map(),
            changed: new Map([['shared-dep', { from: '1.0.0', to: '2.0.0' }]]),
          },
        ],
      ]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    expect(affected.has('lib-c')).toBe(true);
    expect(affected.has('lib-a')).toBe(true);
    expect(affected.has('lib-b')).toBe(true);
    expect(affected.has('app')).toBe(true);
  });
});
