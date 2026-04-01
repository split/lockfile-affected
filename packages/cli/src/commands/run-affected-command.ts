import {
  buildWorkspaceGraph,
  detectLockfile,
  findAffectedPackages,
  loadWorkspaceManifests,
  sortTopologically,
} from '@lockfile-affected/core';
import {
  isSupportedFormat,
  lockfileParsers,
  lockfileParsersByFormat,
} from '../lockfile/parsers.js';
import type { CliOptions } from '../options/cli-options.types.js';
import { toDependencyFilter } from '../options/to-dependency-filter.js';
import { formatAffectedOutput } from '../output/format-affected-output.js';
import { readLockfileContent } from './read-lockfile-content.js';

/**
 * Runs the full affected-packages resolution pipeline:
 * 1. Read both lockfiles
 * 2. Detect format from content (or use --format flag)
 * 3. Parse lockfile content into snapshots
 * 4. Build workspace graph from manifests
 * 5. Resolve affected packages
 * 6. Format output
 */
export async function runAffectedCommand(options: CliOptions): Promise<string> {
  const [beforeContent, afterContent] = await Promise.all([
    readLockfileContent(options.lockfileBefore),
    readLockfileContent(options.lockfileAfter),
  ]);

  const format = options.format ?? detectLockfile(beforeContent, lockfileParsers);

  if (!isSupportedFormat(format)) {
    throw new Error(`No parser registered for format: ${format}`);
  }

  const parser = lockfileParsersByFormat[format];

  const [snapshotBefore, snapshotAfter, manifests] = await Promise.all([
    parser.parse(beforeContent),
    parser.parse(afterContent),
    loadWorkspaceManifests(options.workspaceRoot),
  ]);

  const filter = toDependencyFilter(options);
  const affected = findAffectedPackages({
    snapshotBefore,
    snapshotAfter,
    manifests,
    ...((filter.dependencies ||
      filter.devDependencies ||
      filter.peerDependencies ||
      filter.optionalDependencies) && { filter }),
    ...(options.rootDepsAffectAll && { rootDepsAffectAll: true }),
  });

  const sortedAffected =
    options.order === 'topological'
      ? sortTopologically(affected, buildWorkspaceGraph(manifests))
      : Array.from(affected).sort();
  return formatAffectedOutput(sortedAffected, options.output);
}
