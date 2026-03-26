# Awesome Web

A personal guide to living in the browser.

## Why the Browser

The browser is where you already spend your time. One window manager, sync across devices, no install friction. The web platform caught up — most apps you need actually run well in it now.

You don't need a native app for everything. Seriously. The browser handles email, documents, spreadsheets, code editing, terminals, and design tools. Pick a browser, set it up right, and you've got a complete computing environment that works on any device.

## Best Practices

### Browser Choice

Pick one, stick with it. Cross-device sync matters more than features.

| Browser | Why Pick It |
|---------|------------|
| **Vivaldi** | Most customizable, power users, tab stacking |
| **Edge** | Best Windows integration, solid dev tools, built-in sidebar apps |
| **Chrome** | Widest compatibility, best DevTools |
| **Firefox** | Privacy-first, strong extension ecosystem |

### Productivity Suite

#### Google Workspace

Google was the first to push the browser-first model seriously. Docs, Sheets, Slides, Meet, Gmail — all web-native from the start. Still the gold standard for real-time collaboration.

If you're starting fresh or don't have org constraints, Google Workspace is the easiest path. Everything syncs, everything works offline, and sharing is built in.

#### Microsoft 365

Office Online has caught up. Word, Excel, PowerPoint in the browser are now good enough for most tasks. OneDrive integration is seamless on Windows. If your org is on M365, lean into it — Teams, Outlook, and the Office apps all work in the browser.

### Password Manager

**Bitwarden** — open source, browser extension works everywhere, self-hostable if you want. **1Password** is the premium alternative with better UX. Both work purely in the browser with no native app required.

Pick one and stop managing passwords in your head.

### IDE

VS Code has a server mode (code-server, vscode.dev, GitHub Codespaces). Run the server anywhere, connect from any browser. Full LSP, extensions, terminal — same editor, no install on the client.

If you're on GitHub, Codespaces is the easiest path. For self-hosted, code-server on a VPS or local machine works well. You get the full VS Code experience without touching your local machine's filesystem.

### Terminal

Three approaches to a browser terminal:

| Tool | Sessions | Multi-tab | Windows | Notes |
|------|----------|-----------|---------|-------|
| **ttyd** | ❌ | ❌ | ✅ | Simple, one shell per URL, no state |
| **Zellij web mode** | ✅ | ✅ | ❌ | Full multiplexer, but Linux/macOS only |
| **webtty** | ✅ | ✅ | ✅ | Lightweight, session-aware, cross-platform |

ttyd is fine if you just need a quick shell in the browser. Zellij web mode is powerful but doesn't run on Windows. webtty is the middle ground — sessions, reconnect, multiple terminals, works everywhere.

### Terminal Software Recommendations

What to run inside your browser terminal. These are the tools that make terminal work actually pleasant:

**Shell**
- **fish** — sensible defaults, autosuggestions, no config required to be useful

**Editor**
- **NvChad** (Neovim) — full IDE feel in the terminal, built-in LSP and syntax highlighting

**File Manager**
- **yazi** — fast, terminal file manager with preview

**Git**
- **gitui** — terminal UI for git, better than memorizing flags

**Multiplexer / Layout**
- **Zellij** — terminal workspace with layouts; pairs well with webtty for managing multiple sessions

**Prompt**
- **starship** — fast, minimal, works with any shell

**AI**
- **OpenCode** — open-source AI coding agent in the terminal
- **Claude Code** — Anthropic's CLI coding assistant

---

The browser is no longer a limitation. It's where the best tools live now.
