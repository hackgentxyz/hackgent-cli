import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { MCP_SERVER_NAME, MCP_URL } from '../constants.js';
import { backupFile, ensureObject, readJsonFile, writeJsonFile } from './json-config.js';
import type { AdapterResult } from './claude-desktop.js';

/**
 * Cursor adapter.
 *
 * Cursor reads MCP config from `~/.cursor/mcp.json`. Schema mirrors Claude
 * Desktop's `mcpServers` map, with native HTTP MCP support from late 2024
 * onwards — so we can use the `url` + `headers` form directly instead of
 * round-tripping via `mcp-remote`.
 *
 *   "hackgent": {
 *     "url": "<MCP_URL>",
 *     "headers": { "Authorization": "Bearer <key>" }
 *   }
 *
 * Older Cursor builds will still accept the npx-mcp-remote shim if Cursor
 * upstream changes shape; for now we ship the modern form because every
 * actively-released Cursor build supports it.
 */

export interface CursorOptions {
  apiKey: string;
  mcpUrl?: string;
}

function getCursorConfigPath(): string {
  return join(homedir(), '.cursor', 'mcp.json');
}

export function connectCursor(opts: CursorOptions): AdapterResult {
  const configPath = getCursorConfigPath();
  const mcpUrl = opts.mcpUrl ?? MCP_URL;

  const existed = existsSync(configPath);
  const backupPath = existed ? backupFile(configPath) : null;
  const json = readJsonFile(configPath);
  const servers = ensureObject(json, 'mcpServers');

  const previous = servers[MCP_SERVER_NAME];
  servers[MCP_SERVER_NAME] = {
    url: mcpUrl,
    headers: { Authorization: `Bearer ${opts.apiKey}` },
  };

  writeJsonFile(configPath, json);

  return {
    configPath,
    backupPath,
    alreadyConfigured: previous !== undefined,
  };
}

export function disconnectCursor(): { configPath: string; removed: boolean } {
  const configPath = getCursorConfigPath();
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
