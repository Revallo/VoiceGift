// The occasions. Each one has its own scene and its own words; the flow is the same everywhere.
// Pages call theme(gift.occasion) for the words and createScene() for the cake / bouquet / lanterns.
import { createCake, FLAVORS, SHAPES as CAKE_SHAPES, SWATCH as CAKE_SWATCH } from './cake.js';
import { createBouquet, WRAPS, SHAPES as WRAP_SHAPES, SWATCH as WRAP_SWATCH } from './bouquet.js';
import { createLanterns, LIGHTS, SHAPES as LIGHT_SHAPES, SWATCH as LIGHT_SWATCH } from './lanterns.js';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const firstName = (r) => String(r || '').trim().split(/\s+/)[0] || '';
const fullName = (r) => String(r || '').trim().replace(/\s+/g, ' '); // "Kevin Sanjaya" fits on the cake: it shrinks


export const THEMES = {
  birthday: {
    key: 'birthday', label: 'Birthday', bg: '#1C1120', emoji: '🎂',
    callName: firstName,
    people: (n) => count(n, 'person', 'people'),
    item: 'candle', items: 'candles', itemsOn: 'lit',
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
    decorate: { next: 'Next: customize gift', title: 'Customize birthday gift', lead: 'style, inscription & accents', shapeLabel: 'Cake', shapes: CAKE_SHAPES, swatchLabel: 'Flavor', swatches: FLAVORS, swatch: CAKE_SWATCH, flavor: 'strawberry', nameLabel: 'Title', nameMax: 20, name: (r) => fullName(r).slice(0, 20), draw: true,
      stickers: ['✨', '🕯️', '🥂', '🎁', '⭐', '🌙', '🎉', '🎈', '💫', '🌸', '👑', '🎀', '🍓', '🍒', '🧁', '🍫', '🎶', '🤍', '🌟', '🔥', '💎', '🍀', '🦋', '🎂'] },
    inviteTitle: (name) => `Record a message for ${name}’s birthday`,
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
    thanksText: 'Thank you for your birthday wish. Hearing your voice made my day.',
    waFriends: (name) => `Record a 15-second birthday wish for ${name}! It’s a secret, don’t tell them.`,
    waRecipient: (name) => `${name}! Your friends made you a voice gift 🎂 Turn your sound on.`
  },

  graduation: {
    key: 'graduation', label: 'Graduation', bg: '#131A3B', emoji: '🎓',
    callName: firstName,
    people: (n) => count(n, 'person', 'people'),
    item: 'flower', items: 'flowers', itemsOn: 'open',
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Nadia',
    decorate: { next: 'Next: customize gift', title: 'Customize graduation gift', lead: 'wrap, title & accents', shapeLabel: 'Bouquet', shapes: WRAP_SHAPES, swatchLabel: 'Wrap', swatches: WRAPS, swatch: WRAP_SWATCH, flavor: 'strawberry', nameLabel: 'Title', nameMax: 20, name: (r) => fullName(r).slice(0, 20), namePlaceholder: 'e.g. Nadia, S.Kom.', draw: true,
      stickers: ['🎓', '✨', '🏆', '📜', '⭐', '🥂', '💐', '🌷', '🌟', '🎉', '📚', '🥇', '👑', '💫', '🍀', '🚀', '🌸', '🎀', '🤍', '💎', '🦋', '🌙', '🌻', '🎶'] },
    inviteTitle: (name) => `Record a message for ${name}’s graduation`,
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
    thanksText: 'Thank you for celebrating my graduation with me. Your voice made my day.',
    waFriends: (name) => `Record a 15-second graduation wish for ${name}! It’s a secret, don’t tell them.`,
    waRecipient: (name) => `Congratulations, ${name}! 🎓 Your friends made you a voice gift. Turn your sound on.`
  },

  wedding: {
    key: 'wedding', label: 'Wedding', bg: '#10241E', emoji: '💍',
    callName: (r) => String(r || '').trim(), // "Rina & Bayu": the couple, not a first name
    people: (n) => count(n, 'guest', 'guests'),
    item: 'lantern', items: 'lanterns', itemsOn: 'lit',
    recipientLabel: 'The couple', recipientPlaceholder: 'e.g. Rina & Bayu',
    decorate: { next: 'Next: customize gift', title: 'Customize wedding gift', lead: 'lights, message & accents', shapeLabel: 'Lanterns', shapes: LIGHT_SHAPES, swatchLabel: 'Lights', swatches: LIGHTS, swatch: LIGHT_SWATCH, flavor: 'vanilla', nameLabel: 'Words', nameMax: 30, name: () => 'Happily ever after', draw: false,
      stickers: ['💍', '✨', '🥂', '🕊️', '🤍', '🕯️', '🌙', '💐', '🌹', '🌸', '⭐', '🦢', '🌷', '🎶', '💌', '🌿', '💫', '🎀', '🦋', '🎊', '💎', '👑', '💕', '🍰'] },
    inviteTitle: (name) => `Leave a voice message for ${name}`,
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
    thanksText: 'Thank you for your wishes. Hearing your voice made our day.',
    waFriends: (name) => `Leave a 15-second voice wish for ${name}!`,
    waRecipient: (name) => `${name}, congratulations on your wedding 💍 Here are your guests’ voice wishes. Turn your sound on.`
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
