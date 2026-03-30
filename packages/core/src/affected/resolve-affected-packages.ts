import type {
  DependencyFilter,
  DependencyGroups,
  LockfileDiff,
  WorkspaceGraph,
} from '../types/lockfile.js';
import { findDependents } from './find-dependents.js';

/**
 * Resolves which workspace packages are affected by lockfile changes.
 *
 * A package is considered affected if any dependency — within the groups
 * selected by `filter` — appears in the lockfile diff (added, removed, or changed).
 *
 * This includes transitive dependencies: if pkg-a depends on pkg-b, and pkg-b depends
 * on a changed external package, both pkg-a and pkg-b are marked as affected.
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

  // Step 1: Find workspace packages that appear in the lockfile diff
  // (these are workspace packages whose version changed in the lockfile)
  const directlyAffected = new Set<string>();
  for (const [packageName] of workspace) {
    if (changedNames.has(packageName)) {
      directlyAffected.add(packageName);
    }
  }

  // Step 2: Find packages that directly depend on changed external packages
  for (const [packageName, pkg] of workspace) {
    if (isAffected(pkg.dependencyGroups, changedNames, filter)) {
      directlyAffected.add(packageName);
    }
  }

  // Step 3: Find all transitive dependents of the directly affected packages
  // This traverses the workspace graph to find the full chain of affected packages
  const allAffected = new Set<string>(directlyAffected);
  const toProcess = Array.from(directlyAffected);

  while (toProcess.length > 0) {
    const current = toProcess.pop()!;
    const transitiveDependents = findDependents(current, workspace, filter);

    for (const dependent of transitiveDependents) {
      if (!allAffected.has(dependent)) {
        allAffected.add(dependent);
        toProcess.push(dependent);
      }
    }
  }

  return allAffected;
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
