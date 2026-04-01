import { describe, expect, it } from 'vitest';
import type { WorkspaceGraph } from '../types/lockfile.js';
import { sortTopologically } from './topological-sort.js';

const pkgWith = (
  deps: Partial<{
    dependencies: string[];
    devDependencies: string[];
    peerDependencies: string[];
    optionalDependencies: string[];
  }>,
) => ({
  name: 'test',
  dependencyGroups: {
    dependencies: new Set(deps.dependencies ?? []),
    devDependencies: new Set(deps.devDependencies ?? []),
    peerDependencies: new Set(deps.peerDependencies ?? []),
    optionalDependencies: new Set(deps.optionalDependencies ?? []),
  },
});

describe('sortTopologically', () => {
  it('returns empty array for empty set', () => {
    const graph: WorkspaceGraph = new Map();
    const result = sortTopologically(new Set(), graph);
    expect(result).toEqual([]);
  });

  it('returns single package as array', () => {
    const graph: WorkspaceGraph = new Map([['app', pkgWith({})]]);
    const result = sortTopologically(new Set(['app']), graph);
    expect(result).toEqual(['app']);
  });

  it('returns alphabetical order when no dependencies between affected', () => {
    const graph: WorkspaceGraph = new Map([
      ['app', pkgWith({})],
      ['utils', pkgWith({})],
    ]);
    const result = sortTopologically(new Set(['app', 'utils']), graph);
    expect(result).toEqual(['app', 'utils']);
  });

  it('returns packages in forward topological order', () => {
    const graph: WorkspaceGraph = new Map([
      ['app', pkgWith({ dependencies: ['utils'] })],
      ['utils', pkgWith({})],
    ]);
    const result = sortTopologically(new Set(['app', 'utils']), graph);
    expect(result).toEqual(['utils', 'app']);
  });

  it('handles deep dependency chain', () => {
    const graph: WorkspaceGraph = new Map([
      ['app', pkgWith({ dependencies: ['lib'] })],
      ['lib', pkgWith({ dependencies: ['core'] })],
      ['core', pkgWith({})],
    ]);
    const result = sortTopologically(new Set(['app', 'lib', 'core']), graph);
    expect(result).toEqual(['core', 'lib', 'app']);
  });

  it('handles diamond dependency pattern', () => {
    const graph: WorkspaceGraph = new Map([
      ['app', pkgWith({ dependencies: ['lib-a', 'lib-b'] })],
      ['lib-a', pkgWith({ dependencies: ['core'] })],
      ['lib-b', pkgWith({ dependencies: ['core'] })],
      ['core', pkgWith({})],
    ]);
    const result = sortTopologically(new Set(['app', 'lib-a', 'lib-b', 'core']), graph);
    expect(result).toEqual(['core', 'lib-a', 'lib-b', 'app']);
  });

  it('considers devDependencies in topological sort', () => {
    const graph: WorkspaceGraph = new Map([
      ['app', pkgWith({ devDependencies: ['utils'] })],
      ['utils', pkgWith({})],
    ]);
    const result = sortTopologically(new Set(['app', 'utils']), graph);
    expect(result).toEqual(['utils', 'app']);
  });

  it('handles packages not in graph (external dependencies)', () => {
    const graph: WorkspaceGraph = new Map([
      ['app', pkgWith({ dependencies: ['external-pkg'] })],
      ['utils', pkgWith({})],
    ]);
    const result = sortTopologically(new Set(['app', 'utils']), graph);
    expect(result).toHaveLength(2);
    expect(result).toContain('app');
    expect(result).toContain('utils');
  });

  it('handles partial graph (subset of workspace)', () => {
    const graph: WorkspaceGraph = new Map([
      ['app', pkgWith({ dependencies: ['core'] })],
      ['cli', pkgWith({ dependencies: ['core'] })],
      ['core', pkgWith({})],
      ['unused', pkgWith({})],
    ]);
    const result = sortTopologically(new Set(['app', 'cli', 'core']), graph);
    expect(result).toEqual(['core', 'app', 'cli']);
  });
});
