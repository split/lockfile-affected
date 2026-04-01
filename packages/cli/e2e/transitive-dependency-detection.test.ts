import { describe, expect, it } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { runAffectedCommand } from '../src/commands/run-affected-command.js';
import type { CliOptions } from '../src/options/cli-options.types.js';

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

describe.each(fixtures)(
  'E2E: Transitive external dependency ($name)',
  ({ format, name, beforeLock, afterLock }) => {
    const fixturesDir = join(__dirname, 'fixtures', `${name}-transitive-external`);

    it('detects affected workspace packages when external dep changes in transitive workspace dependency', async () => {
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

      expect(affected).toContain('pkg-a');
      expect(affected).toContain('pkg-b');
    });
  },
);

describe.each(fixtures)(
  'E2E: Deep transitive dependency chain ($name)',
  ({ format, name, beforeLock, afterLock }) => {
    const fixturesDir = join(__dirname, 'fixtures', `${name}-deep-chain`);

    it('marks all packages affected when external dep changes at 4-level depth', async () => {
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

      expect(affected).toContain('pkg-leaf');
      expect(affected).toContain('pkg-base');
      expect(affected).toContain('pkg-middle');
      expect(affected).toContain('pkg-top');
    });
  },
);

describe.each(fixtures)(
  'E2E: Diamond dependency graph ($name)',
  ({ format, name, beforeLock, afterLock }) => {
    const fixturesDir = join(__dirname, 'fixtures', `${name}-diamond`);

    it('marks all packages affected when shared dep changes', async () => {
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

      expect(affected).toContain('lib-c');
      expect(affected).toContain('lib-a');
      expect(affected).toContain('lib-b');
      expect(affected).toContain('app');
    });
  },
);

const rootDepsFixtures = [
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

describe.each(rootDepsFixtures)(
  'E2E: --root-deps-affect-all ($name)',
  ({ format, name, beforeLock, afterLock }) => {
    const fixturesDir = join(__dirname, 'fixtures', `${name}-root-deps-affect-all`);

    it('detects affected packages when --root-deps-affect-all is NOT used (normal detection)', async () => {
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
        rootDepsAffectAll: false,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toContain('pkg-a');
    });

    it('affects workspace packages that depend on changed root deps when --root-deps-affect-all is used', async () => {
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
        rootDepsAffectAll: true,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toContain('pkg-a');
      expect(affected).not.toContain('test-monorepo');
    });

    it('affects workspace packages when --root-deps-affect-all is used even if filter only includes some dep types', async () => {
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
        rootDepsAffectAll: true,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toContain('pkg-a');
      expect(affected).not.toContain('test-monorepo');
    });

    it('affects no packages when --root-deps-affect-all is used but filter excludes all changed root dep types', async () => {
      const workspaceRoot = join(fixturesDir, 'workspace');
      const beforeLockfilePath = join(fixturesDir, beforeLock);
      const afterLockfilePath = join(fixturesDir, afterLock);

      const options: CliOptions = {
        lockfileBefore: beforeLockfilePath,
        lockfileAfter: afterLockfilePath,
        workspaceRoot,
        output: 'json',
        format,
        deps: false,
        dev: false,
        peer: true,
        optional: false,
        rootDepsAffectAll: true,
      };

      const result = await runAffectedCommand(options);

      const affected = JSON.parse(result);
      expect(affected).toHaveLength(0);
    });
  },
);
