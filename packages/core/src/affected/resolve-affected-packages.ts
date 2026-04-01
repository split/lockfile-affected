import type {
  DependencyFilter,
  DependencyGroups,
  LockfileDiff,
  WorkspaceGraph,
} from '../types/lockfile.js';
import { findDependents } from './find-dependents.js';
import { allDependencyTypes } from '../types/lockfile.js';

export function resolveAffectedPackages(
  diff: LockfileDiff,
  workspace: WorkspaceGraph,
  filter: DependencyFilter,
  options?: {
    readonly rootDepsAffectAll?: boolean;
    readonly rootContext?: boolean;
  },
): ReadonlySet<string> {
  const changedNames = collectChangedDependencyNames(diff);

  if (changedNames.size === 0) {
    return new Set();
  }

  if (options?.rootDepsAffectAll && isEmptyFilter(filter)) {
    return new Set();
  }

  const directlyAffected = new Set<string>();

  for (const [packageName] of workspace) {
    if (changedNames.has(packageName)) {
      directlyAffected.add(packageName);
    }
  }

  for (const [packageName, pkg] of workspace) {
    if (isAffected(pkg.dependencyGroups, changedNames, filter)) {
      directlyAffected.add(packageName);
    }
  }

  if (options?.rootDepsAffectAll && options?.rootContext) {
    const rootChanged = hasRootChanged(diff);
    if (rootChanged && hasFilterOverlap(filter)) {
      const rootChangedNames = getRootChangedNames(diff);
      for (const [packageName, pkg] of workspace) {
        for (const depType of allDependencyTypes) {
          if (!filter[depType]) continue;
          if (hasOverlap(pkg.dependencyGroups[depType], rootChangedNames)) {
            directlyAffected.add(packageName);
            break;
          }
        }
      }
    }
  }

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

  for (const [, contextDiff] of diff.changed) {
    for (const name of contextDiff.added.keys()) names.add(name);
    for (const name of contextDiff.removed.keys()) names.add(name);
    for (const name of contextDiff.changed.keys()) names.add(name);
  }

  for (const [, packages] of diff.addedContexts) {
    for (const name of packages.keys()) names.add(name);
  }

  for (const [, packages] of diff.removedContexts) {
    for (const name of packages.keys()) names.add(name);
  }

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

function hasRootChanged(diff: LockfileDiff): boolean {
  if (diff.changed.has('.')) return true;
  if (diff.addedContexts.has('.')) return true;
  if (diff.removedContexts.has('.')) return true;
  return false;
}

function hasFilterOverlap(filter: DependencyFilter): boolean {
  return Boolean(
    filter.dependencies ||
    filter.devDependencies ||
    filter.peerDependencies ||
    filter.optionalDependencies,
  );
}

function isEmptyFilter(filter: DependencyFilter): boolean {
  return (
    !filter.dependencies &&
    !filter.devDependencies &&
    !filter.peerDependencies &&
    !filter.optionalDependencies
  );
}

function getRootChangedNames(diff: LockfileDiff): ReadonlySet<string> {
  const names = new Set<string>();

  const rootDiff = diff.changed.get('.');
  if (rootDiff) {
    for (const name of rootDiff.added.keys()) names.add(name);
    for (const name of rootDiff.removed.keys()) names.add(name);
    for (const name of rootDiff.changed.keys()) names.add(name);
  }

  const rootAdded = diff.addedContexts.get('.');
  if (rootAdded) {
    for (const name of rootAdded.keys()) names.add(name);
  }

  const rootRemoved = diff.removedContexts.get('.');
  if (rootRemoved) {
    for (const name of rootRemoved.keys()) names.add(name);
  }

  return names;
}
