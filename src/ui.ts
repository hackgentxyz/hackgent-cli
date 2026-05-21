import kleur from 'kleur';

/**
 * Tiny output helpers. Keep behaviour identical across commands so users see
 * a consistent visual language: green check = success, red cross = failure,
 * yellow ! = warning, dim arrow = informational/secondary line.
 */

export const ok = (msg: string): void => {
  console.log(`${kleur.green('✓')} ${msg}`);
};

export const fail = (msg: string): void => {
  console.error(`${kleur.red('✗')} ${msg}`);
};

export const warn = (msg: string): void => {
  console.log(`${kleur.yellow('!')} ${msg}`);
};

export const info = (msg: string): void => {
  console.log(`${kleur.dim('→')} ${msg}`);
};

export const heading = (msg: string): void => {
  console.log();
  console.log(kleur.bold(msg));
};

export const dim = (msg: string): string => kleur.dim(msg);
export const bold = (msg: string): string => kleur.bold(msg);
export const cyan = (msg: string): string => kleur.cyan(msg);
export const green = (msg: string): string => kleur.green(msg);
export const yellow = (msg: string): string => kleur.yellow(msg);
export const red = (msg: string): string => kleur.red(msg);
