import {
  createScopedReleaseCommitsPlugin,
  readPackageName,
} from './scripts/release/scoped-release-commits-plugin.js';

const currentPackageName = readPackageName(process.cwd());

const config = {
  branches: ['main'],
  repositoryUrl: 'https://github.com/split/lockfile-affected',
  tagFormat: `${currentPackageName}-v\${version}`,
  plugins: [
    createScopedReleaseCommitsPlugin(),
    '@semantic-release/npm',
    '@semantic-release/git',
    '@semantic-release/github',
  ],
};

export default config;
