import {
  createScopedReleaseCommitsPlugin,
  readPackageName,
} from './scripts/release/scoped-release-commits-plugin.js';

const currentPackageName = readPackageName(process.cwd());

const shortName = currentPackageName.replace('@lockfile-affected/', '');

const config = {
  branches: ['main'],
  repositoryUrl: 'https://github.com/split/lockfile-affected',
  tagFormat: `${currentPackageName}-v\${version}`,
  plugins: [
    createScopedReleaseCommitsPlugin(),
    [
      '@semantic-release/exec',
      {
        prepareCmd: `npm version \${nextRelease.version} --no-git-tag-version --message "chore(release): ${shortName} \${nextRelease.version} [skip ci]"`,
        publishCmd: 'pnpm publish --access public',
      },
    ],
    '@semantic-release/git',
    '@semantic-release/github',
  ],
};

export default config;
