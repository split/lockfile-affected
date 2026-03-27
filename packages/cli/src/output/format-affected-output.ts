import type { OutputFormat } from '../options/cli-options.types.js';

/**
 * Formats the list of affected package names for CLI output.
 * Pure function: no side effects.
 */
export function formatAffectedOutput(
  affectedPackages: readonly string[],
  format: OutputFormat,
): string {
  if (format === 'json') {
    return JSON.stringify(affectedPackages);
  }

  return affectedPackages.join('\n');
}
