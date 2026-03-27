import { ALL_DEPENDENCY_TYPES, type DependencyFilter } from '@lockfile-affected/core';
import type { CliOptions } from './cli-options.types.js';

/**
 * Derives a DependencyFilter from CLI options.
 * When no dep type flags are set, falls back to including all types.
 */
export function toDependencyFilter(options: CliOptions): DependencyFilter {
  const anyExplicit = options.deps || options.dev || options.peer || options.optional;

  if (!anyExplicit) {
    return ALL_DEPENDENCY_TYPES;
  }

  return {
    dependencies: options.deps,
    devDependencies: options.dev,
    peerDependencies: options.peer,
    optionalDependencies: options.optional,
  };
}
