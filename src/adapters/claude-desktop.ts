import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { MCP_SERVER_NAME, MCP_URL } from '../constants.js';
import { backupFile, ensureObject, readJsonFile, writeJsonFile } from './json-config.js';

/**
 * Claude Desktop adapter.
 *
 * Config file lives at one of:
 *   macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
 *   Windows: %APPDATA%\Claude\claude_desktop_config.json
 *   Linux:   ~/.config/Claude/claude_desktop_config.json
 *
 * The official MCP integration in Claude Desktop drives stdio servers via a
 * `command`/`args` block. Streamable HTTP MCP servers (which HACKGENT speaks)
 * are reached through the `mcp-remote` shim distributed on npm — that's the
 * vendor-recommended bridge until Claude Desktop ships native HTTP MCP.
 *
 *   "hackgent": {
 *     "command": "npx",
 *     "args": ["-y", "mcp-remote", "<MCP_URL>", "--header", "Authorization: Bearer <key>"]
 *   }
 */

export interface ClaudeDesktopOptions {
  apiKey: string;
  mcpUrl?: string;
}

function getClaudeDesktopConfigPath(): string {
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32': {
      const appdata = process.env['APPDATA'] ?? join(home, 'AppData', 'Roaming');
      return join(appdata, 'Claude', 'claude_desktop_config.json');
    }
    default:
      return join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }
}

export interface AdapterResult {
  configPath: string;
  backupPath: string | null;
  alreadyConfigured: boolean;
}

export function connectClaudeDesktop(opts: ClaudeDesktopOptions): AdapterResult {
  const configPath = getClaudeDesktopConfigPath();
  const mcpUrl = opts.mcpUrl ?? MCP_URL;

  const existed = existsSync(configPath);
  const backupPath = existed ? backupFile(configPath) : null;
  const json = readJsonFile(configPath);
  const servers = ensureObject(json, 'mcpServers');

  const previous = servers[MCP_SERVER_NAME];
  servers[MCP_SERVER_NAME] = buildClaudeDesktopBlock(mcpUrl, opts.apiKey);

  writeJsonFile(configPath, json);

  return {
    configPath,
    backupPath,
    alreadyConfigured: previous !== undefined,
  };
}

export function disconnectClaudeDesktop(): { configPath: string; removed: boolean } {
  const configPath = getClaudeDesktopConfigPath();
  if (!existsSync(configPath)) {
    return { configPath, removed: false };
  }
  const json = readJsonFile(configPath);
  const servers = json['mcpServers'];
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    return { configPath, removed: false };
  }
  const obj = servers as Record<string, unknown>;
  if (!(MCP_SERVER_NAME in obj)) {
    return { configPath, removed: false };
  }
  backupFile(configPath);
  delete obj[MCP_SERVER_NAME];
  writeJsonFile(configPath, json);
  return { configPath, removed: true };
}

function buildClaudeDesktopBlock(mcpUrl: string, apiKey: string): Record<string, unknown> {
  return {
    command: 'npx',
    args: ['-y', 'mcp-remote', mcpUrl, '--header', `Authorization: Bearer ${apiKey}`],
  };
}
