# SPEC: Deep Link

**Last Updated:** 2026-04-05 (amended: 3rd party integration section)

---

## Description

Deep link support lets users open a specific webtty session directly from a URL — in a notification, a shell alias, a script, or a hyperlink. The behavior mirrors what iTerm2 and Alacritty offer via macOS URL scheme handlers (`iterm2://`, `x-alacritty://`): clicking a link starts the app if not running, and navigates to the right session.

**Target platform:** macOS (primary). Linux (`xdg-open`) and Windows (`start`) are included since `openBrowser` already abstracts those; the focus-existing-tab mechanic is browser-dependent but works on all platforms.

## URL Scheme

webtty uses an `http://` URL directly — no custom OS-level URL scheme registration needed:

```
http://127.0.0.1:<PORT>/s/<session-id>
```

`webtty go <id>` already opens this URL. The new behavior is what happens **inside the browser** when that URL is opened a second time: if a tab for that session is already open, focus it rather than opening a duplicate.

## Focus-Existing-Tab Behavior

### Problem

`openBrowser(url)` always spawns a new tab on macOS (`open <url>`). If `/s/my-session` is already open in a tab, the user ends up with two identical tabs.

### Solution: BroadcastChannel focus handshake

Each session tab listens on a `BroadcastChannel` named `webtty:focus:<session-id>`. When a new navigation lands on `/s/<id>`, the page checks — before fully mounting the terminal — whether another tab already owns that session:

1. **New tab loads** `/s/my-session`
2. It posts `{ type: 'focus-request', sessionId: 'my-session' }` on `webtty:focus:my-session`
3. Any **existing tab** for the same session receives the message and calls `window.focus()` + `document.title` ping to bring itself forward
4. The existing tab replies with `{ type: 'focus-ack' }`
5. The **new tab**, on receiving `focus-ack` within 200 ms, closes itself (`window.close()`)
6. If no `focus-ack` arrives within 200 ms, the new tab proceeds to mount the terminal normally (it _is_ the first tab)

### Why BroadcastChannel

- Same-origin, no server round-trip
- Works in all modern browsers (Chrome, Firefox, Safari ≥ 15.4)
- No persistent state — the channel is ephemeral per tab lifetime
- `window.focus()` is permitted when called from within a message handler that is itself a response to user action or cross-tab coordination (not blocked as a pop-up)

### Limitations

- **`window.close()` only works if the tab was opened by script** (i.e. via `window.open()`). `open <url>` on macOS opens a new top-level tab that the browser does not consider "script-opened", so `window.close()` will be a no-op in that case.
- Workaround: instead of closing, the new tab **redirects** to a `/s/<id>/focus` stub page that shows a "Session already open in another tab — you can close this tab" message, or simply redirects back to the existing tab's URL (which the existing tab already focused).
- `window.focus()` behavior varies by browser and OS focus-stealing policy. On macOS + Chrome/Safari, cross-tab `window.focus()` typically raises the window but may not switch tabs without user permission. This is a known browser security constraint — no workaround exists without a native helper.

## CLI Integration

`webtty go <id>` behavior is unchanged at the CLI level. The focus-existing-tab logic is entirely client-side (browser tab), triggered by the normal `http://...` URL open.

No new CLI command is introduced. The feature is transparent: `webtty go my-session` always works, and the browser handles deduplication.

## Server Changes

None. The server already serves `/s/:id` and the WebSocket endpoint. No new endpoints are needed.

## Client Changes

Two new behaviors in `src/client/index.ts`:

### 1. Focus responder (existing tabs)

On page load, register a `BroadcastChannel` listener for `webtty:focus:<sessionId>`:

```
channel.onmessage = (e) => {
  if (e.data.type === 'focus-request') {
    window.focus();
    channel.postMessage({ type: 'focus-ack' });
  }
};
```

### 2. Focus initiator (new tab)

On page load, before mounting the terminal, post a focus-request and wait up to 200 ms for an ack:

```
channel.postMessage({ type: 'focus-request', sessionId });
// wait 200ms — if focus-ack received → show "already open" UI; else → mount terminal
```

