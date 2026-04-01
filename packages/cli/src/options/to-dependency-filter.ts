import { allDependencyTypes, type DependencyFilter } from '@lockfile-affected/core';
import type { CliOptions } from './cli-options.types.js';

/**
 * Derives a DependencyFilter from CLI options.
 * When no dep type flags are set, falls back to including all types.
 */
export function toDependencyFilter(options: CliOptions): DependencyFilter {
  return {
    dependencies: options.deps,
    devDependencies: options.dev,
    peerDependencies: options.peer,
    optionalDependencies: options.optional,
  };
}

/**
 * Returns true only if the filter explicitly excludes a specific dependency type.
 * Note: This only works if the filter was created with explicit values.
 */
export function isEmptyFilter(filter: DependencyFilter): boolean {
  return (
    !filter.dependencies &&
    !filter.devDependencies &&
    !filter.peerDependencies &&
    !filter.optionalDependencies
  );
}
