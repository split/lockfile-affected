import { detectLockfile, findAffectedPackages } from '@lockfile-affected/core';
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
 * 1. Detect or resolve the lockfile parser
 * 2. Read both lockfile snapshots
 * 3. Delegate to findAffectedPackages (core)
 * 4. Format and return output
 */
export async function runAffectedCommand(options: CliOptions): Promise<string> {
  const format =
    options.format ?? (await detectLockfile(options.workspaceRoot, lockfileParsers)).format;

  if (!isSupportedFormat(format)) {
    throw new Error(`No parser registered for format: ${format}`);
  }

  const parser = lockfileParsersByFormat[format];

  const [beforeContent, afterContent] = await Promise.all([
    readLockfileContent(options.lockfileBefore),
    readLockfileContent(options.lockfileAfter),
  ]);

  const filter = toDependencyFilter(options);
  const hasFilter =
    filter.dependencies ||
    filter.devDependencies ||
    filter.peerDependencies ||
    filter.optionalDependencies;
  const findOptions = {
    beforeContent,
    afterContent,
    parser,
    workspaceRoot: options.workspaceRoot,
    ...(hasFilter && { filter }),
    ...(options.rootDepsAffectAll && { rootDepsAffectAll: true }),
  };
  const affected = await findAffectedPackages(findOptions);

  const sortedAffected = Array.from(affected).sort();
  return formatAffectedOutput(sortedAffected, options.output);
}
