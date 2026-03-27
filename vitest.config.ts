import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/lockfile-pnpm',
      'packages/lockfile-npm',
      'packages/lockfile-yarn',
      'packages/cli',
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/**/src/**/*.ts'],
      exclude: ['packages/**/src/**/*.test.ts', 'packages/**/src/bin.ts'],
    },
  },
});
