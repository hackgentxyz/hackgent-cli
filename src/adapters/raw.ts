import { MCP_SERVER_NAME, MCP_URL } from '../constants.js';

/**
 * Raw "no-op" adapter. Prints the snippet a user can paste into any
 * MCP-aware client we don't have a first-class adapter for. No filesystem
 * mutation; this is intentional so users can preview what `connect` would
 * write before running it for real.
 */

export interface RawOptions {
  apiKey: string;
  mcpUrl?: string;
}

export function renderRawSnippet(opts: RawOptions): string {
  const mcpUrl = opts.mcpUrl ?? MCP_URL;
  const block = {
    mcpServers: {
      [MCP_SERVER_NAME]: {
        url: mcpUrl,
        headers: { Authorization: `Bearer ${opts.apiKey}` },
      },
    },
  };
  return JSON.stringify(block, null, 2);
}
