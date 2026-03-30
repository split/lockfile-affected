import type { DependencyFilter, DependencyGroups, WorkspaceGraph } from '../types/lockfile.js';

/**
 * Finds all workspace packages that depend on the given package.
 *
 * This is useful for determining which packages should be released when
 * a workspace dependency is released (e.g., when @lockfile-affected/core
 * is released, we want to also release @lockfile-affected/cli which depends on it).
 *
 * Pure function: no side effects.
 */
export function findDependents(
  packageName: string,
  workspace: WorkspaceGraph,
  filter: DependencyFilter = {
    dependencies: true,
    devDependencies: false,
    peerDependencies: false,
    optionalDependencies: false,
  },
): ReadonlySet<string> {
  const dependents = new Set<string>();

  for (const [pkgName, pkg] of workspace) {
    if (dependsOn(pkg.dependencyGroups, packageName, filter)) {
      dependents.add(pkgName);
    }
  }

  return dependents;
}

function dependsOn(
  groups: DependencyGroups,
  packageName: string,
  filter: DependencyFilter,
): boolean {
  if (filter.dependencies && groups.dependencies.has(packageName)) return true;
  if (filter.devDependencies && groups.devDependencies.has(packageName)) return true;
  if (filter.peerDependencies && groups.peerDependencies.has(packageName)) return true;
  if (filter.optionalDependencies && groups.optionalDependencies.has(packageName)) return true;
  return false;
}
