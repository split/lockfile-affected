import { detectLockfile, findAffectedPackages, type LockfileParser } from '@lockfile-affected/core';
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';
import type { CliOptions } from '../options/cli-options.types.js';
import { toDependencyFilter } from '../options/to-dependency-filter.js';
import { formatAffectedOutput } from '../output/format-affected-output.js';
import { readLockfileContent } from './read-lockfile-content.js';

const PARSERS: readonly LockfileParser[] = [
  pnpmLockfileParser,
  npmLockfileParser,
  yarnLockfileParser,
];

const PARSERS_BY_FORMAT: ReadonlyMap<string, LockfileParser> = new Map(
  PARSERS.map((p) => [p.format, p]),
);

/**
 * Runs the full affected-packages resolution pipeline:
 * 1. Detect or resolve the lockfile parser
 * 2. Read both lockfile snapshots
 * 3. Delegate to findAffectedPackages (core)
 * 4. Format and return output
 */
export async function runAffectedCommand(options: CliOptions): Promise<string> {
  const format = options.format ?? (await detectLockfile(options.workspaceRoot, PARSERS)).format;

  const parser = PARSERS_BY_FORMAT.get(format);
  if (!parser) throw new Error(`No parser registered for format: ${format}`);

  const [beforeContent, afterContent] = await Promise.all([
    readLockfileContent(options.lockfileBefore),
    readLockfileContent(options.lockfileAfter),
  ]);

  const filter = toDependencyFilter(options);
  const affected = await findAffectedPackages({
    beforeContent,
    afterContent,
    parser,
    workspaceRoot: options.workspaceRoot,
    filter,
  });

  const sortedAffected = Array.from(affected).sort();
  return formatAffectedOutput(sortedAffected, options.output);
}
