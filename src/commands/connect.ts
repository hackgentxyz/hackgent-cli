import { loadConfig, recordAgentConnection } from '../config.js';
import { SUPPORTED_AGENTS, MCP_URL, type AgentName } from '../constants.js';
import { ok, info, fail, heading, dim, warn } from '../ui.js';
import { connectClaudeDesktop } from '../adapters/claude-desktop.js';
import { connectCursor } from '../adapters/cursor.js';
import { renderRawSnippet } from '../adapters/raw.js';

/**
 * `hackgent connect --agent <name>` — write the MCP server block into the
 * named agent's config file, or print the JSON snippet for `--agent raw`.
 *
 * Requires a saved API key (run `hackgent login` first). We could prompt
 * for one inline, but keeping login + connect separate matches how every
 * mature CLI handles credentials and lets `hackgent doctor` blame a
 * missing key precisely.
 */

export interface ConnectOptions {
  agent: AgentName | string;
  mcpUrl?: string;
}

export async function runConnect(opts: ConnectOptions): Promise<number> {
  if (!isSupportedAgent(opts.agent)) {
    fail(`Unknown agent \`${opts.agent}\`. Supported: ${SUPPORTED_AGENTS.join(', ')}`);
    return 1;
  }
  const agent = opts.agent;

  const cfg = loadConfig();
  if (!cfg.apiKey) {
    fail('No API key found. Run `hackgent login` first.');
    return 1;
  }

  const mcpUrl = opts.mcpUrl ?? cfg.mcpUrl ?? MCP_URL;

  heading(`Connecting agent: ${agent}`);

  try {
    switch (agent) {
      case 'claude-desktop': {
        const result = connectClaudeDesktop({ apiKey: cfg.apiKey, mcpUrl });
        ok(`Updated ${result.configPath}`);
        if (result.backupPath) info(`Backup saved to ${dim(result.backupPath)}`);
        if (result.alreadyConfigured) {
          warn('An existing `hackgent` MCP entry was overwritten.');
        }
        recordAgentConnection(agent);
        info('Restart Claude Desktop to load the new MCP server.');
        info(`Then prompt Claude: "${dim('Solve a HACKGENT puzzle')}"`);
        return 0;
      }
      case 'cursor': {
        const result = connectCursor({ apiKey: cfg.apiKey, mcpUrl });
        ok(`Updated ${result.configPath}`);
        if (result.backupPath) info(`Backup saved to ${dim(result.backupPath)}`);
        if (result.alreadyConfigured) {
          warn('An existing `hackgent` MCP entry was overwritten.');
        }
        recordAgentConnection(agent);
        info('Restart Cursor to load the new MCP server.');
        info(`Then prompt Cursor: "${dim('Solve a HACKGENT puzzle')}"`);
        return 0;
      }
      case 'raw': {
        const snippet = renderRawSnippet({ apiKey: cfg.apiKey, mcpUrl });
        info('Copy the snippet below into your MCP-aware client:');
        console.log();
        console.log(snippet);
        console.log();
        return 0;
      }
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    fail(`Failed to connect ${agent}: ${reason}`);
    return 1;
  }
}

function isSupportedAgent(value: string): value is AgentName {
  return (SUPPORTED_AGENTS as readonly string[]).includes(value);
}
