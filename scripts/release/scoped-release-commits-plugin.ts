import { detectLockfile, findAffectedPackages } from '@lockfile-affected/core';
import type { LockfileParser } from '@lockfile-affected/core';
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';
import * as commitAnalyzer from '@semantic-release/commit-analyzer';
import * as releaseNotesGenerator from '@semantic-release/release-notes-generator';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const parsersMap: Record<string, LockfileParser> = {
  pnpm: pnpmLockfileParser,
  npm: npmLockfileParser,
  yarn: yarnLockfileParser,
};

interface Logger {
  log: (message: string) => void;
}

interface ReleaseContext {
  cwd: string;
  logger: Logger;
  commits?: unknown[];
  lastRelease?: { gitTag?: string };
  nextRelease?: unknown;
}

interface CommitRecord {
  hash: string;
}

const scopedCommitsCache = new Map<string, Promise<unknown[]>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCommitRecord(value: unknown): value is CommitRecord {
  if (!isRecord(value)) return false;
  return typeof value.hash === 'string' && value.hash.length > 0;
}

export function readPackageName(cwd: string): string {
  const pkgRaw = fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8');
  const parsed: unknown = JSON.parse(pkgRaw);

  if (!isRecord(parsed)) {
    throw new Error(`Invalid package.json in ${cwd}`);
  }

  const name = parsed.name;
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`Missing package name in ${cwd}`);
  }

  return name;
}

function toGitPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function getGitRoot(cwd: string): string {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf-8',
  }).trim();
}

function getChangedFiles(cwd: string, commitHash: string): string[] {
  const output = execFileSync('git', ['show', '--pretty=format:', '--name-only', commitHash], {
    cwd,
    encoding: 'utf-8',
  });

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function readTextAtRef(cwd: string, gitRef: string, filePath: string): string | undefined {
  try {
    return execFileSync('git', ['show', `${gitRef}:${filePath}`], {
      cwd,
      encoding: 'utf-8',
    });
  } catch {
    return undefined;
  }
}

async function affectedPackagesForLockfileCommit(
  gitRoot: string,
  commitHash: string,
  lockfilePath: string,
  parser: LockfileParser,
): Promise<Set<string>> {
  const beforeContent = readTextAtRef(gitRoot, `${commitHash}^`, lockfilePath);
  const afterContent = readTextAtRef(gitRoot, commitHash, lockfilePath);

  if (!beforeContent || !afterContent) {
    return new Set<string>();
  }

  const affected = await findAffectedPackages({
    beforeContent,
    afterContent,
    parser,
    workspaceRoot: gitRoot,
  });

  return new Set(affected);
}

async function scopeCommitsForPackage(context: ReleaseContext): Promise<unknown[]> {
  const commits = Array.isArray(context.commits) ? context.commits : [];
  const validCommits = commits.filter(isCommitRecord);

  if (validCommits.length === 0) {
    return [];
  }

  const gitRoot = getGitRoot(context.cwd);
  const packagePath = toGitPath(path.relative(gitRoot, context.cwd));
  const packageName = readPackageName(context.cwd);

  const changedFilesCache = new Map<string, string[]>();
  const filesFor = (hash: string): string[] => {
    const cached = changedFilesCache.get(hash);
    if (cached) return cached;

    const files = getChangedFiles(gitRoot, hash);
    changedFilesCache.set(hash, files);
    return files;
  };

  const packageCommitHashes = new Set<string>();
  for (const commit of validCommits) {
    const files = filesFor(commit.hash);
    const touchesPackage = files.some(
      (filePath) => filePath === packagePath || filePath.startsWith(`${packagePath}/`),
    );

    if (touchesPackage) {
      packageCommitHashes.add(commit.hash);
    }
  }

  const selectPackageCommits = () =>
    commits.filter((commit) => isCommitRecord(commit) && packageCommitHashes.has(commit.hash));

  if (!context.lastRelease?.gitTag) {
    return selectPackageCommits();
  }

  let detectedLockfile;
  try {
    detectedLockfile = await detectLockfile(gitRoot, Object.values(parsersMap));
  } catch {
    return selectPackageCommits();
  }

  const parser = parsersMap[detectedLockfile.format];
  const lockfilePath = toGitPath(path.relative(gitRoot, detectedLockfile.path));
  const lockfileAffectedHashes = new Set<string>();
  const affectedByCommitCache = new Map<string, Set<string>>();

  for (const commit of validCommits) {
    const files = filesFor(commit.hash);
    if (!files.includes(lockfilePath)) continue;

    let affected = affectedByCommitCache.get(commit.hash);
    if (!affected) {
      affected = await affectedPackagesForLockfileCommit(
        gitRoot,
        commit.hash,
        lockfilePath,
        parser,
      );
      affectedByCommitCache.set(commit.hash, affected);
    }

    if (affected.has(packageName)) {
      lockfileAffectedHashes.add(commit.hash);
    }
  }

  const includedHashes = new Set<string>([...packageCommitHashes, ...lockfileAffectedHashes]);
  const lockfileHashList = [...lockfileAffectedHashes].map((hash) => hash.slice(0, 7)).join(', ');
  context.logger.log(
    `Scoped ${includedHashes.size} commits for ${packageName} (${packageCommitHashes.size} package, ${lockfileAffectedHashes.size} lockfile-impact)`,
  );
  if (lockfileAffectedHashes.size > 0) {
    context.logger.log(`Lockfile-impact commits for ${packageName}: ${lockfileHashList}`);
  }

  return commits.filter((commit) => isCommitRecord(commit) && includedHashes.has(commit.hash));
}

function getScopedCacheKey(context: ReleaseContext): string {
  const commits = Array.isArray(context.commits) ? context.commits : [];
  const hashes = commits
    .filter(isCommitRecord)
    .map((commit) => commit.hash)
    .join(',');
  return `${context.cwd}|${context.lastRelease?.gitTag ?? 'none'}|${hashes}`;
}

function getScopedCommits(context: ReleaseContext): Promise<unknown[]> {
  const key = getScopedCacheKey(context);
  const cached = scopedCommitsCache.get(key);
  if (cached) {
    return cached;
  }

  const computed = scopeCommitsForPackage(context);
  scopedCommitsCache.set(key, computed);
  return computed;
}

export function createScopedReleaseCommitsPlugin() {
  return {
    analyzeCommits: async (
      pluginConfig: Parameters<typeof commitAnalyzer.analyzeCommits>[0],
      context: ReleaseContext,
    ) => {
      const scopedCommits = await getScopedCommits(context);
      const scopedContext = {
        ...context,
        commits: scopedCommits,
      };

      return commitAnalyzer.analyzeCommits(pluginConfig, scopedContext);
    },
    generateNotes: async (
      pluginConfig: Parameters<typeof releaseNotesGenerator.generateNotes>[0],
      context: ReleaseContext,
    ) => {
      const scopedCommits = await getScopedCommits(context);
      const scopedContext = {
        ...context,
        commits: scopedCommits,
        lastRelease: context.lastRelease ?? {},
        nextRelease: context.nextRelease ?? {},
      };

      return releaseNotesGenerator.generateNotes(pluginConfig, scopedContext);
    },
  };
}
