// Sharing pieces used by the create page and the dashboard:
// the friends' link, a QR code (and a printable QR card), and the recipient's link.
import { h, icon, copyText, waShare } from './common.js';
import { theme } from './themes.js';
import qrcode from './vendor/qrcode.js'; // qrcode-generator 2.0.4 (MIT)

const bare = (url) => url.replace(/^https?:\/\//, '');
// Links we hand out always use the public address, even when this page was opened from a
// per-deployment or preview address (those ask for a Vercel login). Locally they stay on localhost.
const PUBLIC_ORIGIN = 'https://voicegift-one.vercel.app';
const shareOrigin = location.hostname.endsWith('.vercel.app') ? PUBLIC_ORIGIN : location.origin;
export const friendUrl = (gift) => `${shareOrigin}/g/${gift.slug}`;
export const recipientUrl = (gift, openKey) => `${shareOrigin}/r/${gift.slug}?k=${openKey}`;

export function qrSvg(url) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
}

export function linkbox(url) {
  const copy = h('button', { type: 'button', html: icon.copy(14), onclick: () => copyText(url) }, h('span', {}, 'Copy'));
  return h('div', { class: 'linkbox' }, h('span', {}, bare(url)), copy);
}

// Simple app glyphs for the share buttons (white on the app's colour).
const GLYPH = {
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.2 7.6c.3 0 .6 0 .8.5l.8 1.8c.1.3 0 .5-.1.7l-.6.7c.6 1.2 1.6 2.2 2.9 2.8l.7-.8c.2-.2.4-.3.7-.1l1.8.8c.4.2.5.4.4.8-.2 1-1.1 1.7-2.1 1.7-3.3-.2-6.4-3.2-6.6-6.6 0-1 .6-1.9 1.3-2.3z" fill="#fff"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.4 21v-7.3h2.5l.4-2.9h-2.9V9c0-.8.3-1.4 1.4-1.4h1.6V5.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v1.9H7.8v2.9h2.5V21z" fill="#fff"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4.6" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="12" r="3.7" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="16.6" cy="7.4" r="1.2" fill="#fff"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4C6.9 4 2.8 7.3 2.8 11.3c0 3.6 3.2 6.6 7.6 7.2l-.4 2c-.1.5.4.8.8.5l3.4-2.6c4.4-.6 7-3.6 7-7.1C21.2 7.3 17.1 4 12 4z" fill="#fff"/><text x="12" y="13.4" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" font-weight="800" fill="#06C755">LINE</text></svg>'
};

// Share buttons: WhatsApp, Facebook, Instagram, LINE (+ the phone's own share sheet when there is one).
// `message` is the text, `url` the link it is about.
export function shareRow(message, url) {
  const text = `${message}\n${url}`;
  const app = (name, cls, href, onclick) => h('a', { class: `share-app ${cls}`, href, target: '_blank', rel: 'noopener', onclick },
    h('span', { class: 'share-ico', html: GLYPH[cls] || icon.share(20) }), h('span', {}, name));
  const row = h('div', { class: 'sharerow' },
    app('WhatsApp', 'whatsapp', waShare(text)),
    // Facebook only shares a link (it may post it publicly: fine for friends, not for the surprise itself)
    app('Facebook', 'facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`),
    // Instagram has no web share link: copy the message, then open the DMs to paste it
    app('Instagram', 'instagram', 'https://www.instagram.com/direct/inbox/', () => copyText(text, 'Copied. Paste it in your Instagram message.')),
    app('LINE', 'line', `https://line.me/R/share?text=${encodeURIComponent(text)}`));
  if (navigator.share) {
    row.append(h('button', { type: 'button', class: 'share-app more', onclick: () => navigator.share({ text: message, url }).catch(() => {}) },
      h('span', { class: 'share-ico', html: icon.share(20) }), h('span', {}, 'More')));
  }
  return row;
}

// A card to print and put on the guestbook table: big QR code that opens the recording page.
export function printQrCard(gift) {
  const t = theme(gift.occasion);
  const url = friendUrl(gift);
  document.querySelector('.printcard')?.remove();
  document.body.append(h('div', { class: 'printcard' },
    h('div', { class: 'pc-eyebrow' }, `${t.label} · Voice Gift`),
    h('h1', {}, t.inviteTitle(t.callName(gift.recipient))),
    h('div', { class: 'pc-qr', html: qrSvg(url) }),
    h('p', {}, 'Scan with your phone camera. 15 seconds, no app needed.'),
    h('p', {}, bare(url))));
  window.print();
}

// The recipient's link (dashboard only, so it isn't mixed up with the friends' link).
// It opens the gift right away, so the surprise starts when you send it.
export function recipientCard(gift, openKey) {
  const t = theme(gift.occasion);
  const name = t.callName(gift.recipient);
  const url = recipientUrl(gift, openKey);
  return h('div', { class: 'card stack' },
    h('div', {}, h('b', {}, `Link for ${name}`), h('div', { class: 'small muted' }, `It opens the gift right away. Send it when everyone has recorded, e.g. at 00:00.`)),
    shareRow(t.waRecipient(name), url),
    linkbox(url));
}
