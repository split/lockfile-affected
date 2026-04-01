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
  'E2E: Deep transitive dependency chain ($name)',
  ({ format, name, beforeLock, afterLock }) => {
    const fixturesDir = join(__dirname, name);

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
