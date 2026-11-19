// Storage, three interchangeable backends with the same five functions (putObject, getObject, putJSON/getJSON, listPaths,
// deleteObject). Every object is addressed by a pathname like "gifts/dimas-k3f9/gift.json".
//
// 1. Upstash Redis (used when its REST URL + token are set; Vercel → Storage → Upstash → Redis connects them as
//    KV_REST_API_URL / KV_REST_API_TOKEN). Chosen 2026-11-19 after Vercel Blob's Hobby quota (2,000 writes + lists a
//    month, for the whole account) ran out. Free tier: 256 MB, 500k commands a month. No library: Upstash's REST API.
//      vg:o:<pathname>  the object, base64 (WAVs are binary)
//      vg:paths         a sorted set of every pathname, so a prefix can be listed in one command (ZRANGE … BYLEX)
// 2. Vercel Blob, private store (BLOB_READ_WRITE_TOKEN / BLOB_STORE_ID), the earlier backend.
// 3. A local folder (.data/) during local development.

import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from './http.js';

const REDIS_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);
const useBlob = !useRedis && Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL_DIR = path.join(process.cwd(), '.data');

export const storageKind = useRedis ? 'upstash-redis' : useBlob ? 'vercel-blob' : 'local';

if (storageKind === 'local' && process.env.VERCEL) {
  console.warn('No storage connected. In Vercel: Storage → Upstash → Redis → Connect to this project.');
}

function assertStorage() {
  if (storageKind === 'local' && process.env.VERCEL) {
    throw new HttpError(503, 'Storage is not connected yet. In Vercel: Storage → Upstash → Redis → Connect to this project, then redeploy.');
  }
}

// ---------- Upstash Redis (REST) ----------
const KEY = (pathname) => `vg:o:${pathname}`;
const PATHS = 'vg:paths';

async function redis(body, pipeline = false) {
  const res = await fetch(pipeline ? `${REDIS_URL}/pipeline` : REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).catch(() => { throw new HttpError(503, 'Storage is unreachable just now. Please try again.'); });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`Upstash ${res.status}: ${data?.error || 'no response'}`);
  if (pipeline) {
    const failed = data.find((r) => r.error);
    if (failed) throw new Error(`Upstash: ${failed.error}`);
    return data.map((r) => r.result);
  }
  if (data.error) throw new Error(`Upstash: ${data.error}`);
  return data.result;
}

// ---------- Vercel Blob ----------
let blobSdk;
async function sdk() {
  if (!blobSdk) blobSdk = await import('@vercel/blob');
  return blobSdk;
}

async function streamToBuffer(stream) {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

// ---------- the five functions ----------
// overwrite: false refuses to replace an existing object (throws), like Blob's allowOverwrite: false.
export async function putObject(pathname, data, contentType, { overwrite = false } = {}) {
  assertStorage();
  const body = typeof data === 'string' ? Buffer.from(data) : data;
  if (useRedis) {
    const set = ['SET', KEY(pathname), body.toString('base64')];
    if (!overwrite) set.push('NX');
    const [ok] = await redis([set, ['ZADD', PATHS, '0', pathname]], true);
    if (ok !== 'OK') throw new Error('Object already exists: ' + pathname);
    return;
  }
  if (useBlob) {
    const { put } = await sdk();
    await put(pathname, body, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: overwrite, cacheControlMaxAge: 60 });
    return;
  }
  const file = path.join(LOCAL_DIR, pathname);
  await fs.mkdir(path.dirname(file), { recursive: true });
  if (!overwrite) {
    try {
      await fs.access(file);
      throw new Error('Object already exists: ' + pathname);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  await fs.writeFile(file, body);
}

export async function getObject(pathname) {
  assertStorage();
  if (useRedis) {
    const value = await redis(['GET', KEY(pathname)]);
    return value == null ? null : Buffer.from(value, 'base64');
  }
  if (useBlob) {
    const { get } = await sdk();
    const result = await get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return streamToBuffer(result.stream);
  }
  try {
    return await fs.readFile(path.join(LOCAL_DIR, pathname));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export async function putJSON(pathname, obj, opts) {
  await putObject(pathname, JSON.stringify(obj), 'application/json', opts);
}

export async function getJSON(pathname) {
  const buf = await getObject(pathname);
  return buf ? JSON.parse(buf.toString('utf8')) : null;
}

// Returns pathnames under a prefix, sorted.
export async function listPaths(prefix) {
  assertStorage();
  if (useRedis) {
    // every pathname is ASCII, so "￿" sorts after anything that starts with the prefix
    const out = await redis(['ZRANGE', PATHS, `[${prefix}`, `(${prefix}￿`, 'BYLEX']);
    return out.sort();
  }
  if (useBlob) {
    const { list } = await sdk();
    const out = [];
    let cursor;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      out.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out.sort();
  }
  const base = path.join(LOCAL_DIR, prefix);
  const dir = prefix.endsWith('/') ? base : path.dirname(base);
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch (e) {
      if (e.code === 'ENOENT') return;
      throw e;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else {
        const rel = path.relative(LOCAL_DIR, full).split(path.sep).join('/');
        if (rel.startsWith(prefix)) out.push(rel);
      }
    }
  }
  await walk(dir);
  return out.sort();
}

export async function deleteObject(pathname) {
  assertStorage();
  if (useRedis) {
    await redis([['DEL', KEY(pathname)], ['ZREM', PATHS, pathname]], true);
    return;
  }
  if (useBlob) {
    const { del } = await sdk();
    await del(pathname);
    return;
  }
  await fs.rm(path.join(LOCAL_DIR, pathname), { force: true });
}
