// The occasions. Each one has its own scene and its own words; the flow is the same everywhere.
// Pages call theme(gift.occasion) for the words and createScene() for the cake / bouquet / lanterns.
import { createCake, FLAVORS, SHAPES as CAKE_SHAPES, SWATCH as CAKE_SWATCH } from './cake.js';
import { createBouquet, WRAPS, SHAPES as WRAP_SHAPES, SWATCH as WRAP_SWATCH } from './bouquet.js';
import { createLanterns, LIGHTS, SHAPES as LIGHT_SHAPES, SWATCH as LIGHT_SWATCH } from './lanterns.js';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const firstName = (r) => String(r || '').trim().split(/\s+/)[0] || '';


export const THEMES = {
  birthday: {
    key: 'birthday', label: 'Birthday', bg: '#1A0C19', emoji: '🎂',
    callName: firstName,
    people: (n) => count(n, 'person', 'people'),
    item: 'candle', items: 'candles', itemsOn: 'lit',
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
    decorate: { next: 'Next: customize gift', title: 'Customize birthday gift', lead: 'style, inscription & accents', shapeLabel: 'Cake', shapes: CAKE_SHAPES, swatchLabel: 'Flavor', swatches: FLAVORS, swatch: CAKE_SWATCH, flavor: 'strawberry', nameLabel: 'Title', nameMax: 14, name: (r) => firstName(r).slice(0, 14), draw: true,
      stickers: ['✨', '🕯️', '🥂', '🎁', '⭐', '🌙', '🎉', '🎈', '💫', '🌸', '👑', '🎀', '🍓', '🍒', '🧁', '🍫', '🎶', '🤍', '🌟', '🔥', '💎', '🍀', '🦋', '🎂'] },
    inviteTitle: (name) => `Record a message for ${name}’s birthday`,
    tip: (name) => `start by calling ${name}’s name, then say your wish.`,
    countLine: (n) => (n ? `${count(n, 'friend has', 'friends have')} added a candle` : 'Be the first to add a candle'),
    doneTitle: 'Your candle is on the cake',
    doneCount: (n) => `${count(n, 'candle', 'candles')} · yours is the one circled`,
    eyebrow: (name) => `For ${name}`,
    lightingTitle: 'Your friends are lighting the candles…',
    lightingSub: 'Every candle is one friend.',
    gaveLine: (n) => `${count(n, 'person', 'people')} lit a candle for you.`,
    progress: (i, n) => (i === n ? `All ${n} candles are lit` : `${i} of ${n} candles lit`),
    greeting: (name) => `Happy birthday, ${name}!`,
    tapHint: 'Each candle is a friend. Tap one to hear them.',
    idleTitle: 'Tap a candle to hear who lit it',
    allHeard: 'You heard everyone. Now make a wish.',
    finaleBtn: 'Blow out the candles',
    finaleTitle: 'Make a wish…',
    finaleSub: () => 'Then blow into your phone. The candles go out.',
    keepSub: (n) => `${count(n, 'person loves', 'people love')} you.`,
    waFriends: (name) => `Yuk rekam ucapan 15 detik buat ${name}! Rahasia ya, jangan bilang dia.`,
    waRecipient: (name) => `${name}! Ada kado suara dari teman-teman buat kamu 🎂 Nyalakan suaranya ya.`
  },

  graduation: {
    key: 'graduation', label: 'Graduation', bg: '#141A3A', emoji: '🎓',
    callName: firstName,
    people: (n) => count(n, 'person', 'people'),
    item: 'flower', items: 'flowers', itemsOn: 'open',
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Nadia',
    decorate: { next: 'Next: customize gift', title: 'Customize graduation gift', lead: 'wrap, title & accents', shapeLabel: 'Bouquet', shapes: WRAP_SHAPES, swatchLabel: 'Wrap', swatches: WRAPS, swatch: WRAP_SWATCH, flavor: 'strawberry', nameLabel: 'Title', nameMax: 18, name: (r) => firstName(r).slice(0, 18), namePlaceholder: 'e.g. Nadia, S.Kom.', draw: true,
      stickers: ['🎓', '✨', '🏆', '📜', '⭐', '🥂', '💐', '🌷', '🌟', '🎉', '📚', '🥇', '👑', '💫', '🍀', '🚀', '🌸', '🎀', '🤍', '💎', '🦋', '🌙', '🌻', '🎶'] },
    inviteTitle: (name) => `Record a message for ${name}’s graduation`,
    tip: (name) => `start by calling ${name}’s name, then say how proud you are.`,
    countLine: (n) => (n ? `${count(n, 'friend has', 'friends have')} added a flower` : 'Be the first to add a flower'),
    doneTitle: 'Your flower is in the bouquet',
    doneCount: (n) => `${count(n, 'flower', 'flowers')} · yours is the one circled`,
    eyebrow: (name) => `For ${name} · Graduation day`,
    lightingTitle: 'Your bouquet is blooming…',
    lightingSub: 'Every flower is one friend.',
    gaveLine: (n) => `${count(n, 'person', 'people')} gave you a flower.`,
    progress: (i, n) => (i === n ? `All ${n} flowers are open` : `${i} of ${n} flowers open`),
    greeting: (name) => `Congratulations, ${name}!`,
    tapHint: 'Each flower is a friend. Tap one to hear them.',
    idleTitle: 'Tap a flower to hear who gave it',
    allHeard: 'You heard everyone. One last thing…',
    finaleBtn: 'Throw your cap',
    finaleTitle: 'Throw your cap!',
    finaleSub: (n) => `Your ${count(n, 'friend throws theirs', 'friends throw theirs')} with you.`,
    finaleAction: 'Tap to throw',
    finaleHint: 'Just like the real ceremony, all together.',
    keepSub: (n) => `${count(n, 'person is', 'people are')} proud of you.`,
    waFriends: (name) => `Yuk rekam ucapan 15 detik buat wisudanya ${name}! Rahasia ya, jangan bilang dia.`,
    waRecipient: (name) => `${name}! Selamat wisuda 🎓 Ada kado suara dari teman-teman buat kamu. Nyalakan suaranya ya.`
  },

  wedding: {
    key: 'wedding', label: 'Wedding', bg: '#11201B', emoji: '💍',
    callName: (r) => String(r || '').trim(), // "Rina & Bayu": the couple, not a first name
    people: (n) => count(n, 'guest', 'guests'),
    item: 'lantern', items: 'lanterns', itemsOn: 'lit',
    recipientLabel: 'The couple', recipientPlaceholder: 'e.g. Rina & Bayu',
    decorate: { next: 'Next: customize gift', title: 'Customize wedding gift', lead: 'lights, message & accents', shapeLabel: 'Lanterns', shapes: LIGHT_SHAPES, swatchLabel: 'Lights', swatches: LIGHTS, swatch: LIGHT_SWATCH, flavor: 'vanilla', nameLabel: 'Words', nameMax: 30, name: () => 'Selamat menempuh hidup baru', draw: false,
      stickers: ['💍', '✨', '🥂', '🕊️', '🤍', '🕯️', '🌙', '💐', '🌹', '🌸', '⭐', '🦢', '🌷', '🎶', '💌', '🌿', '💫', '🎀', '🦋', '🎊', '💎', '👑', '💕', '🍰'] },
    inviteTitle: (name) => `Leave a voice message for ${name}`,
    tip: (name) => `start with their names (${name}), then say your wish.`,
    countLine: (n) => (n ? `${count(n, 'guest has', 'guests have')} hung a lantern` : 'Be the first to hang a lantern'),
    doneTitle: 'Your lantern is hanging',
    doneCount: (n) => `${count(n, 'lantern', 'lanterns')} · yours is the one circled`,
    eyebrow: (name) => `${name} · Wedding`,
    lightingTitle: 'Your lanterns are lighting up…',
    lightingSub: 'Every lantern is one guest.',
    gaveLine: (n) => `${count(n, 'guest', 'guests')} hung a lantern for you.`,
    progress: (i, n) => (i === n ? `All ${n} lanterns are lit` : `${i} of ${n} lanterns lit`),
    greeting: (name) => name,
    tapHint: 'Every lantern is a guest. Tap one to hear them.',
    idleTitle: 'Tap a lantern to hear who hung it',
    allHeard: 'You heard everyone. Now let the wishes go.',
    finaleBtn: 'Release the lanterns',
    finaleTitle: 'Release the lanterns',
    finaleSub: (n) => (n === 1 ? 'The wish floats up.' : `All ${n} wishes float up together.`),
    finaleAction: 'Tap to release',
    finaleHint: 'Every guest’s wish goes up with them.',
    keepSub: (n) => `${count(n, 'guest', 'guests')} wished you a happy life together.`,
    waFriends: (name) => `Yuk tinggalkan ucapan suara 15 detik buat ${name}!`,
    waRecipient: (name) => `${name}, selamat menempuh hidup baru 💍 Ini ucapan suara dari para tamu. Nyalakan suaranya ya.`
  }
};

export const theme = (occasion) => THEMES[occasion] || THEMES.birthday;

// The scene for a gift: cake, bouquet or lanterns.
export function createScene(host, gift, opts = {}) {
  const t = theme(gift.occasion);
  const cake = gift.cake || {};
  const o = { ...opts, flavor: cake.flavor || t.decorate.flavor, shape: cake.shape, font: cake.font, name: cake.name, dots: cake.dots, stickers: cake.stickers };
  if (t.key === 'graduation') return createBouquet(host, o);
  if (t.key === 'wedding') return createLanterns(host, { ...o, names: gift.recipient });
  return createCake(host, o);
}

// Colours the page for the occasion (background, theme-color).
export function applyTheme(occasion) {
  const t = theme(occasion);
  document.body.dataset.theme = t.key;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  return t;
}
