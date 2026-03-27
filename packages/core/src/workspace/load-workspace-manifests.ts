import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PackageManifest } from './build-workspace-graph.js';

/**
 * Recursively walks `dir` and returns all valid package.json manifests found,
 * skipping `node_modules` directories and malformed files.
 */
export async function loadWorkspaceManifests(dir: string): Promise<PackageManifest[]> {
  const manifests: PackageManifest[] = [];
  await collectManifests(dir, manifests);
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
        // skip malformed package.json files
      }
    }
  }
}

function isPackageManifest(value: unknown): value is PackageManifest {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if ('name' in obj && typeof obj['name'] !== 'string') return false;
  return true;
}
