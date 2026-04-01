import type { LockfileParser } from '../types/lockfile.js';

export type DetectedLockfile = {
  readonly path: string;
  readonly format: string;
};

/**
 * Detects the lockfile format from content by trying each parser's detect method.
 * Returns the format name from the matching parser.
 * Throws if no format can be detected.
 */
export function detectLockfile(content: string, parsers: readonly LockfileParser[]): string {
  for (const parser of parsers) {
    if (parser.detect(content)) {
      return parser.format;
    }
  }

  const availableFormats = parsers.map((p) => p.format);
  throw new Error(
    `Unable to detect lockfile format. Available formats: ${availableFormats.join(', ')}`,
  );
}
