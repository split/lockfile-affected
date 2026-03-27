import {
  ALL_DEPENDENCY_TYPES,
  type DependencyFilter,
  type LockfileParser,
} from '../types/lockfile.js';
import { diffLockfileSnapshots } from '../diff/diff-lockfile-snapshots.js';
import { resolveAffectedPackages } from './resolve-affected-packages.js';
import { buildWorkspaceGraph } from '../workspace/build-workspace-graph.js';
import { loadWorkspaceManifests } from '../workspace/load-workspace-manifests.js';

export type FindAffectedOptions = {
  /** Raw content of the "before" lockfile snapshot */
  readonly beforeContent: string;
  /** Raw content of the "after" lockfile snapshot */
  readonly afterContent: string;
  /** Parser for the lockfile format */
  readonly parser: LockfileParser;
  /** Root directory to search for workspace package.json files */
  readonly workspaceRoot: string;
  /** Which dependency types to consider. When omitted, all types are included. */
  readonly filter?: DependencyFilter;
};

/**
 * High-level entry point: parses two lockfile snapshots, diffs them,
 * and returns the names of workspace packages affected by the changes.
 */
export async function findAffectedPackages(
  options: FindAffectedOptions,
): Promise<ReadonlySet<string>> {
  const [snapshotBefore, snapshotAfter, manifests] = await Promise.all([
    options.parser.parse(options.beforeContent),
    options.parser.parse(options.afterContent),
    loadWorkspaceManifests(options.workspaceRoot),
  ]);

  const diff = diffLockfileSnapshots(snapshotBefore, snapshotAfter);
  const workspaceGraph = buildWorkspaceGraph(manifests);
  return resolveAffectedPackages(diff, workspaceGraph, options.filter ?? ALL_DEPENDENCY_TYPES);
}
