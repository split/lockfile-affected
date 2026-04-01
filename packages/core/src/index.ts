export type {
  DependencyFilter,
  DependencyGroups,
  LockfileDiff,
  LockfileParser,
  LockfileSnapshot,
  WorkspaceGraph,
  WorkspacePackage,
} from './types/lockfile.js';
export { allDependencyTypes, allDependencyTypesEnabled } from './types/lockfile.js';
export { diffLockfileSnapshots } from './diff/diff-lockfile-snapshots.js';
export { resolveAffectedPackages } from './affected/resolve-affected-packages.js';
export { findAffectedPackages } from './affected/find-affected-packages.js';
export type { FindAffectedOptions } from './affected/find-affected-packages.js';
export { sortTopologically } from './affected/topological-sort.js';
export { buildWorkspaceGraph } from './workspace/build-workspace-graph.js';
export type { PackageManifest } from './workspace/build-workspace-graph.js';
export { loadWorkspaceManifests } from './workspace/load-workspace-manifests.js';
export { detectLockfile } from './lockfile/detect-lockfile.js';
export type { DetectedLockfile } from './lockfile/detect-lockfile.js';
