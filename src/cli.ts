#!/usr/bin/env node
import { Command } from 'commander';
import { runLogin } from './commands/login.js';
import { runConnect } from './commands/connect.js';
import { runDisconnect } from './commands/disconnect.js';
import { runStatus } from './commands/status.js';
import { runDoctor } from './commands/doctor.js';
import { SUPPORTED_AGENTS } from './constants.js';
import { fail } from './ui.js';

/**
 * `hackgent` CLI entrypoint. Commander parses argv, dispatches to the
 * command handler, and we exit with the handler's return code so shells
 * (and CI) can pipeline correctly.
 *
 * Top-level commands intentionally mirror what the landing page tells
 * users to type: `npx hackgent connect --agent claude-desktop`.
 */

const program = new Command();

program
  .name('hackgent')
  .description('CLI for HACKGENT — connect AI agents to the HACKGENT MCP server.')
  .version(getVersion())
  .showHelpAfterError();

program
  .command('login')
  .description('Save your HACKGENT API key locally (paste from dashboard).')
  .option('--api-key <key>', 'API key (skips the interactive prompt)')
  .option('--non-interactive', 'Fail instead of prompting if --api-key is missing')
  .action(async (opts: { apiKey?: string; nonInteractive?: boolean }) => {
    const code = await runLogin({
      apiKey: opts.apiKey,
      nonInteractive: opts.nonInteractive ?? false,
    });
    process.exit(code);
  });

program
  .command('connect')
  .description('Connect an AI agent to the HACKGENT MCP server.')
  .requiredOption(
    '--agent <name>',
    `Target agent (${SUPPORTED_AGENTS.join(' | ')})`,
  )
  .option('--mcp-url <url>', 'Override the MCP URL written into the agent config')
  .action(async (opts: { agent: string; mcpUrl?: string }) => {
    const code = await runConnect({ agent: opts.agent, mcpUrl: opts.mcpUrl });
    process.exit(code);
  });

program
  .command('disconnect')
  .description('Remove the HACKGENT MCP entry from an agent config.')
  .requiredOption(
    '--agent <name>',
    `Target agent (${SUPPORTED_AGENTS.join(' | ')})`,
  )
  .action(async (opts: { agent: string }) => {
    const code = await runDisconnect({ agent: opts.agent });
    process.exit(code);
  });

program
  .command('status')
  .description('Show current login + connected agents.')
  .action(async () => {
    const code = await runStatus();
    process.exit(code);
  });

program
  .command('doctor')
  .description('Diagnose API + MCP reachability and key validity.')
  .action(async () => {
    const code = await runDoctor();
    process.exit(code);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const reason = err instanceof Error ? err.message : String(err);
  fail(reason);
  process.exit(1);
});

function getVersion(): string {
  // tsup bundles this file standalone, so we hard-code the version. The
  // build script keeps it aligned with package.json via a search/replace
  // step before `pnpm publish`. Bump this in lock-step with package.json
  // for every release.
  return '0.1.1';
}
