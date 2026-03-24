# SPEC: Client

**Author:** jesse23
**Last Updated:** 2026-03-24

---

## Description

The webtty browser client is served by the webtty server and runs entirely in the browser. It has two surfaces: a terminal view (full-viewport, one session per tab) and a session manager (list, create, open, kill sessions, and control the server).

The client has no build step in the initial slices — plain HTML + `<script type="module">` importing `ghostty-web` assets served by the server itself. A bundler can be introduced later if the client grows beyond a handful of files.

**Why ghostty-web over xterm.js?** ghostty-web is the reference implementation for this project, already available locally, and shares the same `Terminal` / `FitAddon` API shape as xterm.js. xterm.js is the safer long-term bet (wider ecosystem, VS Code backing) but ghostty-web is sufficient for the initial slices and avoids an early dependency decision.

**Why no framework (React/Vue) yet?** The session manager is simple enough (a table + buttons) that a framework adds more complexity than it removes. Revisit when the client grows.

## Page

`GET /s/:id` returns a full-viewport HTML page. It:

- Initialises a `ghostty-web` `Terminal` with config values (cols, rows, fontSize, fontFamily, cursorBlink, scrollback, theme) injected server-side at render time
- Connects to `ws://<host>/ws/:id?cols=<cols>&rows=<rows>` over WebSocket
- Fits the terminal to the viewport and observes resize events via `FitAddon`
- Sends a `{ type: 'resize', cols, rows }` JSON message on open and on every terminal resize
- Forwards all keystrokes to the PTY via `term.onData`

## Welcome Banner

On the first WebSocket connection to a session (no existing PTY), the server writes a banner to the terminal:

```
╔══════════════════════════════════════════════════════╗
║                                                      ║
║ [ webtty ]   Terminal UI in the browser              ║
║                                                      ║
║ Run `bunx webtty help` for more information.         ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

- `[ webtty ]` — dim brackets, bold yellow name
- Slogan — dim
- Help command — dim italic surroundings, foreground italic for the command itself
- Package runner (`bunx` or `npx`) is detected from the server's runtime at startup

## Status Messages

All status messages written to the terminal share a consistent style:

```
[ webtty ] <message>
```

- `[ webtty ]` — dim brackets, bold yellow name (matches banner)
- Message — dim italic

| Event | Message | Behavior |
|-------|---------|----------|
| WS close `4001` (session deleted / shell exited) | `Session removed.` | `window.close()` after 500ms |
| WS close `1001` (server stopped) | `Server stopped.` | `window.close()` after 500ms |
| WS close (unexpected) | `Connection lost. Reconnecting in 2s...` | Reconnect after 2s |
| WS error | `WebSocket error.` | — |

## Behavior Notes

### Tab close on session end

When a session ends (shell exits → WS close code `4001`) or the server stops (`webtty stop` / SIGINT → WS close code `1001`), the client calls `window.close()` after 500 ms to close the tab automatically.

**Browser restriction**: `window.close()` is only permitted on tabs that were opened programmatically via `window.open()`, or duplicated from such a tab. Tabs opened by the OS (`open`/`xdg-open`) or by the user typing a URL directly are treated as unowned — `window.close()` is silently ignored. In practice:

- Tabs opened by `webtty run` and tabs duplicated from them → close automatically ✅
- Tabs opened by manually navigating to the server URL → display the status message but remain open ⚠️

This is a browser-enforced security restriction with no JS workaround.

## Features

| Feature | Description | ADR | Done? |
|---------|-------------|-----|-------|
| Terminal view | Full-viewport terminal using `ghostty-web`, auto-fit, reconnect on disconnect | [001](../adrs/001.webtty.bootstrap.md) | ✅ |
| Session support | `<url>/s/:id` opens a named session; `<url>` redirects to the last-used session or creates `main` if none exists | [ADR 005](../adrs/005.client.session-support.md) | ✅ |
| Welcome banner | Shown on first connection to a session; identifies app, slogan, and help command | [ADR 010](../adrs/010.client.ux-polish.md) | ✅ |
| Status messages | Consistent `[ webtty ]`-prefixed dim italic messages for disconnect, error, and server stop events | [ADR 010](../adrs/010.client.ux-polish.md) | ✅ |
