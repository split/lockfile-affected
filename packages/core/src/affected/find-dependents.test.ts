import { describe, expect, it } from 'vitest';
import { allDependencyTypes, type WorkspaceGraph } from '../types/lockfile.js';
import { findDependents } from './find-dependents.js';

const pkgWith = (
  deps: Partial<{
    dependencies: string[];
    devDependencies: string[];
    peerDependencies: string[];
    optionalDependencies: string[];
  }>,
) => ({
  dependencies: new Set(deps.dependencies ?? []),
  devDependencies: new Set(deps.devDependencies ?? []),
  peerDependencies: new Set(deps.peerDependencies ?? []),
  optionalDependencies: new Set(deps.optionalDependencies ?? []),
});

describe('findDependents', () => {
  it('returns empty set when no packages depend on the given package', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ dependencies: ['lodash'] }) }],
      ['utils', { name: 'utils', dependencyGroups: pkgWith({ dependencies: ['react'] }) }],
    ]);

    const dependents = findDependents('express', workspace);

    expect(dependents.size).toBe(0);
  });

  it('finds packages that depend on a given package', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ dependencies: ['core'] }) }],
      ['cli', { name: 'cli', dependencyGroups: pkgWith({ dependencies: ['core'] }) }],
      ['utils', { name: 'utils', dependencyGroups: pkgWith({ dependencies: ['react'] }) }],
    ]);

    const dependents = findDependents('core', workspace);

    expect(dependents.size).toBe(2);
    expect(dependents.has('app')).toBe(true);
    expect(dependents.has('cli')).toBe(true);
    expect(dependents.has('utils')).toBe(false);
  });

  it('finds packages that devDependend on a given package when devDeps enabled', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ devDependencies: ['vitest'] }) }],
      ['lib', { name: 'lib', dependencyGroups: pkgWith({ dependencies: ['vitest'] }) }],
    ]);

    const dependents = findDependents('vitest', workspace, allDependencyTypes);

    expect(dependents.size).toBe(2);
    expect(dependents.has('app')).toBe(true);
    expect(dependents.has('lib')).toBe(true);
  });

  it('does not find packages with devDependencies when devDeps excluded from filter', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ devDependencies: ['vitest'] }) }],
      ['lib', { name: 'lib', dependencyGroups: pkgWith({ dependencies: ['vitest'] }) }],
    ]);

    const dependents = findDependents('vitest', workspace, { dependencies: true });

    expect(dependents.size).toBe(1);
    expect(dependents.has('lib')).toBe(true);
    expect(dependents.has('app')).toBe(false);
  });

  it('respects all dependency types in filter', () => {
    const workspace: WorkspaceGraph = new Map([
      [
        'app',
        {
          name: 'app',
          dependencyGroups: pkgWith({
            dependencies: ['core'],
            devDependencies: ['test-util'],
            peerDependencies: ['react'],
            optionalDependencies: ['optional-pkg'],
          }),
        },
      ],
    ]);

    const prodOnly = findDependents('core', workspace, { dependencies: true });
    const devOnly = findDependents('test-util', workspace, { devDependencies: true });
    const peerOnly = findDependents('react', workspace, { peerDependencies: true });
    const optOnly = findDependents('optional-pkg', workspace, { optionalDependencies: true });

    expect(prodOnly.size).toBe(1);
    expect(devOnly.size).toBe(1);
    expect(peerOnly.size).toBe(1);
    expect(optOnly.size).toBe(1);
  });

  it('default filter only includes regular dependencies', () => {
    const workspace: WorkspaceGraph = new Map([
      [
        'app',
        {
          name: 'app',
          dependencyGroups: pkgWith({
            dependencies: ['core'],
            devDependencies: ['test-util'],
          }),
        },
      ],
    ]);

    const dependents = findDependents('core', workspace);

    expect(dependents.size).toBe(1);
    expect(dependents.has('app')).toBe(true);

    const devDependents = findDependents('test-util', workspace);

    expect(devDependents.size).toBe(0);
  });
});
