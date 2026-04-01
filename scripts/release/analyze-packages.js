import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASE_CONFIG_PATH = path.resolve(__dirname, '../../release.config.js');

function getGitRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf-8',
  }).trim();
}

function getWorkspacePackages(cwd) {
  const workspaceRoot = getGitRoot(cwd);
  const output = execFileSync(
    'pnpm',
    ['list', '--recursive', '--only-projects', '--json', '--depth=0'],
    {
      cwd: workspaceRoot,
      encoding: 'utf-8',
    },
  );

  const packages = JSON.parse(output);
  return packages
    .filter((pkg) => !pkg.private && pkg.name)
    .map((pkg) => ({
      name: pkg.name,
      path: pkg.path,
      version: pkg.version,
      dependencies: pkg.dependencies || {},
    }));
}

function findDependents(packageName, allPackages) {
  const dependents = [];
  for (const pkg of allPackages) {
    const deps = pkg.dependencies || {};
    if (deps[packageName]) {
      dependents.push(pkg.name);
    }
  }
  return dependents;
}

function findAllDependents(packageName, allPackages) {
  const dependents = [];
  for (const pkg of allPackages) {
    const deps = pkg.dependencies || {};
    if (deps[packageName]) {
      dependents.push(pkg.name);
      const transitiveDependents = findAllDependents(pkg.name, allPackages);
      for (const td of transitiveDependents) {
        if (!dependents.includes(td)) {
          dependents.push(td);
        }
      }
    }
  }
  return dependents;
}

function readPackageName(cwd) {
  const pkgRaw = fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8');
  const parsed = JSON.parse(pkgRaw);
  const { name } = parsed;
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error(`Missing package name in ${cwd}`);
  }
  return name;
}

function toGitPath(filePath) {
  return filePath.split(path.sep).join('/');
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

function getLastReleaseTag(cwd, packageName) {
  const tagPattern = `${packageName}-v*`;
  try {
    const output = execFileSync(
      'git',
      ['describe', '--tags', '--abbrev=0', `--match=${tagPattern}`],
      {
        cwd,
        encoding: 'utf-8',
      },
    );
    return output.trim();
  } catch {
    return null;
  }
}

function getCommitsSinceTag(cwd, tag) {
  if (!tag) {
    return [];
  }
  try {
    const output = execFileSync('git', ['log', `${tag}..HEAD`, '--oneline'], {
      cwd,
      encoding: 'utf-8',
    });
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function analyzeCommitsForPackage(gitRoot, packagePath, commits) {
  const packageCommitHashes = new Set();

  for (const commitLine of commits) {
    const commitHash = commitLine.split(' ')[0];
    const files = getChangedFiles(gitRoot, commitHash);
    const touchesPackage = files.some(
      (filePath) => filePath === packagePath || filePath.startsWith(`${packagePath}/`),
    );

    if (touchesPackage) {
      packageCommitHashes.add(commitHash);
    }
  }

  return packageCommitHashes;
}

function checkPackageHasChanges(cwd, packageInfo) {
  const gitRoot = getGitRoot(cwd);
  const packageName = readPackageName(packageInfo.path);
  const packagePath = toGitPath(path.relative(gitRoot, packageInfo.path));

  const lastTag = getLastReleaseTag(gitRoot, packageName);
  const commits = getCommitsSinceTag(gitRoot, lastTag);

  if (commits.length === 0) {
    return { hasChanges: false, commits: [] };
  }

  const commitHashes = analyzeCommitsForPackage(gitRoot, packagePath, commits);

  return {
    hasChanges: commitHashes.size > 0,
    commits: [...commitHashes],
    lastTag,
  };
}

async function analyzeReleases(cwd = process.cwd()) {
  const workspacePackages = getWorkspacePackages(cwd);
  const packagesWithChanges = new Map();

  for (const pkg of workspacePackages) {
    const result = checkPackageHasChanges(cwd, pkg);

    if (result.hasChanges) {
      packagesWithChanges.set(pkg.name, {
        ...pkg,
        reason: 'direct changes',
        commits: result.commits,
      });
    }
  }

  const packagesToRelease = new Set([...packagesWithChanges.keys()]);

  for (const packageName of packagesWithChanges.keys()) {
    const allDependents = findAllDependents(packageName, workspacePackages);

    for (const dependent of allDependents) {
      if (!packagesToRelease.has(dependent)) {
        packagesToRelease.add(dependent);
        packagesWithChanges.set(dependent, {
          ...workspacePackages.find((p) => p.name === dependent),
          reason: `dependency update (${packageName})`,
        });
      }
    }
  }

  const sortedPackages = topologicalSort([...packagesToRelease], (pkg) => {
    const pkgInfo = workspacePackages.find((p) => p.name === pkg);
    return Object.keys(pkgInfo?.dependencies || {});
  });

  return {
    packages: sortedPackages.map((name) => packagesWithChanges.get(name)),
  };
}

function topologicalSort(packages, getDependencies) {
  const result = [];
  const visited = new Set();
  const inProgress = new Set();

  function visit(pkg) {
    if (visited.has(pkg)) return;
    if (inProgress.has(pkg)) return;

    inProgress.add(pkg);

    const allPackages = getDependencies(pkg);
    for (const dep of allPackages) {
      if (packages.includes(dep)) {
        visit(dep);
      }
    }

    inProgress.delete(pkg);
    visited.add(pkg);
    result.push(pkg);
  }

  for (const pkg of packages) {
    visit(pkg);
  }

  return result;
}

function formatReleasePlan(analysisResult) {
  const lines = ['## 📋 Release Plan', ''];

  if (analysisResult.packages.length === 0) {
    lines.push('No packages need releasing.');
    return lines.join('\n');
  }

  lines.push('**Packages to release:**');
  for (let i = 0; i < analysisResult.packages.length; i++) {
    const pkg = analysisResult.packages[i];
    const reason = pkg.reason || 'changes';
    lines.push(`${i + 1}. ${pkg.name} - ${reason}`);
  }

  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const analysisResult = await analyzeReleases(process.cwd());
  const plan = formatReleasePlan(analysisResult);
  console.log(plan);
}
