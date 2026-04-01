import { describe, expect, it } from 'vitest';
import { toDependencyFilter } from './to-dependency-filter.js';
import type { CliOptions } from './cli-options.types.js';

const base: CliOptions = {
  lockfileBefore: 'before.lock',
  lockfileAfter: 'after.lock',
  workspaceRoot: '/repo',
  output: 'lines',
  format: 'pnpm',
  deps: false,
  dev: false,
  peer: false,
  optional: false,
  rootDepsAffectAll: false,
};

describe('toDependencyFilter', () => {
  it('returns all false when no flags are set', () => {
    const filter = toDependencyFilter(base);

    expect(filter.dependencies).toBe(false);
    expect(filter.devDependencies).toBe(false);
    expect(filter.peerDependencies).toBe(false);
    expect(filter.optionalDependencies).toBe(false);
  });

  it('returns only deps when only --deps is set', () => {
    const filter = toDependencyFilter({ ...base, deps: true });

    expect(filter.dependencies).toBe(true);
    expect(filter.devDependencies).toBeFalsy();
    expect(filter.peerDependencies).toBeFalsy();
    expect(filter.optionalDependencies).toBeFalsy();
  });

  it('returns only dev when only --dev is set', () => {
    const filter = toDependencyFilter({ ...base, dev: true });

    expect(filter.devDependencies).toBe(true);
    expect(filter.dependencies).toBeFalsy();
  });

  it('returns a combination when multiple flags are set', () => {
    const filter = toDependencyFilter({ ...base, deps: true, peer: true });

    expect(filter.dependencies).toBe(true);
    expect(filter.peerDependencies).toBe(true);
    expect(filter.devDependencies).toBeFalsy();
    expect(filter.optionalDependencies).toBeFalsy();
  });
});