If ack received: display a minimal fallback UI ("Session is open in another tab") rather than mounting a second terminal to the same PTY. The tab does not auto-close (browser restriction), but the existing tab has already been focused.

## 3rd Party Integration

Tools like [Vibe Island](https://vibeisland.app) sit in the macOS notch and monitor AI coding agents (Claude Code, OpenCode, Gemini CLI, Cursor, etc.), sending notifications when tasks complete and letting users jump to the right terminal tab with one click.

### How these tools work

The integration model varies by tool:

| Tool | Integration mechanism |
|------|-----------------------|
| Claude Code | Hook entries written to `~/.claude/settings.json`; events sent over a local Unix socket bridge |
| Cursor | Hook entries written to `~/.cursor/hooks.json`; tab focus via a bundled VSIX extension |
| Gemini CLI | Hook entries written to `~/.gemini/settings.json`; Unix socket bridge |
| **OpenCode** | **HTTP SSE event stream** — no hook injection; Vibe Island polls OpenCode's REST/SSE API directly |

webtty's position is closest to **OpenCode**: it already exposes an HTTP server with a REST API (`/api/sessions`) and WebSocket connections. No Unix socket bridge or config file injection is needed.

### How a tool like Vibe Island can integrate with webtty

**Discovery**: webtty advertises its running port via the same `PORT` env var / default `2346` convention. A third-party tool discovers a running webtty instance by polling `GET http://127.0.0.1:<PORT>/api/sessions` — the same check the CLI uses (`isServerRunning()`).

**Session listing**: `GET /api/sessions` returns all active sessions with `id`, `createdAt`, and `connected` (whether a WebSocket client is attached). This is sufficient for a notch UI to list running sessions.

**Real-time session events**: The WebSocket at `/ws/<session-id>` streams PTY output. A monitoring tool can connect to this endpoint to receive live output without affecting the user's terminal (multiple clients can attach to the same session; output is broadcast to all).

**Jump to session**: To focus a specific session, the tool opens `http://127.0.0.1:<PORT>/s/<session-id>` in the default browser. The BroadcastChannel focus handshake (described above) handles the focus-existing-tab behavior — the existing tab comes forward, and the new navigation shows the fallback UI instead of opening a duplicate terminal.

### What webtty needs to add for this to work

The REST API and WebSocket are already there. The only missing piece is the **BroadcastChannel focus handshake** (the core feature of this spec). Once that lands, third-party tools get jump-to-session for free by opening the session URL.

No new server endpoints, no config file protocol, no Unix socket bridge.

### macOS URL scheme (`webtty://`) — future path

iTerm2 registers `iterm2://` via `CFBundleURLTypes` in its app bundle's `Info.plist`, letting any app or notification open a terminal command directly. VS Code does the same with `vscode://`.

webtty ships as an npm CLI — there is no app bundle and therefore no `Info.plist`. A `webtty://` scheme would require an optional native helper shim (a small Electron or Swift app that registers the protocol and forwards to the local server). This is out of scope for this spec but is the natural next step for tighter OS-level notification integration.

The `http://127.0.0.1:PORT/s/<id>` URL is a fully functional substitute in the meantime: any tool can open it with `open <url>` (macOS), `xdg-open` (Linux), or `start` (Windows), and the focus handshake handles the rest.

### Summary: what third-party tools need to do

| Action | How |
|--------|-----|
| Discover running webtty | `GET http://127.0.0.1:2346/api/sessions` — 200 + JSON array means running |
| List sessions | Same endpoint — returns `[{ id, createdAt, connected }]` |
| Watch session output | WebSocket `ws://127.0.0.1:2346/ws/<id>?cols=80&rows=24` |
| Jump to session | `open http://127.0.0.1:2346/s/<id>` — BroadcastChannel focuses existing tab |
| Custom port | Respect `PORT` env var; default `2346` |

## Features

| Feature | Description | ADR | Done? |
|---------|-------------|-----|-------|
| Focus existing tab | When `webtty go <id>` opens a URL for an already-open session tab, the existing tab is focused and the new tab shows a fallback UI | — | ⬜ |
| 3rd party integration | Tools like Vibe Island can discover, monitor, and jump to webtty sessions via the existing REST API + BroadcastChannel focus handshake | — | ⬜ |
