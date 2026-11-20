import { createHash, timingSafeEqual } from 'node:crypto';
// Small helpers so the handlers work both on Vercel and in the local dev server.

export function query(req) {
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  if (body === undefined || body === null) return res.end();
  if (Buffer.isBuffer(body) || typeof body === 'string') return res.end(body);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!res.hasHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readStream(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) throw new HttpError(413, 'Upload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Vercel may already have parsed the body; locally we read the stream ourselves.
export async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  return readStream(req);
}

export async function jsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const buf = await rawBody(req);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

const rateBuckets = new Map();

export function rateLimit(req, bucket = 'api', maxPerMin = 60) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const win = 60_000;
  const list = (rateBuckets.get(key) || []).filter((t) => now - t < win);
  if (list.length >= maxPerMin) throw new HttpError(429, 'Too many requests. Please wait a moment.');
  list.push(now);
  rateBuckets.set(key, list);
}

function checkCsrfOrigin(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const oHost = new URL(origin).host;
      if (oHost !== host) throw new HttpError(403, 'Cross-origin request blocked');
    } catch (e) {
      if (e instanceof HttpError) throw e;
    }
  }
}

// Wraps a handler: method routing + uniform error responses.
export function route(methods) {
  return async (req, res) => {
    const fn = methods[req.method];
    if (!fn) return send(res, 405, { error: 'Method not allowed' }, { Allow: Object.keys(methods).join(', ') });
    try {
      checkCsrfOrigin(req);
      if (req.method !== 'GET') rateLimit(req, req.url?.split('?')[0] || 'mut', 90);
      await fn(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      // server errors stay in the log: they can hold internal details (storage, the ASR service)
      send(res, status, { error: status === 500 ? 'Something went wrong on the server' : err.message });
    }
  };
}

// Team-only endpoints (export, users, the ASR page). The key comes in the X-Admin-Key header (kept out of URLs and logs);
// ?key= still works for the older export/users links. Compared in constant time, and 10 tries a minute per IP.
export function requireAdmin(req, what = 'This page') {
  const want = process.env.ADMIN_KEY || '';
  if (want.length < 12) throw new HttpError(404, `${what} is disabled. Set ADMIN_KEY (12+ characters) to enable it.`);
  rateLimit(req, 'admin', 10);
  const got = String(req.headers['x-admin-key'] || query(req).key || '');
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(want).digest();
  if (!timingSafeEqual(a, b)) throw new HttpError(403, 'Wrong key');
}

export function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
