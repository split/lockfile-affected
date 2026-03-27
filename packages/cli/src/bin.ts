#!/usr/bin/env node
import { HELP_TEXT, parseCliArgs } from './options/parse-cli-args.js';
import { runAffectedCommand } from './commands/run-affected-command.js';

const args = process.argv.slice(2);
const result = parseCliArgs(args);

if (result.kind === 'help') {
  process.stdout.write(HELP_TEXT);
  process.exit(0);
}

try {
  const output = await runAffectedCommand(result.options);
  if (output) process.stdout.write(output + '\n');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}
