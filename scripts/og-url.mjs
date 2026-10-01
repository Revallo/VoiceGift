// Vercel build step: link previews (WhatsApp, Facebook) need an absolute og:image URL.
// Rewrites og:image="/og.png" to https://<production domain>/og.png. Safe to skip locally.
import fs from 'node:fs';
import path from 'node:path';

const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
if (!host) {
  console.log('og-url: no Vercel domain in the environment, leaving og:image relative');
  process.exit(0);
}
try {
  const dir = path.join(process.cwd(), 'public');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
    const file = path.join(dir, f);
    const html = fs.readFileSync(file, 'utf8').replaceAll('content="/og.png"', `content="https://${host}/og.png"`);
    fs.writeFileSync(file, html);
  }
  console.log(`og-url: og:image now points to https://${host}/og.png`);
} catch (e) {
  console.log('og-url: skipped (' + e.message + ')');
}
