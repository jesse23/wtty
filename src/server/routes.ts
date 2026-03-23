import type http from 'node:http';
import {
  createSession,
  generateId,
  isValidId,
  lastUsedId,
  sessionRegistry,
  sessionToJson,
  setLastUsedId,
} from './session';
import { spaShell } from './spa';
import { serveFile } from './static';

export function readJson(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  distPath: string,
  wasmPath: string,
  onStop: () => void,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === 'POST' && pathname === '/api/server/stop') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('stopping');
    onStop();
    return;
  }

  if (pathname === '/api/sessions') {
    if (req.method === 'GET') {
      const list = [...sessionRegistry.values()].map(sessionToJson);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list));
      return;
    }

    if (req.method === 'POST') {
      let body: { id?: string };
      try {
        body = (await readJson(req)) as { id?: string };
      } catch {
        res.writeHead(400);
        res.end('invalid JSON');
        return;
      }

      const id = body.id ?? generateId();
      if (!isValidId(id)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `invalid id: ${id}` }));
        return;
      }
      if (sessionRegistry.has(id)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `session already exists: ${id}` }));
        return;
      }
      const session = createSession(id);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sessionToJson(session)));
      return;
    }
  }

  const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessionMatch) {
    const id = decodeURIComponent(sessionMatch[1]);

    if (req.method === 'GET') {
      const session = sessionRegistry.get(id);
      if (!session) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sessionToJson(session)));
      return;
    }

    if (req.method === 'PATCH') {
      let body: { id?: string };
      try {
        body = (await readJson(req)) as { id?: string };
      } catch {
        res.writeHead(400);
        res.end('invalid JSON');
        return;
      }

      const session = sessionRegistry.get(id);
      if (!session) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const newId = body.id;
      if (!newId) {
        res.writeHead(400);
        res.end('missing id');
        return;
      }
      if (!isValidId(newId)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `invalid id: ${newId}` }));
        return;
      }
      if (sessionRegistry.has(newId)) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `session already exists: ${newId}` }));
        return;
      }
      sessionRegistry.delete(id);
      session.id = newId;
      sessionRegistry.set(newId, session);
      if (lastUsedId === id) setLastUsedId(newId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(sessionToJson(session)));
      return;
    }

    if (req.method === 'DELETE') {
      const session = sessionRegistry.get(id);
      if (!session) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      sessionRegistry.delete(id);
      if (lastUsedId === id) setLastUsedId(null);
      for (const client of session.clients) client.close(4001, 'session deleted');
      session.pty?.kill();
      res.writeHead(204);
      res.end();
      return;
    }
  }

  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    let targetId = lastUsedId ?? null;
    if (!targetId || !sessionRegistry.has(targetId)) {
      if (!sessionRegistry.has('main')) createSession('main');
      targetId = 'main';
    }
    res.writeHead(302, { Location: `/s/${targetId}` });
    res.end();
    return;
  }

  const spaMatch = pathname.match(/^\/s\/([^/]+)$/);
  if (req.method === 'GET' && spaMatch) {
    const id = decodeURIComponent(spaMatch[1]);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(spaShell(id));
    return;
  }

  if (pathname.startsWith('/dist/')) {
    serveFile(`${distPath}/${pathname.slice(6)}`, res);
    return;
  }

  if (pathname === '/ghostty-vt.wasm') {
    serveFile(wasmPath, res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
}
