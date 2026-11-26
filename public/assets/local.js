// Local touches (gift.cake.local): Indonesia, Thailand, the Philippines, Vietnam, or none.
// A country adds its own stickers, backdrop and lantern motif to the decorate step, the money in a money
// bouquet and the snacks in a snack bouquet. Nothing here shows a flag, a map, a real banknote design, a
// royal or religious symbol, or a brand: see "ide local.md" for why.
import { SNACK_TYPES } from './item-options.js';

export const LOCALES = {
  none: { label: 'Anywhere', stickers: [],
    money: { sym: '$', num: '100', c1: '#86B880', c2: '#4F7F4B' } },
  id: { label: 'Indonesia', stickers: ['🍢', '🍜', '🌶️', '🥥', '🛵', '🦎', '🪁', '🌋', '🏝️', '☕', '🍌', '🌺'],
    money: { sym: 'Rp', num: '100.000', c1: '#E25A63', c2: '#A8323C' } },
  th: { label: 'Thailand', stickers: ['🐘', '🥭', '🧋', '🛺', '🦛', '🌼', '🌶️', '🍜', '🥥', '🌕', '💦', '🐒'],
    money: { sym: '฿', num: '500', c1: '#9675CF', c2: '#5E4296' } },
  ph: { label: 'Philippines', stickers: ['🥭', '🍧', '🎤', '🐃', '⭐', '🏝️', '🍍', '🥥', '🍢', '🚐', '🌼', '🎸'],
    money: { sym: '₱', num: '1000', c1: '#5B98DC', c2: '#2E5F9E' } },
  vn: { label: 'Vietnam', stickers: ['🍜', '🥖', '☕', '🛵', '🧧', '🏮', '🌸', '🌼', '🥢', '🐃', '🍉', '🪷'],
    money: { sym: '₫', num: '500.000', c1: '#45BCC4', c2: '#23848C' } }
};
export const localKey = (k) => (LOCALES[k] ? k : 'none');

// A first guess from the phone's time zone (then its language). The organizer can change it.
export function detectLocal() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (/^Asia\/(Jakarta|Makassar|Jayapura|Pontianak)$/.test(tz)) return 'id';
  if (tz === 'Asia/Bangkok') return 'th';
  if (tz === 'Asia/Manila') return 'ph';
  if (/^Asia\/(Ho_Chi_Minh|Saigon)$/.test(tz)) return 'vn';
  const lang = (navigator.language || '').toLowerCase();
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('th')) return 'th';
  if (lang.startsWith('fil') || lang.startsWith('tl')) return 'ph';
  if (lang.startsWith('vi')) return 'vn';
  return 'none';
}

// The snacks of a country, in picking order.
export const snacksFor = (local) => Object.keys(SNACK_TYPES).filter((k) => SNACK_TYPES[k].local === (local === 'none' ? '' : localKey(local)));
export const snackKey = (type, i, local) => {
  const list = snacksFor(local);
  return SNACK_TYPES[type] ? type : list[i % list.length];
};

