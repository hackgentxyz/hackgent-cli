import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Shared helpers for agent adapters that mutate a JSON config file.
 *
 * Adapters all do the same dance: read existing JSON (tolerate missing file
 * or empty file), patch a nested `mcpServers.<name>` block, write back.
 * Centralising the IO + back-up logic here keeps each adapter narrow and
 * testable.
 */

export interface JsonObject {
  [key: string]: unknown;
}

export function readJsonFile(filePath: string): JsonObject {
  if (!existsSync(filePath)) {
    return {};
  }
  const raw = readFileSync(filePath, 'utf8').trim();
  if (raw.length === 0) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    throw new Error('config root must be a JSON object');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse ${filePath}: ${reason}`);
  }
}

/**
 * Backup the file alongside itself with a `.hackgent-backup-<timestamp>`
 * suffix before overwriting. Lossy edits in someone else's agent config
 * are exactly the kind of thing users never forgive a CLI for.
 */
export function backupFile(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${filePath}.hackgent-backup-${stamp}`;
  copyFileSync(filePath, backup);
  return backup;
}

export function writeJsonFile(filePath: string, value: JsonObject): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

/**
 * Get an object child by key, creating it if missing. Throws if the slot
 * exists but is not an object — refusing to clobber a user's deliberately
 * non-object value.
 */
export function ensureObject(parent: JsonObject, key: string): JsonObject {
  const current = parent[key];
  if (current === undefined || current === null) {
    const next: JsonObject = {};
    parent[key] = next;
    return next;
  }
  if (typeof current !== 'object' || Array.isArray(current)) {
    throw new Error(`Existing \`${key}\` is not an object; refusing to overwrite.`);
  }
  return current as JsonObject;
}
