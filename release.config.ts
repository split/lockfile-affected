import type { GlobalConfig } from 'semantic-release';
import commitAnalyzer from '@semantic-release/commit-analyzer';
import releaseNotesGenerator from '@semantic-release/release-notes-generator';
import npm from '@semantic-release/npm';
import git from '@semantic-release/git';
import github from '@semantic-release/github';
import { findAffectedPackages, detectLockfile } from '@lockfile-affected/core';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';
import type { LockfileParser } from '@lockfile-affected/core';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const parsersMap: Record<string, LockfileParser> = {
  pnpm: pnpmLockfileParser,
  npm: npmLockfileParser,
  yarn: yarnLockfileParser,
};

interface ReleaseContext {
  cwd: string;
  lastRelease?: { gitTag?: string };
  logger: { log: (msg: string) => void };
}

interface AnalyzeCommitsPlugin {
  analyzeCommits: (
    pluginConfig: Record<string, unknown>,
    context: ReleaseContext,
  ) => Promise<string | undefined>;
}

const withLockfileAffected = (plugin: AnalyzeCommitsPlugin) => {
  return async (pluginConfig: Record<string, unknown>, context: ReleaseContext) => {
    const { cwd, lastRelease, logger } = context;

    const affected = await getLockfileAffectedPackages(cwd, lastRelease);
    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf-8'));
    const pkgName = pkg.name;

    const isAffected = affected.has(pkgName);

    if (isAffected) {
      logger.log(`Package ${pkgName} is affected by lockfile changes`);
    }

    if (!isAffected) {
      return plugin.analyzeCommits(pluginConfig, context);
    }

    const releaseType = await plugin.analyzeCommits(pluginConfig, context);
    return releaseType || 'patch';
  };
};

async function getLockfileAffectedPackages(cwd: string, lastRelease?: { gitTag?: string }) {
  const affected = new Set<string>();

  if (!lastRelease?.gitTag) return affected;

  const parserList = Object.values(parsersMap);
  let detected;

  try {
    detected = await detectLockfile(cwd, parserList);
  } catch {
    return affected;
  }

  const parser = parsersMap[detected.format];
  const lockfileName = path.basename(detected.path);

  try {
    const newContent = await fs.readFile(path.join(cwd, lockfileName), 'utf-8');
    const oldContent = execSync(`git show ${lastRelease.gitTag}:${lockfileName}`, {
      encoding: 'utf-8',
    });

    const result = await findAffectedPackages({
      beforeContent: oldContent,
      afterContent: newContent,
      parser,
      workspaceRoot: cwd,
    });

    for (const pkg of result) affected.add(pkg);
  } catch {
    // Ignore errors - lockfile might not exist in old tag
  }

  return affected;
}

const config: GlobalConfig = {
  branches: ['main'],
  extends: 'semantic-release-monorepo',
  repositoryUrl: 'https://github.com/split/lockfile-affected',
  tagFormat: 'v${version}',
  plugins: [
    { analyzeCommits: withLockfileAffected(commitAnalyzer) },
    releaseNotesGenerator,
    npm,
    git,
    github,
  ],
};

export default config;
