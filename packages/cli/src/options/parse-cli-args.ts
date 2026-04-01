import type { CliOptions, OutputFormat } from './cli-options.types.js';
import { isSupportedFormat, supportedFormats, type SupportedFormat } from '../lockfile/parsers.js';

export const helpText = `\
Usage: lockfile-affected <before-lockfile> <after-lockfile> [options]

  Use '-' as <before-lockfile> to read from stdin.

Options:
  --workspace <path>    Root directory to search for package.json files
                        (defaults to cwd)
  --format <pnpm|npm|yarn|bun> Lockfile format override (auto-detected from filename)
  --json                Output as a JSON array instead of newline-separated
  --deps                Include production dependencies
  --dev                 Include dev dependencies
  --peer                Include peer dependencies
  --optional            Include optional dependencies
                        (when no dep flags are set, all types are included)
  --root-deps-affect-all Treat root dependency changes as affecting all packages
  --help                Show this help message
`;

export type ParseCliArgsResult = { kind: 'help' } | { kind: 'options'; options: CliOptions };

/**
 * Parses raw process.argv arguments into a ParseCliArgsResult.
 * Returns `{ kind: 'help' }` when --help is passed.
 * Throws a descriptive error if arguments are missing or invalid.
 */
export function parseCliArgs(args: readonly string[]): ParseCliArgsResult {
  const positional: string[] = [];
  let output: OutputFormat = 'lines';
  let workspaceRoot = process.cwd();
  let format: SupportedFormat | undefined;
  let deps = false;
  let dev = false;
  let peer = false;
  let optional = false;
  let rootDepsAffectAll = false;

  const iter = args[Symbol.iterator]();
  for (const arg of iter) {
    if (arg === '--help' || arg === '-h') {
      return { kind: 'help' };
    } else if (arg === '--json') {
      output = 'json';
    } else if (arg === '--deps') {
      deps = true;
    } else if (arg === '--dev') {
      dev = true;
    } else if (arg === '--peer') {
      peer = true;
    } else if (arg === '--optional') {
      optional = true;
    } else if (arg === '--root-deps-affect-all') {
      rootDepsAffectAll = true;
    } else if (arg === '--workspace') {
      const { value, done } = iter.next();
      if (done || !value) throw new Error('--workspace requires a path argument');
      workspaceRoot = value;
    } else if (arg === '--format') {
      const { value, done } = iter.next();
      if (done || !value) throw new Error('--format requires a value');
      if (!isSupportedFormat(value)) {
        throw new Error(
          `Unsupported format "${value}". Supported formats: ${supportedFormats.join(', ')}`,
        );
      }
      format = value;
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  const twoOrMore = atLeastTwo(positional);
  if (!twoOrMore) {
    throw new Error(
      'Usage: lockfile-affected <before-lockfile> <after-lockfile> [options]\nRun with --help for more information.',
    );
  }
  const [lockfileBefore, lockfileAfter] = twoOrMore;

  return {
    kind: 'options',
    options: {
      lockfileBefore,
      lockfileAfter,
      workspaceRoot,
      output,
      ...(format !== undefined && { format }),
      deps,
      dev,
      peer,
      optional,
      rootDepsAffectAll,
    },
  };
}

function atLeastTwo<T>(arr: T[]): [T, T, ...T[]] | undefined {
  if (arr.length >= 2) return arr as [T, T, ...T[]];
  return undefined;
}
