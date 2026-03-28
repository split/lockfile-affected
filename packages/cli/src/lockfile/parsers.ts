import { bunLockfileParser } from '@lockfile-affected/lockfile-bun';
import type { LockfileParser } from '@lockfile-affected/core';
import { npmLockfileParser } from '@lockfile-affected/lockfile-npm';
import { pnpmLockfileParser } from '@lockfile-affected/lockfile-pnpm';
import { yarnLockfileParser } from '@lockfile-affected/lockfile-yarn';

export const lockfileParsersByFormat = {
  pnpm: pnpmLockfileParser,
  npm: npmLockfileParser,
  yarn: yarnLockfileParser,
  bun: bunLockfileParser,
} satisfies Record<string, LockfileParser>;

export type SupportedFormat = keyof typeof lockfileParsersByFormat;

export const lockfileParsers: readonly LockfileParser[] = Object.values(lockfileParsersByFormat);

export const supportedFormats: readonly string[] = Object.keys(lockfileParsersByFormat);

export function isSupportedFormat(value: string): value is SupportedFormat {
  return value in lockfileParsersByFormat;
}
