/**
 * Defaults the CLI ships with. Every value is overridable via env so a user
 * pointing at a self-hosted HACKGENT instance can do so without rebuilding.
 *
 *   HACKGENT_MCP_URL   -> URL the agent's MCP client connects to
 *   HACKGENT_API_URL   -> dashboard / REST API origin (used by `login`/`doctor`)
 *   HACKGENT_DASHBOARD -> human-facing dashboard URL the `login` command opens
 */

/**
 * Live deployment shape:
 *   - Caddy strips `/mcp/*` before proxying to the mcp-server upstream,
 *     which exposes its tool endpoint at `/mcp` internally. So the
 *     external URL the agent talks to is `https://<host>/mcp/mcp`.
 *   - Caddy strips `/api/*` before proxying to the api upstream, which
 *     exposes `/health` and other routes from `/`.
 *   - The dashboard app is mounted at `/app/*`. Until the web Next.js
 *     app sets `basePath: '/app'`, the bare landing `Connect Wallet`
 *     CTA may 404 on subroutes; we still link the dashboard root,
 *     which is the path users most often need.
 */
export const DEFAULT_MCP_URL = 'https://sandbox.hackgent.xyz/mcp/mcp';
export const DEFAULT_API_URL = 'https://sandbox.hackgent.xyz/api';
export const DEFAULT_DASHBOARD_URL = 'https://sandbox.hackgent.xyz/app/';

export const MCP_URL = process.env.HACKGENT_MCP_URL ?? DEFAULT_MCP_URL;
export const API_URL = process.env.HACKGENT_API_URL ?? DEFAULT_API_URL;
export const DASHBOARD_URL = process.env.HACKGENT_DASHBOARD ?? DEFAULT_DASHBOARD_URL;

/**
 * Backend hashes API keys with argon2, so the CLI never sees the plaintext
 * after first paste. This regex matches the issued shape (`hgent_live_` plus
 * a 32-char base62-ish suffix). It's intentionally lenient on the suffix
 * alphabet to avoid false negatives if the issuer encoding is tweaked.
 */
export const API_KEY_REGEX = /^hgent_live_[A-Za-z0-9]{16,}$/;

export const MCP_SERVER_NAME = 'hackgent';

export const SUPPORTED_AGENTS = ['claude-desktop', 'cursor', 'raw'] as const;
export type AgentName = (typeof SUPPORTED_AGENTS)[number];
