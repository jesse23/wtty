// ghostty-web swallows Ctrl+V without forwarding \x16 to the PTY. When the
// clipboard has no text/plain, its paste handler also drops the event. This
// function identifies that condition so the caller can send \x16 to PTY
// directly, letting TUI apps invoke their native OS clipboard read. See ADR 014.
export function shouldForwardPaste(clipboardData: DataTransfer): boolean {
  return !clipboardData.getData('text/plain');
}