// ---------- drawings (static markup, never user text) ----------
const T = (x, y, s, fill, size, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Montserrat, system-ui, sans-serif" font-weight="800" font-size="${size}" fill="${fill}" ${extra}>${s}</text>`;
const lines = (x1, x2, y1, y2) => { let s = ''; for (let x = x1 + 1.6; x < x2 - 0.5; x += 2.4) s += `M${x.toFixed(1)} ${y1}V${y2}`; return `<path d="${s}" stroke="rgba(0,0,0,.2)" stroke-width=".7"/>`; };
const shine = (d) => `<path d="${d}" stroke="rgba(255,255,255,.42)" stroke-width="2" fill="none" stroke-linecap="round"/>`;
const at = (x, y, s, inner) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

// Little pictures printed on the packs, drawn around (0, 0), about 14 wide.
const M = {
  bowl: '<path d="M-7.5 -1H7.5Q7 6.5 0 7Q-7 6.5-7.5-1Z" fill="#fff"/><path d="M-6-1.2q1.5-3 3 0t3 0 3 0 3 0" stroke="#F2B630" stroke-width="1.4" fill="none"/><circle cx="3.5" cy="-2.2" r="1.6" fill="#E0503A"/><path d="M1-8.5L7-1.5M3-9L8.5-2.5" stroke="#8A5A32" stroke-width=".9"/>',
  chili: '<path d="M-6 4Q2 5 5.5-4Q6.5-6.5 4.2-6.2Q1.5 1.5-6 2Z" fill="#E0302A"/><path d="M4.2-6.2L6.5-8.5" stroke="#3E8E3E" stroke-width="1.5" stroke-linecap="round"/>',
  coffee: '<ellipse cx="0" cy="-2.6" rx="5.2" ry="1.4" fill="#6B3E22"/><path d="M-5.2-2.6H5.2L4.2 5.2H-4.2Z" fill="#fff"/><path d="M5-1q3.2 0 2.6 2.6t-3.2 1.6" stroke="#fff" stroke-width="1.2" fill="none"/><path d="M-1.5-6q1.4-1.6 0-3.2M1.8-6q1.4-1.6 0-3.2" stroke="rgba(255,255,255,.85)" stroke-width=".9" fill="none"/>',
  chip: '<path d="M-7-1Q-1-8.5 7-2Q5 6.5-4 5.5Z" fill="#F8D978" stroke="#D59F2A" stroke-width=".8"/><path d="M-6 3Q0-5 6.5 0Q4 7-3 6.5Z" fill="#F4C850" stroke="#D59F2A" stroke-width=".8"/>',
  wafer: '<rect x="-8" y="-4.5" width="16" height="9" rx="1.2" fill="#D9A15A"/><path d="M-8-1.5H8M-8 1.5H8M-4.5-4.5V4.5M-1-4.5V4.5M2.5-4.5V4.5M6-4.5V4.5" stroke="#B27A36" stroke-width=".7"/><path d="M-8-4.5H8V-2.6H-8Z" fill="#6B3A1E"/>',
  leaf: '<path d="M-6.5 4.5Q-6.5-6.5 6.5-6.5Q6.5 4.5-6.5 4.5Z" fill="#8FD07A"/><path d="M-5.5 3.5L5.5-5.5" stroke="#4E8E3E" stroke-width=".9"/><circle cx="4" cy="3.5" r="2.2" fill="#fff"/><circle cx="4" cy="3.5" r=".9" fill="#F4D35E"/>',
  seaweed: '<rect x="-7.5" y="-5" width="15" height="10" rx="1" fill="#1F2B24"/><path d="M-6-2.5q1.5 1 3 0t3 0 3 0 3 0M-6 .5q1.5 1 3 0t3 0 3 0 3 0M-6 3.2q1.5 1 3 0t3 0 3 0 3 0" stroke="#4F8A52" stroke-width=".7" fill="none"/>',
  mango: '<path d="M-7 4Q-8.5-5 1-6.5Q5-3-7 4Z" fill="#FFB400"/><path d="M-2 6Q-1-3 7.5-3.5Q8 3-2 6Z" fill="#FFC93A"/><path d="M-5.5 2Q-4-3 0-4.5M0 4Q2-1 5.5-2" stroke="#F09A00" stroke-width=".6" fill="none"/>',
  squid: '<path d="M0-8Q5-4 4 2H-4Q-5-4 0-8Z" fill="#F6A38E"/><path d="M-3.5 2q-1 4-2.5 5M-1.2 2q-.4 4-1 5.5M1.2 2q.4 4 1 5.5M3.5 2q1 4 2.5 5" stroke="#E87F6A" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="-1.5" cy="-2" r=".9" fill="#5A2A20"/><circle cx="1.5" cy="-2" r=".9" fill="#5A2A20"/>',
  rolls: '<rect x="-8" y="-5" width="16" height="4" rx="2" fill="#F1C56A"/><rect x="-7" y="0" width="16" height="4" rx="2" fill="#E8B24E"/><path d="M-6-3H6M-5 2H7" stroke="#C98E2C" stroke-width=".6" stroke-dasharray="1.4 1"/>',
  garlic: '<path d="M0-7Q6-1 4 4Q0 6.5-4 4Q-6-1 0-7Z" fill="#FFF8EC" stroke="#E2D3BC" stroke-width=".7"/><path d="M0-6V5M-2.5-3Q-3.5 1-2 4.5M2.5-3Q3.5 1 2 4.5" stroke="#E2D3BC" stroke-width=".6" fill="none"/><circle cx="-7" cy="4" r="1.6" fill="#F6C83A"/><circle cx="-5" cy="6.5" r="1.6" fill="#F6C83A"/><circle cx="7" cy="5" r="1.6" fill="#F6C83A"/>',
  jack: '<path d="M-7 0Q-5-6 0-3Q4-7 7-1Q4 6-1 3Q-5 6-7 0Z" fill="#F7D46A"/><path d="M-4 0Q-2-2 0 0T4 0" stroke="#E0A93A" stroke-width=".8" fill="none"/>',
  paper: '<path d="M-7-3Q0-7 7-2M-7 1Q0-3 7 2M-6 5Q0 1 7 6" stroke="#F3E3C2" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="-3" cy="-1" r="1" fill="#D8361F"/><circle cx="3" cy="3" r="1" fill="#D8361F"/><circle cx="1" cy="-4" r=".9" fill="#5E9C3A"/>',
  cookie: '<circle cx="-3" cy="-1" r="5" fill="#D9A15A"/><circle cx="3.5" cy="2.5" r="4.5" fill="#C98E46"/><circle cx="-4" cy="-2" r=".9" fill="#4A2A16"/><circle cx="-1.5" cy="1" r=".9" fill="#4A2A16"/><circle cx="4" cy="1.5" r=".9" fill="#4A2A16"/><circle cx="2.5" cy="4.5" r=".8" fill="#4A2A16"/>',
  bear: '<g fill="#FF6B6B"><circle cx="-3" cy="-5" r="1.8"/><circle cx="3" cy="-5" r="1.8"/><circle cx="0" cy="-2.5" r="3.4"/><ellipse cx="0" cy="3.5" rx="4" ry="4.4"/></g><g fill="#5CC8A8" transform="translate(7 2) scale(.6)"><circle cx="-3" cy="-5" r="1.8"/><circle cx="3" cy="-5" r="1.8"/><circle cx="0" cy="-2.5" r="3.4"/><ellipse cx="0" cy="3.5" rx="4" ry="4.4"/></g>',
  orange: '<circle cx="0" cy="0" r="6.5" fill="#FF9F1C"/><circle cx="0" cy="0" r="4.8" fill="#FFC15E"/><path d="M0-4.8V4.8M-4.2-2.4L4.2 2.4M-4.2 2.4L4.2-2.4" stroke="#FF9F1C" stroke-width=".8"/><path d="M1-6.5q2-3 4-2" stroke="#4E8E3E" stroke-width="1.2" fill="none"/>',
  cocoa: '<rect x="-7" y="-4" width="14" height="8" rx="1" fill="#6B3A1E"/><path d="M-3.5-4V4M0-4V4M3.5-4V4M-7 0H7" stroke="#4A2412" stroke-width=".7"/>',
  peanut: '<path d="M-5-2Q-6-6-2-5Q0-3 2-5Q6-6 5-2Q4 1 2 0Q0 2-2 0Q-4 1-5-2Z" fill="#E4B878"/><path d="M-3 4Q-4 1-1 1.5Q1 3 3 1.5Q5 1 4 4Q3 6.5 0 5.5Q-3 6.5-3 4Z" fill="#D9A660"/>',
  coconut: '<circle cx="0" cy="0" r="6" fill="#7A4A2A"/><path d="M-6 0A6 6 0 0 1 6 0Z" fill="#FFF8EC"/><circle cx="-2" cy="-3.5" r=".7" fill="#4A2A16"/><circle cx="1" cy="-4" r=".7" fill="#4A2A16"/>'
};

// Pack templates. c1 = pack colour, c2 = band/crimp colour. 40 × 48 box.
const PACK = {
  bag: (c1, c2, m, w, wc = '#fff') => `<path d="M7 8Q20 5 33 8Q36.5 24 33 40Q20 43 7 40Q3.5 24 7 8Z" fill="${c1}"/>`
    + `<path d="M7 3H33V8.6Q20 6 7 8.6Z" fill="${c2}"/>${lines(7, 33, 3, 8)}<path d="M7 39.4Q20 42 33 39.4V45H7Z" fill="${c2}"/>${lines(7, 33, 40.5, 45)}`
    + `<path d="M5.4 15.5Q20 12.8 34.6 15.5V21.5Q20 18.8 5.4 21.5Z" fill="${c2}"/>${w ? T(20, 19.8, w, wc, w.length > 7 ? 3.6 : 4.4) : ''}`
    + at(20, 31, 0.95, m) + shine('M9.5 11Q8.5 24 9.5 37'),
  noodle: (c1, c2, m, w, wc = '#fff') => `<rect x="2" y="8" width="36" height="32" rx="3" fill="${c1}"/><rect x="2" y="8" width="4" height="32" rx="1.5" fill="${c2}"/><rect x="34" y="8" width="4" height="32" rx="1.5" fill="${c2}"/>`
    + `<path d="M2.6 11H6M2.6 14H6M2.6 17H6M2.6 20H6M2.6 23H6M2.6 26H6M2.6 29H6M2.6 32H6M2.6 35H6M34 11H37.4M34 14H37.4M34 17H37.4M34 20H37.4M34 23H37.4M34 26H37.4M34 29H37.4M34 32H37.4M34 35H37.4" stroke="rgba(0,0,0,.2)" stroke-width=".7"/>`
    + `<rect x="6" y="11" width="28" height="8" fill="${c2}"/>${w ? T(20, 16.8, w, wc, w.length > 8 ? 3.3 : 4.2) : ''}` + at(20, 29, 1.05, m) + shine('M8.5 22V36'),
  sachet: (c1, c2, m, w, wc = '#fff') => `<rect x="11.5" y="2" width="17" height="44" rx="1.5" fill="${c1}"/><rect x="11.5" y="2" width="17" height="5" fill="${c2}"/>${lines(11.5, 28.5, 2, 7)}<rect x="11.5" y="41" width="17" height="5" fill="${c2}"/>${lines(11.5, 28.5, 41, 46)}`
    + (w ? `<g transform="rotate(-90 20 30)">${T(20, 31.5, w, wc, 4)}</g>` : '') + at(20, 15, 0.72, m) + shine('M14 9V39'),
  box: (c1, c2, m, w, wc = '#fff') => `<path d="M10 15L20 9.5 30 15V46H10Z" fill="${c1}"/><path d="M10 15L20 9.5 30 15Z" fill="${c2}"/><rect x="24" y="15" width="6" height="31" fill="rgba(0,0,0,.12)"/>`
    + `<path d="M23.5 12L27.5 1.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>${w ? `<rect x="10" y="18" width="20" height="6" fill="${c2}"/>${T(17.5, 22.5, w, wc, 3.8)}` : ''}` + at(17.5, 34, 0.85, m),
  cup: (c1, c2) => `<path d="M9.5 15H30.5L27.8 46H12.2Z" fill="rgba(255,255,255,.28)"/><path d="M10.1 21H29.9L27.8 46H12.2Z" fill="${c1}"/>`
    + `<path d="M10.1 21H29.9L29.4 26.5Q24 23.5 20 26.5Q15 29 10.5 26Z" fill="${c2}"/><rect x="13.5" y="31" width="5" height="5" rx="1" fill="rgba(255,255,255,.35)" transform="rotate(12 16 33)"/><rect x="21" y="35" width="5" height="5" rx="1" fill="rgba(255,255,255,.3)" transform="rotate(-10 23 37)"/>`
    + `<path d="M8.5 15Q20 3 31.5 15Z" fill="rgba(255,255,255,.5)"/><rect x="8" y="13.8" width="24" height="2.6" rx="1.3" fill="#fff" opacity=".85"/><path d="M22.5 15L26.5 1" stroke="#E0503A" stroke-width="2.4" stroke-linecap="round"/>` + shine('M12 18L14 42'),
  pouch: (c1, c2, m, w, wc = '#fff') => `<path d="M8 5H32L34.5 43Q20 46.5 5.5 43Z" fill="${c1}"/><rect x="8" y="5" width="24" height="3.2" fill="${c2}"/><path d="M8 9.6H32" stroke="rgba(0,0,0,.22)" stroke-width=".8" stroke-dasharray="1.2 1"/>`
    + `${w ? `<rect x="7.6" y="12" width="24.8" height="6.4" fill="${c2}"/>${T(20, 16.9, w, wc, w.length > 8 ? 3.3 : 4)}` : ''}<rect x="11" y="21" width="18" height="17" rx="8" fill="#FFF7E8" opacity=".92"/>` + at(20, 29.5, 0.95, m) + shine('M10 12L9 40'),
  bar: (c1, c2, m, w, wc = '#fff') => `<g transform="rotate(-16 20 25)"><rect x="1.5" y="15" width="37" height="19" rx="2" fill="${c1}"/><path d="M1.5 15h3.6v19H1.5zM34.9 15h3.6v19h-3.6z" fill="${c2}"/>${lines(1.5, 5.1, 15, 34)}${lines(34.9, 38.5, 15, 34)}`
    + `<rect x="8" y="18.5" width="24" height="12" rx="2.5" fill="${c2}"/>${w ? T(20, 26.2, w, wc, 4) : at(20, 24.5, 0.7, m)}</g>`,
  candy: (c1, c2, m) => `<path d="M12 24L2.5 15.5 5 24 2.5 32.5Z" fill="${c2}"/><path d="M28 24L37.5 15.5 35 24 37.5 32.5Z" fill="${c2}"/><rect x="10.5" y="16" width="19" height="16" rx="7.5" fill="${c1}"/>`
    + at(20, 24, 0.62, m) + shine('M14 19.5Q20 17.5 26 19.5'),
  round: (c1, c2) => `<circle cx="20" cy="26" r="16.5" fill="rgba(255,255,255,.22)" stroke="rgba(255,255,255,.55)" stroke-width=".8"/><circle cx="20" cy="26" r="14" fill="${c1}"/><circle cx="20" cy="26" r="11" fill="${c2}"/>`
    + '<circle cx="20" cy="26" r="4.2" fill="#C4372B"/><path d="M17.8 26H22.2M20 23.8V28.2" stroke="#FFD9B0" stroke-width=".9"/><path d="M11 21Q14 15 21 14" stroke="rgba(255,255,255,.45)" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
};

// Each snack: its template and colours. Look-alikes only: generic words, no brand names or logos.
const SNACK_ART = {
  noodles: ['noodle', '#FFFFFF', '#E0322D', M.bowl, 'MIE GORENG'],
  kopi: ['sachet', '#6A3A22', '#D7A64A', M.coffee, 'KOPI'],
  wafer: ['bar', '#E0352B', '#7A2416', M.wafer, 'WAFER'],
  potato: ['bag', '#F6C431', '#E0322D', M.chip, 'KERIPIK'],
  basreng: ['pouch', '#E8532B', '#A8261A', M.chili, 'BASRENG'],
  tehbox: ['box', '#2E8B57', '#F2D35A', M.leaf, 'TEH', '#2B4A1E'],
  mama: ['noodle', '#F6A61B', '#D0332A', M.bowl, 'บะหมี่'],
  seaweed: ['bag', '#2E7D46', '#F2C230', M.seaweed, 'สาหร่าย', '#1E3A22'],
  thaitea: ['cup', '#E98A2C', '#F6E6CF'],
  mango: ['pouch', '#FFD24A', '#3E9B4F', M.mango, 'มะม่วง'],
  squid: ['bag', '#D23A30', '#FFCB3A', M.squid, 'ปลาหมึก', '#7A1E14'],
  rolls: ['pouch', '#F4E3C0', '#C98E2C', M.rolls, 'ทองม้วน'],
  pancit: ['noodle', '#2F8F4E', '#E33B2E', M.bowl, 'PANCIT CANTON'],
  chocnut: ['bar', '#F0E0C4', '#8A4E26', M.peanut, 'CHOCO NUT'],
  garlic: ['pouch', '#E3402E', '#F4C531', M.garlic, 'GARLIC CORN', '#7A1E14'],
  mangoes: ['pouch', '#F9C933', '#2E7D46', M.mango, 'MANGOES'],
  polvoron: ['candy', '#F7EED9', '#E86A92', M.cookie],
  threeinone: ['sachet', '#D3362B', '#5A2E1A', M.coffee, '3-IN-1'],
  mi: ['noodle', '#F38A1F', '#C9282A', M.bowl, 'MÌ TÔM'],
  caphe: ['sachet', '#4A2516', '#C9282A', M.coffee, 'CÀ PHÊ'],
  banhpia: ['round', '#D89A4C', '#F1C47A'],
  jackfruit: ['pouch', '#F6D36A', '#3E8E3E', M.jack, 'MÍT SẤY', '#2B4A1E'],
  banhtrang: ['pouch', '#F28C28', '#C9282A', M.paper, 'BÁNH TRÁNG'],
  keodua: ['candy', '#FFF8EC', '#3E9B4F', M.coconut],
  choco: ['bar', '#5A2E1A', '#C9A24A', M.cocoa, 'CHOCO', '#3A1C0E'],
  chips: ['bag', '#3C7BEA', '#F6C431', M.chip, 'CHIPS', '#1F3E7A'],
  cookies: ['pouch', '#2F4A8A', '#F2D35A', M.cookie, 'COOKIES', '#1F2E5A'],
  gummy: ['bag', '#FFD8E4', '#E86A92', M.bear, 'GUMMY'],
  juice: ['box', '#FF9F1C', '#2E8B57', M.orange, 'JUICE'],
  candy: ['candy', '#FF6B6B', '#FFD24A', '<circle r="5" fill="#fff" opacity=".5"/>']
};

export function snackSvg(type) {
  const [kind, c1, c2, m, w, wc] = SNACK_ART[type] || SNACK_ART.choco;
  return `<svg viewBox="0 0 40 48" width="100%" height="100%" overflow="visible" aria-hidden="true">${PACK[kind](c1, c2, m || '', w, wc)}</svg>`;
}

// One fan of folded notes in the money bouquet: the colour, symbol and amount say which money it is,
// but it is no copy of a real banknote (no faces, no national emblems, no real design).
export function moneySvg(local) {
  const { sym, num, c1, c2 } = LOCALES[localKey(local)].money;
  let s = '';
  for (const a of [-32, 32, -16, 16, 0]) { // the front note last, so its symbol and amount show
    s += `<g transform="rotate(${a} 24 42)"><rect x="15" y="5" width="18" height="35" rx="2" fill="${c1}" stroke="${c2}" stroke-width=".9"/>`
      + `<rect x="17" y="7.2" width="14" height="30.6" rx="1.2" fill="none" stroke="rgba(255,255,255,.5)" stroke-width=".7"/><circle cx="24" cy="13.5" r="3.6" fill="rgba(255,255,255,.3)"/>`
      + (a === 0 ? `${T(24, 15.2, sym, '#fff', sym.length > 1 ? 4.6 : 6)}<g transform="rotate(-90 24 27)">${T(24, 28.6, num, '#fff', num.length > 5 ? 4.2 : 5)}</g>` : `<path d="M19 30H29M19 33H26" stroke="rgba(255,255,255,.4)" stroke-width=".8"/>`)
      + '</g>';
  }
  return `<svg viewBox="0 0 48 48" width="100%" height="100%" overflow="visible" aria-hidden="true">${s}<rect x="19.5" y="37" width="9" height="6" rx="2" fill="#E7B32E"/><rect x="19.5" y="37" width="9" height="2" rx="1" fill="#F6D27A"/></svg>`;
}

// A small snack picture for the friend's picker and the dashboards.
export function miniSnack(type, size = 44) {
  const el = document.createElement('div');
  el.className = 'mini-snack';
  Object.assign(el.style, { width: `${size}px`, height: `${Math.round(size * 1.15)}px` });
  el.innerHTML = snackSvg(type); // static markup
  el.setAttribute('aria-hidden', 'true');
  return el;
}
