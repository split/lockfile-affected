export type OutputFormat = 'lines' | 'json';

/**
 * Parsed and validated CLI options.
 */
export type CliOptions = {
  /** Path to the "before" lockfile snapshot */
  readonly lockfileBefore: string;
  /** Path to the "after" lockfile snapshot */
  readonly lockfileAfter: string;
  /** Directory containing workspace package.json files (defaults to cwd) */
  readonly workspaceRoot: string;
  /** Output format */
  readonly output: OutputFormat;
  /** Lockfile format — auto-inferred from filename when absent */
  readonly format?: 'pnpm' | 'npm';
  /**
   * Which dependency types to consider. When none are explicitly set,
   * all types are included by default.
   */
  readonly deps: boolean;
  readonly dev: boolean;
  readonly peer: boolean;
  readonly optional: boolean;
};
