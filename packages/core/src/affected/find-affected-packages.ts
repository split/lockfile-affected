import {
  allDependencyTypesEnabled,
  type DependencyFilter,
  type LockfileSnapshot,
} from '../types/lockfile.js';
import { diffLockfileSnapshots } from '../diff/diff-lockfile-snapshots.js';
import { resolveAffectedPackages } from './resolve-affected-packages.js';
import { buildWorkspaceGraph } from '../workspace/build-workspace-graph.js';
import type { PackageManifest } from '../workspace/build-workspace-graph.js';

export type FindAffectedOptions = {
  /** Parsed "before" lockfile snapshot */
  readonly snapshotBefore: LockfileSnapshot;
  /** Parsed "after" lockfile snapshot */
  readonly snapshotAfter: LockfileSnapshot;
  /** Workspace package manifests */
  readonly manifests: readonly PackageManifest[];
  /** Which dependency types to consider. When omitted, all types are included. */
  readonly filter?: DependencyFilter;
  /** When enabled, root dependency changes affect all workspace packages */
  readonly rootDepsAffectAll?: boolean;
};

/**
 * High-level entry point: diffs two lockfile snapshots and resolves
 * affected workspace packages based on the dependency graph.
 * Pure function: caller is responsible for parsing and loading manifests.
 */
export function findAffectedPackages(options: FindAffectedOptions): ReadonlySet<string> {
  const diff = diffLockfileSnapshots(options.snapshotBefore, options.snapshotAfter);
  const workspaceGraph = buildWorkspaceGraph(options.manifests);

  if (options.rootDepsAffectAll) {
    const resolveOptions = {
      rootDepsAffectAll: true,
      rootContext: diff.changed.has('.'),
    };
    return resolveAffectedPackages(
      diff,
      workspaceGraph,
      options.filter ?? allDependencyTypesEnabled,
      resolveOptions,
    );
  }

  return resolveAffectedPackages(diff, workspaceGraph, options.filter ?? allDependencyTypesEnabled);
}
