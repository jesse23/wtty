# SPEC: CLI

**Author:** jesse23
**Last Updated:** 2026-03-24 (amended: help formatting, ls filter, restart removed, at/mv/up/down commands, isServerRunning validation, stop-on-last-rm)

---

## Description

The `webtty` CLI is a thin client that controls a running webtty server over HTTP. It handles two concerns: server lifecycle (start/stop the server) and session management (create/list/remove/rename sessions via the REST API).

The help output uses `webtty help` as the canonical entry point. `--help` is not advertised but still works. The description line and command table are formatted for scannability: slogan first, usage second; commands ordered by frequency of use; optional args use `[bracket]` style throughout.

The CLI communicates with the server exclusively over HTTP to localhost — no Unix sockets, no PID files, no process signals. Whether the server is running is determined by a single question: does `GET /api/sessions` respond? Connection refused means not running. This works identically on Mac, Linux, and Windows.

**Why HTTP over Unix socket?** webtty already speaks HTTP — reusing the same interface keeps the surface area minimal and makes the CLI trivially debuggable with `curl`. Unix sockets offer lower latency but the difference is imperceptible for CLI interactions.

**Why Commander.js?** Zero dependencies, 18ms startup, TypeScript-native, used by Vue CLI and Vite. Yargs and oclif are heavier and provide features (plugin systems, config files) that are unnecessary here.

**Why no PID file?** PID files require platform-specific signal handling (`SIGTERM` on Unix, `TerminateProcess` on Windows) and go stale if the server crashes. HTTP-only detection is simpler, cross-platform, and sufficient — the server owns its own shutdown via `POST /api/server/stop`.

## Commands

| Command | Description |
|---------|-------------|
| `webtty at [id]` | Start server if not running; attach to session (creates if new, reuses if exists); open in browser. Aliases: `a`, `attach` |
| `webtty ls [id]` | `GET /api/sessions` — list sessions; if `[id]` given, filter by substring match. Alias: `list` |
| `webtty rm [id]` | `DELETE /api/sessions/:id` — destroy session and its PTY; stops server if last session. Alias: `remove` |
| `webtty mv [id] [new-id]` | `PATCH /api/sessions/:id` — rename a session. Aliases: `move`, `rename` |
| `webtty stop` | `POST /api/server/stop` — server cleans up and exits. Alias: `down` |
| `webtty start` | Fork server, wait for `GET /api/sessions` to respond |
| `webtty` | No-arg entry point — start server if not running, then delegate to `webtty at main` |
| `webtty config` | Open `~/.config/webtty/config.json` in `$VISUAL` (falls back to `$EDITOR`, then `vi` on Unix / `notepad` on Windows) |
| `webtty help` | Show help — all commands |

## No-arg entry point

`webtty` with no arguments:

1. Start the server if not already running
2. Delegate to `webtty at main` — create or reuse the `main` session and open it in the browser

This is the canonical quickstart: `npx webtty` or `bunx webtty` goes from zero to a browser terminal in one command.

## Help command

`webtty help` prints all commands. The `-h` / `--help` flag is not advertised but still works if users reach for it.

This makes the welcome banner's call-to-action (`Run \`bunx webtty help\` for more information.`) functional.

## Config command

`webtty config` opens `~/.config/webtty/config.json` in the user's preferred editor:

1. Resolve editor: `$VISUAL` → `$EDITOR` → `vi` (Unix) / `notepad` (Windows)
2. Ensure the config file exists (first-run write happens on server startup, but `webtty config` may run before the server has ever started)
3. Spawn the editor with the config path, inheriting stdio so the terminal is fully handed off

The command exits when the editor exits.

## Features

| Feature | Description | ADR | Done? |
|---------|-------------|-----|-------|
| Server lifecycle | `webtty start` / `stop` — fork, detect, and terminate the server over HTTP | [ADR 002](../adrs/002.cli.start-stop.md) | ✅ |
| Session management | `webtty at` / `ls` / `rm` / `mv` — attach, list, destroy, and rename sessions via the REST API | [ADR 006](../adrs/006.cli.session-management.md) | ✅ |
| No-arg entry point | `webtty` — start server + open `main` session in browser | [ADR 011](../adrs/011.cli.config-and-help.md) | ✅ |
| Help command | `webtty help` — show all commands | [ADR 011](../adrs/011.cli.config-and-help.md) | ✅ |
| Config command | `webtty config` — open config file in `$EDITOR` | [ADR 011](../adrs/011.cli.config-and-help.md) | ✅ |
| Help formatting | Description first, USAGE/COMMANDS all-caps, aligned params, frequency-ordered commands | [ADR 011](../adrs/011.cli.config-and-help.md) | ✅ |
| `ls` filter | `webtty ls [id]` — substring filter on session id, client-side | [ADR 011](../adrs/011.cli.config-and-help.md) | ✅ |
| Stop on last rm | `webtty rm` stops the server automatically when the last session is removed | [ADR 011](../adrs/011.cli.config-and-help.md) | ✅ |
| isServerRunning validation | `GET /api/sessions` response validated as JSON array — rejects non-webtty processes on same port | [ADR 011](../adrs/011.cli.config-and-help.md) | ✅ |
