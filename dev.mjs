// Local development server: serves public/, applies the same rewrites as vercel.json,
// and runs the handlers in api/. Data is stored in .data/ instead of Vercel Blob.
//   npm run dev  →  http://localhost:3000
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 3000;
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };

function rewrite(pathname) {
  for (const r of config.rewrites || []) {
    const re = new RegExp('^' + r.source.replace(/:[a-zA-Z]+/g, '[^/]+') + '$');
    if (re.test(pathname)) return r.destination;
  }
  return pathname;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, '');
      const file = path.join(ROOT, 'api', name + '.js');
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    }
    let p = rewrite(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, 'public', path.normalize(p));
    if (!file.startsWith(path.join(ROOT, 'public'))) throw Object.assign(new Error('bad path'), { code: 'ENOENT' });
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ERR_MODULE_NOT_FOUND') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    console.error(e);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
});

server.listen(PORT, () => console.log(`Voice Gift running on http://localhost:${PORT} (data in .data/)`));
