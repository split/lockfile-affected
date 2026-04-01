import type { DependencyGroups, WorkspaceGraph, WorkspacePackage } from '../types/lockfile.js';

/**
 * Shape of a package.json relevant to building the workspace graph.
 */
export type PackageManifest = {
  readonly name?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly devDependencies?: Readonly<Record<string, string>>;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
};

/**
 * Builds a workspace graph from a list of package.json manifests.
 * Packages without a name field are ignored.
 * Each dependency type is kept in its own group to allow fine-grained filtering.
 */
export function buildWorkspaceGraph(manifests: readonly PackageManifest[]): WorkspaceGraph {
  const graph = new Map<string, WorkspacePackage>();

  for (const manifest of manifests) {
    if (!manifest.name) continue;

    graph.set(manifest.name, {
      name: manifest.name,
      dependencyGroups: toDependencyGroups(manifest),
    });
  }

  return graph;
}

function toDependencyGroups(manifest: PackageManifest): DependencyGroups {
  return {
    dependencies: toNameSet(manifest.dependencies),
    devDependencies: toNameSet(manifest.devDependencies),
    peerDependencies: toNameSet(manifest.peerDependencies),
    optionalDependencies: toNameSet(manifest.optionalDependencies),
  };
}

function toNameSet(deps: Readonly<Record<string, string>> | undefined): ReadonlySet<string> {
  return deps ? new Set(Object.keys(deps)) : new Set();
}
