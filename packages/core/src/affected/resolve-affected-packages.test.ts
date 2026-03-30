import { describe, expect, it } from 'vitest';
import { ALL_DEPENDENCY_TYPES, type LockfileDiff, type WorkspaceGraph } from '../types/lockfile.js';
import { resolveAffectedPackages } from './resolve-affected-packages.js';

const emptyDiff: LockfileDiff = {
  added: new Map(),
  removed: new Map(),
  changed: new Map(),
};

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

describe('resolveAffectedPackages', () => {
  it('returns empty set when there are no lockfile changes', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ dependencies: ['lodash'] }) }],
    ]);

    const affected = resolveAffectedPackages(emptyDiff, workspace, ALL_DEPENDENCY_TYPES);

    expect(affected.size).toBe(0);
  });

  it('marks a package affected when one of its deps changed', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ dependencies: ['lodash'] }) }],
      ['utils', { name: 'utils', dependencyGroups: pkgWith({ dependencies: ['react'] }) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['lodash', { from: '4.17.20', to: '4.17.21' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    expect(affected.size).toBe(1);
    expect(affected.has('app')).toBe(true);
    expect(affected.has('utils')).toBe(false);
  });

  it('marks a package affected when one of its devDeps changed', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ devDependencies: ['vitest'] }) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['vitest', { from: '3.0.0', to: '3.1.0' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    expect(affected.has('app')).toBe(true);
  });

  it('does not mark a package affected when devDeps changed but devDependencies excluded from filter', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ devDependencies: ['vitest'] }) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['vitest', { from: '3.0.0', to: '3.1.0' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, { dependencies: true });

    expect(affected.size).toBe(0);
  });

  it('only considers the dep types included in the filter', () => {
    const workspace: WorkspaceGraph = new Map([
      [
        'app',
        {
          name: 'app',
          dependencyGroups: pkgWith({ dependencies: ['lodash'], devDependencies: ['vitest'] }),
        },
      ],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([
        ['lodash', { from: '4.0.0', to: '4.1.0' }],
        ['vitest', { from: '3.0.0', to: '3.1.0' }],
      ]),
    };

    const prodOnly = resolveAffectedPackages(diff, workspace, { dependencies: true });
    const devOnly = resolveAffectedPackages(diff, workspace, { devDependencies: true });

    // Both filters mark app as affected, but for different reasons
    expect(prodOnly.has('app')).toBe(true);
    expect(devOnly.has('app')).toBe(true);
  });

  it('handles added and removed deps', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ dependencies: ['new-pkg', 'old-pkg'] }) }],
    ]);
    const diff: LockfileDiff = {
      added: new Map([['new-pkg', '1.0.0']]),
      removed: new Map([['old-pkg', '1.0.0']]),
      changed: new Map(),
    };

    const affected = resolveAffectedPackages(diff, workspace, { dependencies: true });

    expect(affected.has('app')).toBe(true);
  });

  it('marks multiple packages affected when a shared dep changes', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app-a', { name: 'app-a', dependencyGroups: pkgWith({ dependencies: ['lodash'] }) }],
      [
        'app-b',
        { name: 'app-b', dependencyGroups: pkgWith({ dependencies: ['lodash', 'react'] }) },
      ],
      ['app-c', { name: 'app-c', dependencyGroups: pkgWith({ dependencies: ['react'] }) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['lodash', { from: '4.17.20', to: '4.17.21' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    expect(affected.size).toBe(2);
    expect(affected.has('app-a')).toBe(true);
    expect(affected.has('app-b')).toBe(true);
    expect(affected.has('app-c')).toBe(false);
  });

  it('handles packages with empty dependency groups', () => {
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({}) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['lodash', { from: '4.0.0', to: '4.1.0' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    expect(affected.size).toBe(0);
  });

  it('marks transitive dependents as affected (pkg-b → pkg-a → lodash)', () => {
    // Workspace structure:
    // - pkg-top depends on pkg-middle
    // - pkg-middle depends on pkg-base
    // - pkg-base depends on lodash (external)
    // When lodash changes, ALL packages should be affected
    const workspace: WorkspaceGraph = new Map([
      ['pkg-top', { name: 'pkg-top', dependencyGroups: pkgWith({ dependencies: ['pkg-middle'] }) }],
      [
        'pkg-middle',
        { name: 'pkg-middle', dependencyGroups: pkgWith({ dependencies: ['pkg-base'] }) },
      ],
      ['pkg-base', { name: 'pkg-base', dependencyGroups: pkgWith({ dependencies: ['lodash'] }) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['lodash', { from: '4.17.21', to: '4.17.22' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    // All three packages should be affected due to transitive chain
    expect(affected.size).toBe(3);
    expect(affected.has('pkg-base')).toBe(true); // direct dependency on lodash
    expect(affected.has('pkg-middle')).toBe(true); // transitive via pkg-base
    expect(affected.has('pkg-top')).toBe(true); // transitive via pkg-middle
  });

  it('marks transitive dependents with devDependencies', () => {
    // Workspace structure:
    // - pkg-b depends on pkg-a (devDependency)
    // - pkg-a depends on vitest
    const workspace: WorkspaceGraph = new Map([
      ['pkg-b', { name: 'pkg-b', dependencyGroups: pkgWith({ devDependencies: ['pkg-a'] }) }],
      ['pkg-a', { name: 'pkg-a', dependencyGroups: pkgWith({ devDependencies: ['vitest'] }) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['vitest', { from: '2.0.0', to: '2.1.0' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    // Both should be affected due to transitive chain
    expect(affected.has('pkg-a')).toBe(true);
    expect(affected.has('pkg-b')).toBe(true);
  });

  it('respects filter when traversing transitive dependencies', () => {
    // Workspace: pkg-b → pkg-a → vitest (devDep)
    const workspace: WorkspaceGraph = new Map([
      ['pkg-b', { name: 'pkg-b', dependencyGroups: pkgWith({ dependencies: ['pkg-a'] }) }],
      ['pkg-a', { name: 'pkg-a', dependencyGroups: pkgWith({ devDependencies: ['vitest'] }) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['vitest', { from: '2.0.0', to: '2.1.0' }]]),
    };

    // Only check production dependencies - should NOT include vitest changes
    const affected = resolveAffectedPackages(diff, workspace, { dependencies: true });

    // pkg-a has vitest in devDependencies (not prod), so not directly affected
    // pkg-b depends on pkg-a (prod), but pkg-a is not affected
    expect(affected.size).toBe(0);
  });

  it('handles diamond dependency graph', () => {
    // Workspace structure (diamond):
    //       app
    //      /   \
    //   lib-a   lib-b
    //      \   /
    //      lib-c
    // When lib-c changes, app, lib-a, and lib-b should all be affected
    const workspace: WorkspaceGraph = new Map([
      ['app', { name: 'app', dependencyGroups: pkgWith({ dependencies: ['lib-a', 'lib-b'] }) }],
      ['lib-a', { name: 'lib-a', dependencyGroups: pkgWith({ dependencies: ['lib-c'] }) }],
      ['lib-b', { name: 'lib-b', dependencyGroups: pkgWith({ dependencies: ['lib-c'] }) }],
      ['lib-c', { name: 'lib-c', dependencyGroups: pkgWith({}) }],
    ]);
    const diff: LockfileDiff = {
      ...emptyDiff,
      changed: new Map([['lib-c', { from: '1.0.0', to: '1.1.0' }]]),
    };

    const affected = resolveAffectedPackages(diff, workspace, ALL_DEPENDENCY_TYPES);

    // All packages that depend on lib-c should be affected
    expect(affected.has('lib-c')).toBe(true);
    expect(affected.has('lib-a')).toBe(true);
    expect(affected.has('lib-b')).toBe(true);
    expect(affected.has('app')).toBe(true);
    expect(affected.size).toBe(4);
  });
});
