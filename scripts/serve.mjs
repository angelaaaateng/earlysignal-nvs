// Production-style static server for the web build: SPA fallback, security
// headers, cache rules, gzip and one JSON access-log line per request.
// Usage: node scripts/serve.mjs [dir=dist] [port=8080]
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createGzip } from 'node:zlib';
import { SECURITY_HEADERS, cacheControl } from './headers.mjs';

const dir = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? process.env.PORT ?? 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};
const COMPRESS = new Set(['.html', '.js', '.json', '.css', '.svg', '.map']);

createServer((req, res) => {
  const t0 = Date.now();
  const url = new URL(req.url ?? '/', 'http://x');
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(dir, rel);
  if (!file.startsWith(normalize(dir)) || !existsSync(file) || statSync(file).isDirectory()) {
    // Client-side routes (/student/quests, …) all serve the app shell.
    file = join(dir, 'index.html');
    rel = '/index.html';
  }
  const ext = extname(file);
  const sec = { ...SECURITY_HEADERS };
  if (process.env.ALLOW_FRAMING === '1') {
    // Only for recording the walkthrough, which shows the app inside a frame.
    delete sec['X-Frame-Options'];
    sec['Access-Control-Allow-Origin'] = '*'; // the recording stage loads the app's fonts
    sec['Content-Security-Policy'] = sec['Content-Security-Policy'].replace("; frame-ancestors 'none'", '');
  }
  const headers = { ...sec, 'Content-Type': TYPES[ext] ?? 'application/octet-stream', 'Cache-Control': cacheControl(rel === '/index.html' ? '/' : url.pathname) };
  if (url.pathname === '/sw.js') headers['Service-Worker-Allowed'] = '/';
  const gzip = COMPRESS.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  if (gzip) headers['Content-Encoding'] = 'gzip';
  res.writeHead(200, headers);
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
  res.on('finish', () =>
    console.log(JSON.stringify({ ts: new Date().toISOString(), method: req.method, path: url.pathname, status: res.statusCode, ms: Date.now() - t0 })),
  );
}).listen(port, () => console.log(JSON.stringify({ msg: 'serving', dir, port })));
