import { describe, expect, it } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { runAffectedCommand } from '../src/commands/run-affected-command.js';
import type { CliOptions } from '../src/options/cli-options.types.js';
import { parsePnpmLockfile } from '@lockfile-affected/lockfile-pnpm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const fixturesDir = join(__dirname, 'fixtures', 'pnpm-transitive');

/**
 * E2E tests for transitive dependency detection in the CLI.
 *
 * ## Test Structure
 *
 * Workspace structure (pnpm v9.0 format):
 * - pkg-base depends on lodash (external)
 * - pkg-middle depends on pkg-base (workspace)
 *
 * When lodash changes from 4.17.21 to 4.17.22:
 * - pkg-base should be affected (direct dependency on lodash)
 * - pkg-middle should be affected (transitive via pkg-base)
 *
 * ### Known Limitations
 *
 * 1. **pnpm v6.1 Support**: The parser uses lockparse v0.5.0, which doesn't properly parse
 *    pnpm v6.1 format. Tests use v9.0 format which is fully supported.
 */
describe('E2E: Transitive dependency detection (pnpm)', () => {
  it('parser correctly reads the fixture lockfiles and detects dependency changes', async () => {
    // Arrange: Read fixture files
    const beforeContent = readFileSync(join(fixturesDir, 'before-pnpm-lock.yaml'), 'utf-8');
    const afterContent = readFileSync(join(fixturesDir, 'after-pnpm-lock.yaml'), 'utf-8');

    // Act: Parse both lockfiles
    const beforeSnapshot = await parsePnpmLockfile(beforeContent);
    const afterSnapshot = await parsePnpmLockfile(afterContent);

    // Debug output
    console.log('Before snapshot:', Array.from(beforeSnapshot.entries()));
    console.log('After snapshot:', Array.from(afterSnapshot.entries()));

    // Assert: Verify parser reads the lockfiles correctly
    expect(beforeSnapshot.size).toBeGreaterThan(0);
    expect(beforeSnapshot.has('lodash')).toBe(true);
    expect(beforeSnapshot.get('lodash')).toBe('4.17.21');

    expect(afterSnapshot.size).toBeGreaterThan(0);
    expect(afterSnapshot.has('lodash')).toBe(true);
    expect(afterSnapshot.get('lodash')).toBe('4.17.22');

    // Verify that lodash changed
    expect(beforeSnapshot.get('lodash')).not.toBe(afterSnapshot.get('lodash'));
  });

  it('detects transitive dependencies when workspace package depends on another workspace package', async () => {
    // Arrange
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

    // Act
    const result = await runAffectedCommand(options);
    console.log('CLI result:', result);

    // Assert: Both pkg-base (direct) and pkg-middle (transitive) should be affected
    const affected = JSON.parse(result);
    expect(affected).toContain('pkg-base');
    expect(affected).toContain('pkg-middle');
  });

  it('respects dependency type filtering for transitive dependencies', async () => {
    // Arrange
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
      dev: false,
      peer: false,
      optional: false,
    };

    // Act
    const result = await runAffectedCommand(options);

    // Assert: Production dependencies should still detect transitive packages
    const affected = JSON.parse(result);
    expect(affected).toContain('pkg-base');
    expect(affected).toContain('pkg-middle');
  });
});
