import type {
  DependencyFilter,
  DependencyGroups,
  LockfileDiff,
  WorkspaceGraph,
} from '../types/lockfile.js';

/**
 * Resolves which workspace packages are affected by lockfile changes.
 *
 * A package is considered affected if any dependency — within the groups
 * selected by `filter` — appears in the lockfile diff (added, removed, or changed).
 *
 * Pure function: no side effects.
 */
export function resolveAffectedPackages(
  diff: LockfileDiff,
  workspace: WorkspaceGraph,
  filter: DependencyFilter,
): ReadonlySet<string> {
  const changedNames = collectChangedDependencyNames(diff);

  if (changedNames.size === 0) {
    return new Set();
  }

  const affected = new Set<string>();

  for (const [packageName, pkg] of workspace) {
    if (isAffected(pkg.dependencyGroups, changedNames, filter)) {
      affected.add(packageName);
    }
  }

  return affected;
}

function collectChangedDependencyNames(diff: LockfileDiff): ReadonlySet<string> {
  const names = new Set<string>();
  for (const name of diff.added.keys()) names.add(name);
  for (const name of diff.removed.keys()) names.add(name);
  for (const name of diff.changed.keys()) names.add(name);
  return names;
}

function isAffected(
  groups: DependencyGroups,
  changedNames: ReadonlySet<string>,
  filter: DependencyFilter,
): boolean {
  if (filter.dependencies && hasOverlap(groups.dependencies, changedNames)) return true;
  if (filter.devDependencies && hasOverlap(groups.devDependencies, changedNames)) return true;
  if (filter.peerDependencies && hasOverlap(groups.peerDependencies, changedNames)) return true;
  if (filter.optionalDependencies && hasOverlap(groups.optionalDependencies, changedNames))
    return true;
  return false;
}

function hasOverlap(deps: ReadonlySet<string>, changedNames: ReadonlySet<string>): boolean {
  for (const dep of deps) {
    if (changedNames.has(dep)) return true;
  }
  return false;
}
