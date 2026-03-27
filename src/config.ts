import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface Theme {
  background?: string;
  foreground?: string;
  cursor?: string;
  selection?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  purple?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightPurple?: string;
  brightCyan?: string;
  brightWhite?: string;
}

export type RightClickBehavior = 'default' | 'copyPaste';

export interface Config {
  /** HTTP listen port; env `PORT` takes precedence. */
  port: number;
  /** Bind address; use `"0.0.0.0"` for remote access. */
  host: string;
  /** Shell for new sessions. */
  shell: string;
  /** `$TERM` env var passed to the shell. Fixed to `xterm-256color` — the PTY child talks to webtty, not to the parent terminal. */
  term: string;
  /** `$COLORTERM` env var passed to the shell. */
  colorTerm: string;
  /** PTY history buffer in bytes; used for server-side replay on reload/reconnect. */
  scrollback: number;
  /** Initial terminal width in columns. */
  cols: number;
  /** Initial terminal height in rows. */
  rows: number;
  /** Font size in px. */
  fontSize: number;
  /** CSS font-family stack. */
  fontFamily: string;
  /** Default cursor shape. Apps override at runtime via DECSCUSR — this is the startup default only. */
  cursorStyle: 'block' | 'bar' | 'underline';
  /** Default blink state. Apps override at runtime via DECSCUSR — this is the startup default only. */
  cursorStyleBlink: boolean;
  /** Auto-copy selection to clipboard on mouseup (kitty / Windows Terminal style). */
  copyOnSelect: boolean;
  /** `"copyPaste"` copies selection + clears it on right-click if selection exists; `"default"` always shows native context menu. */
  rightClickBehavior: RightClickBehavior;
  /** Mouse wheel scroll speed multiplier for apps with mouse tracking. `1` = one SGR per tick. Values `< 1` reduce rate; values `> 1` send multiple SGRs per tick. Must be `> 0`. */
  mouseScrollSpeed: number;
  /** Write server stdout/stderr to `~/.config/webtty/server.log`. Appends on each start. */
  logs: boolean;
  /** Terminal color palette. */
  theme: Theme;
}

export function configDir(): string {
  return path.join(process.env.HOME ?? os.homedir(), '.config', 'webtty');
}

function getConfigPath(): string {
  return path.join(configDir(), 'config.json');
}

export const DEFAULT_THEME: Theme = {
  background: '#000000',
  foreground: '#CCCCCC',
  cursor: '#FFFFFF',
  selection: '#FFFFFF',
  black: '#0C0C0C',
  red: '#C50F1F',
  green: '#13A10E',
  yellow: '#C19C00',
  blue: '#0037DA',
  purple: '#881798',
  cyan: '#3A96DD',
  white: '#CCCCCC',
  brightBlack: '#767676',
  brightRed: '#E74856',
  brightGreen: '#16C60C',
  brightYellow: '#F9F1A5',
  brightBlue: '#3B78FF',
  brightPurple: '#B4009E',
  brightCyan: '#61D6D6',
  brightWhite: '#F2F2F2',
};

export const DEFAULT_CONFIG: Config = {
  port: 2346,
  host: '127.0.0.1',
  shell:
    process.platform === 'win32'
      ? (process.env.COMSPEC ?? 'cmd.exe')
      : (process.env.SHELL ?? '/bin/bash'),
  term: 'xterm-256color',
  colorTerm: 'truecolor',
  scrollback: 256 * 1024,
  cols: 80,
  rows: 24,
  fontSize: 13,
  fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  cursorStyle: 'bar',
  cursorStyleBlink: true,
  copyOnSelect: true,
  rightClickBehavior: 'default' as RightClickBehavior,
  mouseScrollSpeed: 1,
  logs: false,
  theme: DEFAULT_THEME,
};

export function loadConfig(): Config {
  if (!fs.existsSync(getConfigPath())) {
    try {
      saveConfig(DEFAULT_CONFIG);
    } catch (err) {
      console.warn(
        `webtty: failed to write default config to ${getConfigPath()}: ${(err as Error).message}`,
      );
      return { ...DEFAULT_CONFIG };
    }
  }

  let raw: string;
  try {
    raw = fs.readFileSync(getConfigPath(), 'utf8');
  } catch (err) {
    throw new Error(
      `webtty: failed to read config at ${getConfigPath()}: ${(err as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`webtty: invalid JSON in config file ${getConfigPath()}`);
  }

  const p = parsed as Partial<Config>;
  return {
    ...DEFAULT_CONFIG,
    ...(typeof p.port === 'number' && { port: p.port }),
    ...(typeof p.host === 'string' && { host: p.host }),
    ...(typeof p.shell === 'string' && { shell: p.shell }),
    ...(typeof p.term === 'string' && { term: p.term }),
    ...(typeof p.colorTerm === 'string' && { colorTerm: p.colorTerm }),
    ...(typeof p.scrollback === 'number' && { scrollback: p.scrollback }),
    ...(typeof p.cols === 'number' && { cols: p.cols }),
    ...(typeof p.rows === 'number' && { rows: p.rows }),
    ...(typeof p.fontSize === 'number' && { fontSize: p.fontSize }),
    ...(typeof p.fontFamily === 'string' && { fontFamily: p.fontFamily }),
    ...(typeof p.cursorStyle === 'string' &&
      (p.cursorStyle === 'block' || p.cursorStyle === 'bar' || p.cursorStyle === 'underline') && {
        cursorStyle: p.cursorStyle,
      }),
    ...(typeof p.cursorStyleBlink === 'boolean' && { cursorStyleBlink: p.cursorStyleBlink }),
    ...(typeof p.copyOnSelect === 'boolean' && { copyOnSelect: p.copyOnSelect }),
    ...(typeof p.rightClickBehavior === 'string' && {
      rightClickBehavior: (p.rightClickBehavior === 'copyPaste'
        ? 'copyPaste'
        : 'default') as RightClickBehavior,
    }),
    ...(typeof p.mouseScrollSpeed === 'number' &&
      p.mouseScrollSpeed > 0 && { mouseScrollSpeed: p.mouseScrollSpeed }),
    ...(typeof p.logs === 'boolean' && { logs: p.logs }),
    ...(p.theme && typeof p.theme === 'object' && { theme: { ...DEFAULT_THEME, ...p.theme } }),
  };
}

export function saveConfig(_config: Config): void {
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
  const content = JSON.stringify(
    {
      port: DEFAULT_CONFIG.port,
      host: DEFAULT_CONFIG.host,
    },
    null,
    2,
  );
  fs.writeFileSync(getConfigPath(), content, 'utf8');
}
