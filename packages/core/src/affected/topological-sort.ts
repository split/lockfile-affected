import type { WorkspaceGraph } from '../types/lockfile.js';

export function sortTopologically(packages: ReadonlySet<string>, graph: WorkspaceGraph): string[] {
  const affected = Array.from(packages);
  if (affected.length <= 1) return affected;

  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const pkg of affected) {
    inDegree.set(pkg, 0);
    adjacency.set(pkg, []);
  }

  for (const pkg of affected) {
    const pkgInfo = graph.get(pkg);
    if (!pkgInfo) continue;

    const deps = [
      ...pkgInfo.dependencyGroups.dependencies,
      ...pkgInfo.dependencyGroups.devDependencies,
    ];

    for (const dep of deps) {
      if (affected.includes(dep)) {
        adjacency.get(dep)!.push(pkg);
        inDegree.set(pkg, (inDegree.get(pkg) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [pkg, degree] of inDegree) {
    if (degree === 0) queue.push(pkg);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const dependent of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  const remaining = inDegree.size - result.length;
  if (remaining > 0) {
    for (const pkg of affected) {
      if (!result.includes(pkg)) result.push(pkg);
    }
  }

  return result;
}
