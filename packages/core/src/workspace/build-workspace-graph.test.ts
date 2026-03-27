import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraph } from './build-workspace-graph.js';

describe('buildWorkspaceGraph', () => {
  it('builds a graph from package.json manifests', () => {
    const manifests = [
      {
        name: 'app',
        dependencies: { lodash: '^4.0.0' },
        devDependencies: { vitest: '^3.0.0' },
      },
      {
        name: 'utils',
        dependencies: { 'date-fns': '^3.0.0' },
        peerDependencies: { react: '>=17' },
      },
    ];

    const graph = buildWorkspaceGraph(manifests);

    expect(graph.size).toBe(2);

    const app = graph.get('app');
    expect(app?.dependencyGroups.dependencies.has('lodash')).toBe(true);
    expect(app?.dependencyGroups.devDependencies.has('vitest')).toBe(true);
    expect(app?.dependencyGroups.dependencies.has('vitest')).toBe(false);

    const utils = graph.get('utils');
    expect(utils?.dependencyGroups.dependencies.has('date-fns')).toBe(true);
    expect(utils?.dependencyGroups.peerDependencies.has('react')).toBe(true);
  });

  it('handles packages with no dependencies', () => {
    const manifests = [{ name: 'empty-pkg' }];

    const graph = buildWorkspaceGraph(manifests);

    const pkg = graph.get('empty-pkg');
    expect(pkg).toBeDefined();
    expect(pkg?.dependencyGroups.dependencies.size).toBe(0);
    expect(pkg?.dependencyGroups.devDependencies.size).toBe(0);
    expect(pkg?.dependencyGroups.peerDependencies.size).toBe(0);
    expect(pkg?.dependencyGroups.optionalDependencies.size).toBe(0);
  });

  it('skips manifests without a name', () => {
    const manifests = [
      { dependencies: { lodash: '4.0.0' } },
      { name: 'valid-pkg', dependencies: { react: '18.0.0' } },
    ];

    const graph = buildWorkspaceGraph(manifests);

    expect(graph.size).toBe(1);
    expect(graph.has('valid-pkg')).toBe(true);
  });

  it('keeps each dependency type in its own group', () => {
    const manifests = [
      {
        name: 'full-pkg',
        dependencies: { a: '1.0.0' },
        devDependencies: { b: '2.0.0' },
        peerDependencies: { c: '3.0.0' },
        optionalDependencies: { d: '4.0.0' },
      },
    ];

    const graph = buildWorkspaceGraph(manifests);

    const pkg = graph.get('full-pkg');
    expect(pkg?.dependencyGroups.dependencies.has('a')).toBe(true);
    expect(pkg?.dependencyGroups.devDependencies.has('b')).toBe(true);
    expect(pkg?.dependencyGroups.peerDependencies.has('c')).toBe(true);
    expect(pkg?.dependencyGroups.optionalDependencies.has('d')).toBe(true);

    // No cross-contamination between groups
    expect(pkg?.dependencyGroups.dependencies.has('b')).toBe(false);
    expect(pkg?.dependencyGroups.devDependencies.has('a')).toBe(false);
  });
});
