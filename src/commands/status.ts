import { getConfigPath, loadConfig } from '../config.js';
import { MCP_URL, API_URL } from '../constants.js';
import { heading, info, dim, ok, warn, bold } from '../ui.js';

export async function runStatus(): Promise<number> {
  const cfg = loadConfig();

  heading('HACKGENT CLI status');
  info(`Config file: ${dim(getConfigPath())}`);
  info(`MCP URL    : ${dim(cfg.mcpUrl ?? MCP_URL)}`);
  info(`API URL    : ${dim(API_URL)}`);

  if (cfg.apiKey) {
    ok(`API key    : ${maskKey(cfg.apiKey)}`);
  } else {
    warn('API key    : not set (run `hackgent login`)');
  }

  if (cfg.walletAddress) {
    info(`Wallet     : ${dim(cfg.walletAddress)}`);
  }

  heading('Connected agents');
  const connected = cfg.connectedAgents ?? {};
  const entries = Object.entries(connected);
  if (entries.length === 0) {
    info('No agents connected yet — try `hackgent connect --agent claude-desktop`');
  } else {
    for (const [agent, when] of entries) {
      console.log(`  ${bold(agent.padEnd(16))} ${dim(when)}`);
    }
  }
  return 0;
}

function maskKey(key: string): string {
  if (key.length <= 12) return '*'.repeat(key.length);
  return `${key.slice(0, 11)}…${key.slice(-4)}`;
}
