import { loadConfig } from '../config.js';
import { probeApi, probeMcp } from '../api.js';
import { heading, ok, fail, info, warn } from '../ui.js';

/**
 * `hackgent doctor` — runs a small battery of health checks so a user can
 * tell at a glance whether their environment is misconfigured (no key,
 * stale URL, firewall blocking outbound HTTPS, etc.) before blaming the
 * agent.
 */

export async function runDoctor(): Promise<number> {
  heading('hackgent doctor');

  const cfg = loadConfig();

  if (!cfg.apiKey) {
    warn('No API key configured. Run `hackgent login` first.');
  } else {
    ok('API key present locally.');
  }

  const apiResult = await probeApi();
  if (apiResult.ok) {
    ok(apiResult.message);
  } else {
    fail(apiResult.message);
  }

  const mcpResult = await probeMcp(cfg.apiKey);
  if (mcpResult.ok) {
    ok(mcpResult.message);
  } else {
    fail(mcpResult.message);
  }

  const everythingOk = Boolean(cfg.apiKey) && apiResult.ok && mcpResult.ok;
  if (everythingOk) {
    info('All checks passed. You are ready to connect an agent.');
    return 0;
  }
  info('Fix the failures above and re-run `hackgent doctor`.');
  return 1;
}
