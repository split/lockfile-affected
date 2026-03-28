import { detectLockfile, findAffectedPackages } from '@lockfile-affected/core';
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';
import * as commitAnalyzer from '@semantic-release/commit-analyzer';
import * as releaseNotesGenerator from '@semantic-release/release-notes-generator';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const parsersMap = {
  pnpm: pnpmLockfileParser,
  npm: npmLockfileParser,
  yarn: yarnLockfileParser,
};

const scopedCommitsCache = new Map();

function isRecord(value) {
  return typeof value === 'object' && value !== null;
}

function isCommitRecord(value) {
  if (!isRecord(value)) return false;
  return typeof value.hash === 'string' && value.hash.length > 0;
}

export function readPackageName(cwd) {
  const pkgRaw = fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8');
  const parsed = JSON.parse(pkgRaw);

  if (!isRecord(parsed)) {
    throw new Error(`Invalid package.json in ${cwd}`);
  }

  const { name } = parsed;
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`Missing package name in ${cwd}`);
  }

  return name;
}

function toGitPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function getGitRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf-8',
  }).trim();
}

function getChangedFiles(cwd, commitHash) {
  const output = execFileSync('git', ['show', '--pretty=format:', '--name-only', commitHash], {
    cwd,
    encoding: 'utf-8',
  });

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function readTextAtRef(cwd, gitRef, filePath) {
  try {
    return execFileSync('git', ['show', `${gitRef}:${filePath}`], {
      cwd,
      encoding: 'utf-8',
    });
  } catch {
    return undefined;
  }
}

async function affectedPackagesForLockfileCommit(gitRoot, commitHash, lockfilePath, parser) {
  const beforeContent = readTextAtRef(gitRoot, `${commitHash}^`, lockfilePath);
  const afterContent = readTextAtRef(gitRoot, commitHash, lockfilePath);

  if (!beforeContent || !afterContent) {
    return new Set();
  }

  const affected = await findAffectedPackages({
    beforeContent,
    afterContent,
    parser,
    workspaceRoot: gitRoot,
  });

  return new Set(affected);
}

async function scopeCommitsForPackage(context) {
  const commits = Array.isArray(context.commits) ? context.commits : [];
  const validCommits = commits.filter(isCommitRecord);

  if (validCommits.length === 0) {
    return [];
  }

  const gitRoot = getGitRoot(context.cwd);
  const packagePath = toGitPath(path.relative(gitRoot, context.cwd));
  const packageName = readPackageName(context.cwd);

  const changedFilesCache = new Map();
  const filesFor = (hash) => {
    const cached = changedFilesCache.get(hash);
    if (cached) return cached;

    const files = getChangedFiles(gitRoot, hash);
    changedFilesCache.set(hash, files);
    return files;
  };

  const packageCommitHashes = new Set();
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
  const lockfileAffectedHashes = new Set();
  const affectedByCommitCache = new Map();

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

  const includedHashes = new Set([...packageCommitHashes, ...lockfileAffectedHashes]);
  const lockfileHashList = [...lockfileAffectedHashes].map((hash) => hash.slice(0, 7)).join(', ');
  context.logger.log(
    `Scoped ${includedHashes.size} commits for ${packageName} (${packageCommitHashes.size} package, ${lockfileAffectedHashes.size} lockfile-impact)`,
  );
  if (lockfileAffectedHashes.size > 0) {
    context.logger.log(`Lockfile-impact commits for ${packageName}: ${lockfileHashList}`);
  }

  return commits.filter((commit) => isCommitRecord(commit) && includedHashes.has(commit.hash));
}

function getScopedCacheKey(context) {
  const commits = Array.isArray(context.commits) ? context.commits : [];
  const hashes = commits
    .filter(isCommitRecord)
    .map((commit) => commit.hash)
    .join(',');
  return `${context.cwd}|${context.lastRelease?.gitTag ?? 'none'}|${hashes}`;
}

function getScopedCommits(context) {
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
    analyzeCommits: async (pluginConfig, context) => {
      const scopedCommits = await getScopedCommits(context);
      const scopedContext = {
        ...context,
        commits: scopedCommits,
      };

      return commitAnalyzer.analyzeCommits(pluginConfig, scopedContext);
    },
    generateNotes: async (pluginConfig, context) => {
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
