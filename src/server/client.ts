import type { Config } from '../config';

export function render(sessionId: string, config: Config): string {
  const theme = config.theme;
  const themeJson = JSON.stringify(theme, null, 8).replace(/^/gm, '        ').trimStart();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>webtty — ${sessionId}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }

      html, body, #terminal { width: 100%; height: 100%; overflow: hidden; background: ${theme.background ?? '#282A36'}; }

      #terminal canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="terminal"></div>

    <script type="module">
      import { init, Terminal, FitAddon } from '/dist/ghostty-web.js';

      await init();
      const term = new Terminal({
        cols: ${config.cols},
        rows: ${config.rows},
        cursorBlink: ${config.cursorBlink},
        fontSize: ${config.fontSize},
        fontFamily: ${JSON.stringify(config.fontFamily)},
        scrollback: ${Math.ceil(config.scrollback / 80)},
        theme: ${themeJson},
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      const container = document.getElementById('terminal');
      await term.open(container);
      fitAddon.fit();
      fitAddon.observeResize();

      const sessionId = ${JSON.stringify(sessionId)};
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let ws;

      function connect() {
        const wsUrl = protocol + '//' + window.location.host + '/ws/' + sessionId + '?cols=' + term.cols + '&rows=' + term.rows;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[webtty] connected to session ' + sessionId);
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        };

        ws.onmessage = (event) => {
          term.write(event.data);
        };

        ws.onclose = (event) => {
          if (event.code === 4001) {
            term.write('\\r\\n\\x1b[31mSession removed.\\x1b[0m\\r\\n');
            setTimeout(() => window.close(), 500);
            return;
          }
          if (event.code === 1001) {
            term.write('\\r\\n\\x1b[33mServer stopped.\\x1b[0m\\r\\n');
            setTimeout(() => window.close(), 500);
            return;
          }
          console.log('[webtty] disconnected, reconnecting in 2s...');
          term.write('\\r\\n\\x1b[31mConnection closed. Reconnecting in 2s...\\x1b[0m\\r\\n');
          setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          console.error('[webtty] websocket error');
        };
      }

      connect();

      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      term.onResize(({ cols, rows }) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });

      window.addEventListener('resize', () => {
        fitAddon.fit();
      });
    </script>
  </body>
</html>`;
}
