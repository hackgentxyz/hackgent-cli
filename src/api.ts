import { API_URL, MCP_URL } from './constants.js';

/**
 * Lightweight HTTP probes used by `doctor` and `connect --verify`. We use
 * Node 18+ global `fetch`, no third-party HTTP client needed.
 *
 * Both probes intentionally swallow network errors and return a structured
 * verdict so the calling command can render a friendly checklist instead of
 * a stack trace.
 */

export interface ProbeResult {
  ok: boolean;
  status?: number;
  message: string;
}

const PROBE_TIMEOUT_MS = 5_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hit the API health endpoint to confirm the dashboard backend is reachable
 * from this machine. The `/health` path is provided by `apps/api` and never
 * requires auth.
 */
export async function probeApi(): Promise<ProbeResult> {
  const url = `${API_URL.replace(/\/+$/, '')}/health`;
  try {
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      return { ok: true, status: res.status, message: `API reachable at ${url}` };
    }
    return {
      ok: false,
      status: res.status,
      message: `API returned ${res.status} at ${url}`,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `API unreachable (${reason}) at ${url}` };
  }
}

/**
 * Hit the MCP endpoint with a JSON-RPC `tools/list` POST. The mcp-server
 * speaks Streamable HTTP and only accepts POST at the tool path; GET
 * requests return 404 even on a healthy host. Probing with the real RPC
 * shape avoids false positives where a 4xx-but-wrong-path looked OK.
 *
 * Verdicts:
 *   401/403         → host + path correct, key missing or rejected
 *   200             → host + path correct, key accepted (we don't try to
 *                     parse the streamable response body, just status)
 *   404             → wrong path; usually means the deployment routes
 *                     `/mcp/*` differently than the CLI default expects
 *   5xx / network   → upstream down or unreachable
 */
export async function probeMcp(apiKey: string | undefined): Promise<ProbeResult> {
  const url = MCP_URL;
  const probeBody = JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/list',
    id: 1,
  });
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const res = await fetchWithTimeout(url, { method: 'POST', headers, body: probeBody });

    if (res.status === 200) {
      return { ok: true, status: 200, message: `MCP reachable at ${url}` };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        status: res.status,
        message: apiKey
          ? `MCP rejected key (HTTP ${res.status}). Re-run \`hackgent login\` with a fresh key.`
          : `MCP requires authentication (HTTP ${res.status}). Run \`hackgent login\` first.`,
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        message: `MCP path not found at ${url}. Override with HACKGENT_MCP_URL if your deployment routes differently.`,
      };
    }
    return {
      ok: false,
      status: res.status,
      message: `MCP returned HTTP ${res.status} at ${url}`,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `MCP unreachable (${reason}) at ${url}` };
  }
}
