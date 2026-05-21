import prompts from 'prompts';
import { API_KEY_REGEX, DASHBOARD_URL } from '../constants.js';
import { loadConfig, saveConfig } from '../config.js';
import { ok, info, fail, heading, dim, cyan } from '../ui.js';

/**
 * Login flow B (per user spec): the CLI does not run an OAuth dance. We
 * point the user at the dashboard, they paste the API key the dashboard
 * displayed once, we persist it locally. This avoids any new backend
 * endpoint and keeps the CLI flow as small as the rest of the codebase.
 *
 *   1. Open the dashboard URL (informational; we don't auto-launch a
 *      browser to keep the CLI friendly to headless and remote shells).
 *   2. Prompt the user to paste their `hgent_live_*` key.
 *   3. Validate shape, store under ~/.hackgent/config.json (or %APPDATA%).
 */

export interface LoginOptions {
  apiKey?: string;
  /** When true, skip the prompt — used by `hackgent login --api-key=...`. */
  nonInteractive?: boolean;
}

export async function runLogin(opts: LoginOptions = {}): Promise<number> {
  heading('Login to HACKGENT');
  info(`Open the dashboard, generate or copy your API key:`);
  console.log(`  ${cyan(DASHBOARD_URL)}`);
  console.log(dim('  (Connect your wallet → "API Key" → copy the `hgent_live_…` value)'));
  console.log();

  let apiKey = opts.apiKey;

  if (!apiKey && opts.nonInteractive) {
    fail('No API key supplied. Pass `--api-key` or run without `--non-interactive`.');
    return 1;
  }

  if (!apiKey) {
    const answer = await prompts(
      {
        type: 'password',
        name: 'apiKey',
        message: 'Paste your API key',
        validate: (value: string) => {
          if (!value || value.length === 0) return 'API key is required';
          if (!API_KEY_REGEX.test(value.trim())) {
            return 'Expected format: hgent_live_<alphanumeric>';
          }
          return true;
        },
      },
      {
        onCancel: () => {
          /* swallow — we surface a single failure line below. */
        },
      },
    );
    apiKey = typeof answer['apiKey'] === 'string' ? answer['apiKey'].trim() : undefined;
  }

  if (!apiKey || !API_KEY_REGEX.test(apiKey)) {
    fail('Login cancelled — no valid API key supplied.');
    return 1;
  }

  const cfg = loadConfig();
  cfg.apiKey = apiKey;
  saveConfig(cfg);

  ok('API key saved to local config.');
  info('Next: connect an agent — `hackgent connect --agent claude-desktop`');
  return 0;
}
