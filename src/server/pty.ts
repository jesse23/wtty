import { type PtyProcess, spawn as spawnPty } from '../pty';

export function spawnPtyForSession(cols: number, rows: number): PtyProcess {
  const shell =
    process.platform === 'win32'
      ? (process.env.COMSPEC ?? 'cmd.exe')
      : (process.env.SHELL ?? '/bin/bash');
  return spawnPty(shell, cols, rows);
}
