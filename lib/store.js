// Storage: Vercel Blob (private store) on Vercel, a local folder (.data/) during local development.
// Every object is addressed by a pathname like "gifts/dimas-k3f9/gift.json".

import fs from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from './http.js';

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const LOCAL_DIR = path.join(process.cwd(), '.data');

if (!useBlob && process.env.VERCEL) {
  console.warn('No Vercel Blob store connected. Create a private Blob store and connect it to this project.');
}

function assertStorage() {
  if (!useBlob && process.env.VERCEL) {
    throw new HttpError(503, 'Storage is not connected yet. In Vercel: Storage → Create → Blob (Private) → Connect to this project, then redeploy.');
  }
}

let blobSdk;
async function sdk() {
  if (!blobSdk) blobSdk = await import('@vercel/blob');
  return blobSdk;
}

async function streamToBuffer(stream) {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

export async function putObject(pathname, data, contentType, { overwrite = false } = {}) {
  assertStorage();
  const body = typeof data === 'string' ? Buffer.from(data) : data;
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
  if (useBlob) {
    const { del } = await sdk();
    await del(pathname);
    return;
  }
  await fs.rm(path.join(LOCAL_DIR, pathname), { force: true });
}

export const storageKind = useBlob ? 'vercel-blob' : 'local';
