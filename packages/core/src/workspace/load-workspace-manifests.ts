import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PackageManifest } from './build-workspace-graph.js';

/**
 * Recursively walks `dir` and returns all valid package.json manifests found,
 * skipping `node_modules` directories and the root package.json.
 * Only returns workspace packages (not the root).
 */
export async function loadWorkspaceManifests(dir: string): Promise<PackageManifest[]> {
  const manifests: PackageManifest[] = [];
  await collectManifests(dir, dir, manifests);
  return manifests;
}

/**
 * Loads the root package.json from the workspace root.
 * Returns undefined if the file doesn't exist or is malformed.
 */
export async function loadRootManifest(dir: string): Promise<PackageManifest | undefined> {
  const rootPath = join(dir, 'package.json');
  try {
    const content = await readFile(rootPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    if (isPackageManifest(parsed)) {
      return parsed;
    }
  } catch {
    // file doesn't exist or is malformed
  }
  return undefined;
}

async function collectManifests(
  dir: string,
  workspaceRoot: string,
  manifests: PackageManifest[],
): Promise<void> {
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
      await collectManifests(fullPath, workspaceRoot, manifests);
    } else if (entry.isFile() && entry.name === 'package.json') {
      // Skip root package.json
      if (fullPath === join(workspaceRoot, 'package.json')) continue;

      try {
        const content = await readFile(fullPath, 'utf-8');
        const parsed: unknown = JSON.parse(content);
        if (isPackageManifest(parsed)) {
          manifests.push(parsed);
        }
      } catch {
        // skip malformed package.json files
      }
    }
  }
}

function isPackageManifest(value: unknown): value is PackageManifest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!('name' in obj) || typeof obj['name'] !== 'string') return false;
  return true;
}
