import { readdir, readFile } from 'node:fs/promises';
import { readLockfileContent } from './read-lockfile-content.js';
import { join } from 'node:path';
import {
  buildWorkspaceGraph,
  diffLockfileSnapshots,
  resolveAffectedPackages,
  type LockfileParser,
  type PackageManifest,
} from '@lockfile-affected/core';
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';
import type { CliOptions } from '../options/cli-options.types.js';
import { toDependencyFilter } from '../options/to-dependency-filter.js';
import { formatAffectedOutput } from '../output/format-affected-output.js';
import { detectLockfile } from './detect-lockfile.js';

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
 * 1. Parse both lockfile snapshots
 * 2. Diff the snapshots
 * 3. Load workspace package manifests
 * 4. Resolve which packages are affected (respecting dep type filter)
 * 5. Format and return output
 */
export async function runAffectedCommand(options: CliOptions): Promise<string> {
  const format = options.format ?? (await detectLockfile(options.workspaceRoot, PARSERS)).format;

  const parser = PARSERS_BY_FORMAT.get(format);
  if (!parser) throw new Error(`No parser registered for format: ${format}`);

  const [beforeContent, afterContent] = await Promise.all([
    readLockfileContent(options.lockfileBefore),
    readLockfileContent(options.lockfileAfter),
  ]);

  const [snapshotBefore, snapshotAfter] = await Promise.all([
    parser.parse(beforeContent),
    parser.parse(afterContent),
  ]);

  const diff = diffLockfileSnapshots(snapshotBefore, snapshotAfter);
  const manifests = await loadWorkspaceManifests(options.workspaceRoot);
  const workspaceGraph = buildWorkspaceGraph(manifests);
  const filter = toDependencyFilter(options);
  const affected = resolveAffectedPackages(diff, workspaceGraph, filter);

  const sortedAffected = Array.from(affected).sort();
  return formatAffectedOutput(sortedAffected, options.output);
}

async function loadWorkspaceManifests(workspaceRoot: string): Promise<PackageManifest[]> {
  const manifests: PackageManifest[] = [];
  await collectManifests(workspaceRoot, manifests);
  return manifests;
}

async function collectManifests(dir: string, manifests: PackageManifest[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await collectManifests(fullPath, manifests);
    } else if (entry.isFile() && entry.name === 'package.json') {
      try {
        const content = await readFile(fullPath, 'utf-8');
        const parsed: unknown = JSON.parse(content);
        if (isPackageManifest(parsed)) {
          manifests.push(parsed);
        }
      } catch {
        // Skip malformed package.json files
      }
    }
  }
}

function isPackageManifest(value: unknown): value is PackageManifest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  // name must be a string when present
  if ('name' in obj && typeof obj['name'] !== 'string') return false;
  return true;
}
