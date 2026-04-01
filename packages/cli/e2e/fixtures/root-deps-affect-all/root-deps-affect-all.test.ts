import { describe, expect, it } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { runAffectedCommand } from '../../../src/commands/run-affected-command.js';
import type { CliOptions } from '../../../src/options/cli-options.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  'E2E: --root-deps-affect-all ($name)',
  ({ format, name, beforeLock, afterLock }) => {
    const fixturesDir = join(__dirname, name);

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
