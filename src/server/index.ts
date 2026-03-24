import http from 'node:http';
import { loadConfig } from '../config';
import { handleRequest } from './routes';
import { findGhosttyWeb } from './static';
import { closeAllSessions, createWebSocketServer } from './websocket';

const config = loadConfig();
const HTTP_PORT = Number(process.env.PORT) || config.port;
const HTTP_HOST = config.host;

const { distPath, wasmPath } = findGhosttyWeb();

function shutdown() {
  closeAllSessions();
  wss.close();
  const exit = () => process.exit(0);
  const shutdownTimeout = setTimeout(exit, 1000);
  httpServer.close(() => {
    clearTimeout(shutdownTimeout);
    exit();
  });
}

const httpServer = http.createServer((req, res) => {
  handleRequest(req, res, distPath, wasmPath, shutdown);
});

const wss = createWebSocketServer(httpServer);

process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  shutdown();
});

httpServer.listen(HTTP_PORT, HTTP_HOST, () => {
  console.log(`listening on http://${HTTP_HOST}:${HTTP_PORT}`);
});
