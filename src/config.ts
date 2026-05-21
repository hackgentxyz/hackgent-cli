import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

/**
 * Persistent CLI config — single JSON file holding the user's API key and
 * any per-agent metadata `connect` has written. Stored under the user's home
 * dir so it survives across shells but is not shared between OS accounts.
 *
 * Path:
 *   Windows: %APPDATA%\hackgent\config.json (falls back to ~/.hackgent if
 *            APPDATA is missing)
 *   POSIX:   ~/.hackgent/config.json
 *
 * The file is written with 0600 permissions on POSIX. Windows ignores chmod
 * but the file still lives in the per-user roaming profile so isolation is
 * provided by NTFS ACLs.
 */

export interface CliConfig {
  /** API key issued by the dashboard, shape: `hgent_live_<...>` */
  apiKey?: string;
  /** Optional override of the MCP URL written into agent configs. */
  mcpUrl?: string;
  /** Wallet address loosely associated with the API key (display only). */
  walletAddress?: string;
  /** Map of agent name → ISO timestamp of last successful `connect`. */
  connectedAgents?: Record<string, string>;
}

function getConfigDir(): string {
  if (platform() === 'win32') {
    const appdata = process.env['APPDATA'];
    if (appdata && appdata.length > 0) {
      return join(appdata, 'hackgent');
    }
  }
  return join(homedir(), '.hackgent');
}

const CONFIG_DIR = getConfigDir();
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function loadConfig(): CliConfig {
  if (!existsSync(CONFIG_PATH)) {
    return {};
  }
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CliConfig;
    }
    return {};
  } catch {
    // Corrupted / unreadable config — return empty rather than crash. The
    // user can re-run `hackgent login` to overwrite cleanly.
    return {};
  }
}

export function saveConfig(config: CliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
  if (platform() !== 'win32') {
    try {
      chmodSync(CONFIG_PATH, 0o600);
    } catch {
      // best-effort; some filesystems (NFS, FAT) don't support chmod.
    }
  }
}

export function clearConfig(): void {
  if (existsSync(CONFIG_PATH)) {
    try {
      unlinkSync(CONFIG_PATH);
    } catch {
      // ignore — caller surfaces the failure if it matters.
    }
  }
}

export function recordAgentConnection(agent: string): void {
  const cfg = loadConfig();
  cfg.connectedAgents = cfg.connectedAgents ?? {};
  cfg.connectedAgents[agent] = new Date().toISOString();
  saveConfig(cfg);
}

export function recordAgentDisconnection(agent: string): void {
  const cfg = loadConfig();
  if (cfg.connectedAgents && agent in cfg.connectedAgents) {
    delete cfg.connectedAgents[agent];
    saveConfig(cfg);
  }
}
