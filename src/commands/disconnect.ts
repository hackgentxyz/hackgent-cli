import { recordAgentDisconnection } from '../config.js';
import { SUPPORTED_AGENTS, type AgentName } from '../constants.js';
import { ok, fail, info, dim } from '../ui.js';
import { disconnectClaudeDesktop } from '../adapters/claude-desktop.js';
import { disconnectCursor } from '../adapters/cursor.js';

export interface DisconnectOptions {
  agent: AgentName | string;
}

export async function runDisconnect(opts: DisconnectOptions): Promise<number> {
  if (!isSupportedAgent(opts.agent)) {
    fail(`Unknown agent \`${opts.agent}\`. Supported: ${SUPPORTED_AGENTS.join(', ')}`);
    return 1;
  }
  const agent = opts.agent;

  try {
    switch (agent) {
      case 'claude-desktop': {
        const r = disconnectClaudeDesktop();
        if (r.removed) {
          ok(`Removed \`hackgent\` from ${r.configPath}`);
          recordAgentDisconnection(agent);
        } else {
          info(`No \`hackgent\` entry found in ${dim(r.configPath)}`);
        }
        return 0;
      }
      case 'cursor': {
        const r = disconnectCursor();
        if (r.removed) {
          ok(`Removed \`hackgent\` from ${r.configPath}`);
          recordAgentDisconnection(agent);
        } else {
          info(`No \`hackgent\` entry found in ${dim(r.configPath)}`);
        }
        return 0;
      }
      case 'raw': {
        info('`raw` does not write any file, so there is nothing to disconnect.');
        return 0;
      }
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    fail(`Failed to disconnect ${agent}: ${reason}`);
    return 1;
  }
}

function isSupportedAgent(value: string): value is AgentName {
  return (SUPPORTED_AGENTS as readonly string[]).includes(value);
}
