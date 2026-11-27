// What a gift says and how it looks, from two free choices:
//  - the GIFT (gift.cake.family): the drawing and how it opens — cake, tumpeng, bouquet, lanterns, angpao tree, river lights, gift box.
//    gift.cake.shape is that gift's style (a key of its scene's SHAPES: drip cake, tall cone, flower box, ketupat…).
//  - the OCCASION (gift.occasion): the words — greeting, inscription, sample wish, stickers, page colour. Adding one = one
//    object in OCCASIONS, no drawing. "Other" (custom) builds its words from the title the organizer typed (gift.customTitle).
// Any gift goes with any occasion (decided 2026-11-27): no choice hides another. Pages call theme(occasion, shape, family)
// for the merged words and createScene() for the drawing. Old gifts (no family) are read through normalize().
import { createCake, FLAVORS, SHAPES as CAKE_SHAPES, SWATCH as CAKE_SWATCH, ACCENTS as CREAMS, PATTERNS as CAKE_PATTERNS, TOPPERS as CAKE_TOPPERS } from './cake.js';
import { createBouquet, WRAPS, SHAPES as WRAP_SHAPES, SWATCH as WRAP_SWATCH, ACCENTS as RIBBONS, PATTERNS as PETALS, TOPPERS as WRAP_TOPPERS, GREENS } from './bouquet.js';
import { createLanterns, LIGHTS, SHAPES as LIGHT_SHAPES, SWATCH as LIGHT_SWATCH, ACCENTS as STRINGS, PATTERNS as MOTIFS, TOPPERS as LIGHT_TOPPERS } from './lanterns.js';
import { createTumpeng, FLAVORS as RICES, SHAPES as CONES, SWATCH as RICE_SWATCH, ACCENTS as TRAYS, PATTERNS as GARNISH, TOPPERS as TIPS } from './tumpeng.js';
import { createLixi, FLAVORS as BLOSSOMS, SHAPES as POTS, SWATCH as BLOSSOM_SWATCH, ACCENTS as POT_COLORS, PATTERNS as TREE_EXTRAS, TOPPERS as TREE_TOPS } from './lixi.js';
import { createGiftBox, FLAVORS as PAPERS, SHAPES as BOX_SHAPES, SWATCH as PAPER_SWATCH, ACCENTS as BOX_RIBBONS, PATTERNS as BOX_PATTERNS, TOPPERS as BOX_TOPPERS } from './gift-box.js';
import { createKrathong, FLAVORS as NIGHTS, SHAPES as FLOATS, SWATCH as NIGHT_SWATCH, ACCENTS as BANKS, PATTERNS as SKIES, TOPPERS as SKY_MARKS } from './krathong.js';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const firstName = (r) => String(r || '').trim().split(/\s+/)[0] || '';
const fullName = (r) => String(r || '').trim().replace(/\s+/g, ' '); // "Kevin Sanjaya" fits on the cake: it shrinks
const KEPT = 'Your voices are kept here. Open this link whenever you need them.';
const QUIET = 'Find a quiet moment. Turn your sound on.';

// ==================== Occasions: the words ====================
// who = what the people who record are called ("3 friends have…", "Every lantern is one guest").
export const OCCASIONS = {
  birthday: {
    key: 'birthday', label: 'Birthday', bg: '#FAF8F5', emoji: '🎂', age: true, suggest: ['cake', 'tumpeng'], sample: 'HBD! Sehat terus ya, panjang umur!',
    who: { one: 'friend', many: 'friends' },
    callName: firstName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
    decorate: { nameLabel: 'Title', nameMax: 20, name: (r) => fullName(r).slice(0, 20),
      stickers: ['✨', '🎉', '🎈', '🎁', '⭐', '🥳', '🌙', '💫', '🌸', '👑', '🎀', '🍓', '🧁', '🎶', '🤍', '🌟', '🔥', '💎', '🍀', '🦋'] },
    inviteTitle: (name) => `Wish ${name} happy birthday`,
    eyebrow: (name) => `For ${name}`,
    greeting: (name) => `Happy birthday, ${name}!`,
    reveal: { eyebrow: 'A little celebration, just for you', salutation: 'Happy birthday,', dedication: (n) => `${count(n, 'voice', 'voices')} · made with love`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A birthday wish, in their own words', keepTitle: 'A little love to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person loves', 'people love')} you.`,
    thanksText: 'Thank you for your birthday wish. Hearing your voice made my day.',
    waFriends: (name) => `Record a 15-second birthday wish for ${name}! It’s a secret, don’t tell them.`,
    waRecipient: (name) => `${name}! Your friends made you a voice gift 🎂 Turn your sound on.`
  },

  graduation: {
    key: 'graduation', label: 'Graduation', bg: '#F7F9FB', emoji: '🎓', suggest: ['bouquet', 'cake'], sample: 'Akhirnya lulus! Bangga banget sama kamu.',
    who: { one: 'friend', many: 'friends' },
    callName: firstName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Nadia',
    decorate: { nameLabel: 'Title', nameMax: 20, name: (r) => fullName(r).slice(0, 20), namePlaceholder: 'e.g. Nadia, S.Kom.',
      stickers: ['🎓', '✨', '🏆', '📜', '⭐', '🥂', '🌟', '🎉', '📚', '🥇', '👑', '💫', '🍀', '🚀', '🌸', '🎀', '🤍', '💎', '🦋', '🌻'] },
    inviteTitle: (name) => `Cheer ${name} on`,
    eyebrow: (name) => `For ${name} · Graduation day`,
    greeting: (name) => `Congratulations, ${name}!`,
    reveal: { eyebrow: 'A new chapter, celebrated together', salutation: 'Congratulations,', dedication: (n) => `${count(n, 'voice', 'voices')} · cheering you on`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A graduation wish, in their own words', keepTitle: 'Your next chapter begins with love.',
      keepSub: 'Your voices are kept here. Come back whenever you need a little encouragement.' },
    keepSub: (n) => `${count(n, 'person is', 'people are')} proud of you.`,
    thanksText: 'Thank you for celebrating my graduation with me. Your voice made my day.',
    waFriends: (name) => `Record a 15-second graduation wish for ${name}! It’s a secret, don’t tell them.`,
    waRecipient: (name) => `Congratulations, ${name}! 🎓 Your friends made you a voice gift. Turn your sound on.`
  },

  wedding: {
    key: 'wedding', label: 'Wedding', bg: '#FAF8FB', emoji: '💍', suggest: ['lanterns', 'angpao', 'river', 'cake'], sample: 'Sakinah mawaddah warahmah, langgeng terus ya!',
    who: { one: 'guest', many: 'guests' },
    callName: fullName, // "Rina & Bayu": the couple, not a first name
    people: (n) => count(n, 'guest', 'guests'),
    recipientLabel: 'The couple', recipientPlaceholder: 'e.g. Rina & Bayu',
    decorate: { nameLabel: 'Words', nameMax: 30, name: () => 'Happily ever after',
      stickers: ['💍', '✨', '🥂', '🕊️', '🤍', '🌙', '💐', '🌹', '🌸', '⭐', '🦢', '🌷', '🎶', '💌', '🌿', '💫', '🎀', '🦋', '💎', '💕'] },
    inviteTitle: (name) => `Wish ${name} well`,
    eyebrow: (name) => `${name} · Wedding`,
    greeting: (name) => name,
    reveal: { eyebrow: 'For a lifetime of little moments', salutation: 'With love for', dedication: (n) => `${count(n, 'voice', 'voices')} · celebrating your love`,
      readyNote: (n) => `${count(n, 'guest has', 'guests have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A wedding wish, in their own words', keepTitle: 'A little light to keep with you.',
      keepSub: 'Your voices are kept here. Open this link to hear your people again.' },
    keepSub: (n) => `${count(n, 'guest', 'guests')} wished you a happy life together.`,
    thanksText: 'Thank you for your wishes. Hearing your voice made our day.',
    waFriends: (name) => `Leave a 15-second voice wish for ${name}!`,
    waRecipient: (name) => `${name}, congratulations on your wedding 💍 Here are your guests’ voice wishes. Turn your sound on.`
  },

  anniversary: {
    key: 'anniversary', label: 'Anniversary', bg: '#FBF7F8', emoji: '💞', age: true, suggest: ['cake', 'lanterns', 'bouquet'], sample: 'Happy anniversary, makin sayang terus ya!',
    who: { one: 'friend', many: 'friends' },
    callName: fullName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Who it’s for', recipientPlaceholder: 'e.g. Rina & Bayu',
    decorate: { nameLabel: 'Words', nameMax: 30, name: () => 'Happy anniversary',
      stickers: ['💞', '✨', '🥂', '🌹', '💐', '🤍', '💌', '🌙', '⭐', '🎶', '🕊️', '💫', '🎀', '💎', '🌸', '🦋'] },
    inviteTitle: (name) => `Wish ${name} a happy anniversary`,
    eyebrow: (name) => `${name} · Anniversary`,
    greeting: (name) => `Happy anniversary, ${name}!`,
    reveal: { eyebrow: 'For all the years, and the ones to come', salutation: 'Happy anniversary,', dedication: (n) => `${count(n, 'voice', 'voices')} · celebrating your years`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'An anniversary wish, in their own words', keepTitle: 'A little love to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person celebrates', 'people celebrate')} you.`,
    thanksText: 'Thank you for your wishes. Hearing your voice made our day.',
    waFriends: (name) => `Record a 15-second anniversary wish for ${name}! It’s a secret, don’t tell them.`,
    waRecipient: (name) => `Happy anniversary, ${name}! 💞 Your friends made you a voice gift. Turn your sound on.`
  },

  lebaran: {
    key: 'lebaran', label: 'Lebaran', bg: '#F6FAF4', emoji: '🌙', suggest: ['lanterns', 'tumpeng', 'cake'], prefer: { lanterns: 'ketupat' }, sample: 'Minal aidin wal faizin, mohon maaf lahir dan batin.',
    who: { one: 'friend', many: 'friends' },
    callName: fullName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Who it’s for', recipientPlaceholder: 'e.g. Mama',
    decorate: { nameLabel: 'Words', nameMax: 24, name: () => 'Eid Mubarak',
      stickers: ['🌙', '✨', '🍃', '💚', '🌟', '🕊️', '🤍', '🙏', '💫', '🌿', '🎉', '🍽️'] },
    inviteTitle: (name) => `Send ${name} Eid wishes`,
    eyebrow: (name) => `For ${name} · Lebaran`,
    greeting: (name) => `Eid Mubarak, ${name}!`,
    reveal: { eyebrow: 'Wishes for a blessed Eid', salutation: 'Eid Mubarak,', dedication: (n) => `${count(n, 'voice', 'voices')} · sent with love`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'An Eid wish, in their own words', keepTitle: 'A little love to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person', 'people')} sent you their wishes.`,
    thanksText: 'Thank you for your Eid wishes. Hearing your voice made my day.',
    waFriends: (name) => `Record a 15-second Eid wish for ${name}! It’s a surprise.`,
    waRecipient: (name) => `Eid Mubarak, ${name}! 🌙 Your loved ones made you a voice gift. Turn your sound on.`
  },

  imlek: {
    key: 'imlek', label: 'Imlek', bg: '#FBF5F4', emoji: '🧧', suggest: ['angpao', 'lanterns', 'cake'], prefer: { lanterns: 'xi' }, sample: 'Gong xi fa cai, semoga rezekinya lancar!',
    who: { one: 'friend', many: 'friends' },
    callName: fullName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Who it’s for', recipientPlaceholder: 'e.g. Ama',
    decorate: { nameLabel: 'Words', nameMax: 24, name: () => 'Gong xi fa cai',
      stickers: ['🧧', '🏮', '🍊', '🪙', '🎆', '✨', '🐉', '🌸', '💰', '🌼'] },
    inviteTitle: (name) => `Send ${name} New Year wishes`,
    eyebrow: (name) => `For ${name} · Lunar New Year`,
    greeting: (name) => `Gong xi fa cai, ${name}!`,
    reveal: { eyebrow: 'Luck and love for the year ahead', salutation: 'Happy New Year,', dedication: (n) => `${count(n, 'voice', 'voices')} · for a lucky year`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A New Year wish, in their own words', keepTitle: 'Gong xi! Luck for the year ahead.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person wishes', 'people wish')} you luck.`,
    thanksText: 'Thank you for your New Year wishes. Hearing your voice made my day.',
    waFriends: (name) => `Record a 15-second Lunar New Year wish for ${name}! It’s a surprise.`,
    waRecipient: (name) => `Gong xi fa cai, ${name}! 🧧 Your loved ones made you a voice gift. Turn your sound on.`
  },

  thanks: {
    key: 'thanks', label: 'Thank you', bg: '#FBF9F2', emoji: '💛', suggest: ['bouquet', 'cake', 'lanterns'], sample: 'Makasih banyak ya, kamu baik banget.',
    who: { one: 'friend', many: 'friends' },
    callName: firstName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Pak Andi',
    decorate: { nameLabel: 'Words', nameMax: 24, name: () => 'Thank you',
      stickers: ['💛', '🙏', '✨', '🌻', '🤍', '⭐', '💐', '🎉', '🌟', '💫', '🍀', '🎀'] },
    inviteTitle: (name) => `Say thank you to ${name}`,
    eyebrow: (name) => `For ${name} · Thank you`,
    greeting: (name) => `Thank you, ${name}!`,
    reveal: { eyebrow: 'From everyone you helped', salutation: 'Thank you,', dedication: (n) => `${count(n, 'voice', 'voices')} · with gratitude`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A thank-you, in their own words', keepTitle: 'A little thanks to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person is', 'people are')} grateful for you.`,
    thanksText: 'Thank you for your words. Hearing your voice made my day.',
    waFriends: (name) => `Record a 15-second thank-you for ${name}! It’s a secret, don’t tell them.`,
    waRecipient: (name) => `${name}, this is for you 💛 Your friends made you a voice gift to say thank you. Turn your sound on.`
  },

  justbecause: {
    key: 'justbecause', label: 'Just because', bg: '#F9F7FB', emoji: '💌', suggest: ['bouquet', 'cake', 'lanterns'], sample: 'Cuma mau bilang, kamu berarti banget buat aku.',
    who: { one: 'friend', many: 'friends' },
    callName: firstName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
    decorate: { nameLabel: 'Title', nameMax: 20, name: (r) => fullName(r).slice(0, 20),
      stickers: ['💌', '✨', '🤍', '🌸', '⭐', '🌙', '💫', '🎀', '🦋', '🌷', '🍀', '🎶'] },
    inviteTitle: (name) => `Send ${name} some love`,
    eyebrow: (name) => `For ${name}`,
    greeting: (name) => `Hi, ${name}!`,
    reveal: { eyebrow: 'No reason, just love', salutation: 'Just for you,', dedication: (n) => `${count(n, 'voice', 'voices')} · made with love`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A few words, in their own voice', keepTitle: 'A little love to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person loves', 'people love')} you.`,
    thanksText: 'Thank you for your words. Hearing your voice made my day.',
    waFriends: (name) => `Record a 15-second message for ${name}! It’s a surprise, don’t tell them.`,
    waRecipient: (name) => `${name}, your friends made you a voice gift 💌 Turn your sound on.`
  },

  christmas: {
    key: 'christmas', label: 'Christmas', bg: '#F8FAF6', emoji: '🎄', suggest: ['giftbox', 'cake', 'lanterns'], sample: 'Selamat Natal, damai selalu!',
    who: { one: 'friend', many: 'friends' },
    callName: firstName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Maria',
    decorate: { nameLabel: 'Words', nameMax: 24, name: () => 'Merry Christmas',
      stickers: ['🎄', '⭐', '🔔', '🎁', '❄️', '✨', '🦌', '🧦', '☃️', '🕯️', '🤍', '🎶'] },
    inviteTitle: (name) => `Wish ${name} a merry Christmas`,
    eyebrow: (name) => `For ${name} · Christmas`,
    greeting: (name) => `Merry Christmas, ${name}!`,
    reveal: { eyebrow: 'Peace and joy, from the people who love you', salutation: 'Merry Christmas,', dedication: (n) => `${count(n, 'voice', 'voices')} · with love this Christmas`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A Christmas wish, in their own words', keepTitle: 'A little warmth to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person', 'people')} sent you Christmas wishes.`,
    thanksText: 'Thank you for your Christmas wishes. Hearing your voice made my day.',
    waFriends: (name) => `Record a Christmas wish for ${name}! It’s a surprise, don’t tell them.`,
    waRecipient: (name) => `Merry Christmas, ${name}! 🎄 Your loved ones made you a voice gift. Turn your sound on.`
  },

  business: {
    key: 'business', label: 'New business', bg: '#FAF9F4', emoji: '🏪', suggest: ['bouquet', 'giftbox', 'cake'], sample: 'Semoga laris manis!',
    who: { one: 'friend', many: 'friends' },
    callName: firstName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
    decorate: { nameLabel: 'Words', nameMax: 24, name: () => 'Grand opening',
      stickers: ['🏪', '🎉', '✨', '🚀', '🌟', '🍀', '🎊', '📈', '🥂', '💐', '🎀', '💰'] },
    inviteTitle: (name) => `Cheer on ${name}’s new business`,
    eyebrow: (name) => `For ${name} · New business`,
    greeting: (name) => `Congrats on the new business, ${name}!`,
    reveal: { eyebrow: 'A good start, cheered on together', salutation: 'Congratulations,', dedication: (n) => `${count(n, 'voice', 'voices')} · cheering you on`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A wish for your business, in their own words', keepTitle: 'A little luck to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person is', 'people are')} cheering you on.`,
    thanksText: 'Thank you for cheering me on. Hearing your voice made my day.',
    waFriends: (name) => `Record a wish for ${name}’s new business! It’s a surprise, don’t tell them.`,
    waRecipient: (name) => `Congrats on the new business, ${name}! 🏪 Your friends made you a voice gift. Turn your sound on.`
  }
};
// "Other": the organizer types the occasion themselves (gift.customTitle, up to 60 characters). Its words are built from it.
export const CUSTOM_TITLE_MAX = 60;
export function customOccasion(title) {
  const tt = String(title || '').trim().replace(/\s+/g, ' ').slice(0, CUSTOM_TITLE_MAX);
  return {
    key: 'custom', label: 'Other', bg: '#F9F7FB', emoji: '🎉', suggest: ['giftbox', 'cake', 'bouquet'], sample: 'Semangat terus, aku selalu dukung kamu!',
    who: { one: 'friend', many: 'friends' },
    callName: firstName, people: (n) => count(n, 'person', 'people'),
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
    decorate: { nameLabel: 'Words', nameMax: 30, name: (r) => (tt && tt.length <= 30 ? tt : fullName(r).slice(0, 20)),
      stickers: ['🎉', '✨', '🤍', '🌟', '🎈', '💫', '🎀', '🍀', '🌸', '🎶', '⭐', '💌'] },
    inviteTitle: (name) => `Record a message for ${name}`,
    eyebrow: (name) => (tt ? `For ${name} · ${tt}` : `For ${name}`),
    greeting: (name) => tt || `Hi, ${name}!`,
    reveal: { eyebrow: tt || 'Just for you', salutation: 'Just for you,', dedication: (n) => `${count(n, 'voice', 'voices')} · made with love`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: QUIET,
      letterLabel: 'A few words, in their own voice', keepTitle: 'A little love to come back to.', keepSub: KEPT },
    keepSub: (n) => `${count(n, 'person', 'people')} sent you their voice.`,
    thanksText: 'Thank you for your words. Hearing your voice made my day.',
    waFriends: (name) => `Record a voice message for ${name}${tt ? ` (${tt})` : ''}! It’s a surprise, don’t tell them.`,
    waRecipient: (name) => `${name}, your friends made you a voice gift 🎉 Turn your sound on.`
  };
}
OCCASIONS.custom = customOccasion('');
// the icon on each occasion's chip (icons.js)
const OCC_ICONS = { birthday: 'cake', graduation: 'cap', wedding: 'ring', anniversary: 'heart', lebaran: 'ketupat', imlek: 'envelope', thanks: 'smile', justbecause: 'sparkle', christmas: 'star', business: 'gift', custom: 'pen' };
for (const [k, o] of Object.entries(OCCASIONS)) o.icon = OCC_ICONS[k];
export const OCCASION_KEYS = Object.keys(OCCASIONS);
export const THEMES = OCCASIONS; // older name, still imported in places

// ==================== Gifts: the drawing, its items and how it opens ====================
// Each one is built for the occasion's `who` (friend / guest).
export const GIFT_INFO = {
  cake: { label: 'Cake', emoji: '🎂', icon: 'cake' },
  tumpeng: { label: 'Tumpeng', emoji: '🍚', icon: 'bowl' },
  bouquet: { label: 'Bouquet', emoji: '💐', icon: 'flower' },
  lanterns: { label: 'Lanterns', emoji: '🏮', icon: 'lantern' },
  angpao: { label: 'Angpao tree', emoji: '🧧', icon: 'envelope' },
  river: { label: 'River lights', emoji: '🪷', icon: 'sparkle' },
  giftbox: { label: 'Gift box', emoji: '🎁', icon: 'gift' }
};
export const GIFT_KEYS = Object.keys(GIFT_INFO);

const GIFTS = {
  cake: (w) => ({
    scene: 'cake', item: 'candle', items: 'candles', itemsOn: 'lit',
    decorate: { shapeLabel: 'Cake', shapes: CAKE_SHAPES, swatchLabel: 'Flavor', swatches: FLAVORS, swatch: CAKE_SWATCH, flavor: 'strawberry', accentLabel: 'Cream', accents: CREAMS, patternLabel: 'Pattern', patterns: CAKE_PATTERNS, topperLabel: 'Topper', toppers: CAKE_TOPPERS, draw: true,
      stickers: ['🎂', '🕯️', '🧁', '🍒', '🍫', '🥂'] },
    countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} added a candle` : 'Be the first to add a candle'),
    doneTitle: 'Your candle is on the cake',
    doneCount: (n) => `${count(n, 'candle', 'candles')} · yours is the one circled`,
    reveal: { readyTitle: 'A little surprise,\njust for you.', readySub: 'A cake full of familiar voices. Each candle holds a wish for you.',
      libraryTitle: 'The people behind the candles', idleTitle: 'There’s a voice in every candle.', idleSub: 'Tap a candle or a name below. Their words will appear here.',
      pagedHint: 'A few candles at a time. Pick any voice below.' },
    lightingTitle: `Your ${w.many} are lighting the candles…`,
    lightingSub: `Every candle is one ${w.one}.`,
    gaveLine: (n) => `${count(n, 'person', 'people')} lit a candle for you.`,
    progress: (i, n) => (i === n ? `All ${n} candles are lit` : `${i} of ${n} candles lit`),
    tapHint: `Each candle is a ${w.one}. Tap one to hear them.`,
    idleTitle: 'Tap a candle to hear who lit it',
    allHeard: 'You heard everyone. Now make a wish.',
    finaleBtn: 'Blow out the candles', finaleTitle: 'Make a wish…',
    finaleSub: () => 'Then blow into your phone. The candles go out.',
    cutTitle: 'The first slice is yours',
    cutSub: (n) => `Cut from a cake with ${count(n, 'wish', 'wishes')} in it.`
  }),

  tumpeng: (w) => ({
    scene: 'tumpeng', theme: 'tumpeng', bg: '#FAF9F3', item: 'dish', items: 'dishes', itemsOn: 'served',
    decorate: { shapeLabel: 'Cone', shapes: CONES, swatchLabel: 'Rice', swatches: RICES, swatch: RICE_SWATCH, flavor: 'turmeric', accentLabel: 'Tray', accents: TRAYS, patternLabel: 'Garnish', patterns: GARNISH, topperLabel: 'On top', toppers: TIPS, draw: false,
      stickers: ['🌶️', '🍃', '🥥', '🍌', '🌺', '🍚'] },
    countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} brought a dish` : 'Be the first to bring a dish'),
    doneTitle: 'Your dish is on the tumpeng',
    doneCount: (n) => `${count(n, 'dish', 'dishes')} · yours is the one circled`,
    reveal: { readyTitle: 'A tumpeng,\njust for you.', readySub: 'Every dish around it was brought by someone who loves you. Each one holds a wish.',
      libraryTitle: 'The people behind the dishes', idleTitle: 'There’s a voice in every dish.', idleSub: 'Tap a dish or a name below. Their words will appear here.' },
    lightingTitle: `Your ${w.many} are bringing the dishes…`,
    lightingSub: `Every dish is one ${w.one}.`,
    gaveLine: (n) => `${count(n, 'person', 'people')} brought a dish for you.`,
    progress: (i, n) => (i === n ? `All ${n} ${n === 1 ? 'dish is' : 'dishes are'} served` : `${i} of ${n} dishes served`),
    tapHint: `Each dish is a ${w.one}. Tap one to hear them.`,
    idleTitle: 'Tap a dish to hear who brought it',
    allHeard: 'You heard everyone. Now cut the tumpeng.',
    finaleBtn: 'Cut the tumpeng', finaleTitle: 'Cut the tumpeng!',
    finaleSub: () => 'The top is yours. Give it to someone you love.',
    finaleAction: 'Tap to cut', finaleHint: 'Just like at a real syukuran.'
  }),

  bouquet: (w) => ({
    scene: 'bouquet', item: 'flower', items: 'flowers', itemsOn: 'open',
    decorate: { shapeLabel: 'Bouquet', shapes: WRAP_SHAPES, swatchLabel: 'Wrap', swatches: WRAPS, swatch: WRAP_SWATCH, flavor: 'strawberry', accentLabel: 'Ribbon', accents: RIBBONS, patternLabel: 'Flowers', patterns: PETALS, topperLabel: 'Tuck in', toppers: WRAP_TOPPERS, greens: GREENS, draw: true,
      stickers: ['💐', '🌷', '🌸', '🌻', '🌼', '🦋'] },
    countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} added a flower` : 'Be the first to add a flower'),
    doneTitle: 'Your flower is in the bouquet',
    doneCount: (n) => `${count(n, 'flower', 'flowers')} · yours is the one circled`,
    reveal: { readyTitle: 'Something lovely,\njust for you.', readySub: 'A bouquet of familiar voices. Every flower holds a wish for you.',
      libraryTitle: 'The people behind the flowers', idleTitle: 'There’s a voice in every flower.', idleSub: 'Tap a flower or a name below. Their words will appear here.' },
    lightingTitle: 'Your bouquet is blooming…',
    lightingSub: `Every flower is one ${w.one}.`,
    gaveLine: (n) => `${count(n, 'person', 'people')} gave you a flower.`,
    progress: (i, n) => (i === n ? `All ${n} flowers are open` : `${i} of ${n} flowers open`),
    tapHint: `Each flower is a ${w.one}. Tap one to hear them.`,
    idleTitle: 'Tap a flower to hear who gave it',
    allHeard: 'You heard everyone. One last thing…',
    // the caps fly only for a graduation (COMBO below); otherwise the petals rain down
    finaleBtn: 'Shower the petals', finaleTitle: 'Shower the petals!',
    finaleSub: (n) => (n === 1 ? 'A rain of petals, just for you.' : `Petals from all ${n} ${w.many}, all at once.`),
    finaleAction: 'Tap to shower', finaleHint: 'Every wish comes down together.', caps: false
  }),

  lanterns: (w) => ({
    scene: 'lanterns', item: 'lantern', items: 'lanterns', itemsOn: 'lit',
    decorate: { shapeLabel: 'Lanterns', shapes: LIGHT_SHAPES, swatchLabel: 'Lights', swatches: LIGHTS, swatch: LIGHT_SWATCH, flavor: 'vanilla', accentLabel: 'String', accents: STRINGS, patternLabel: 'Motif', patterns: MOTIFS, topperLabel: 'Mark', toppers: LIGHT_TOPPERS, draw: false,
      stickers: ['🏮', '🌙', '⭐', '✨', '🕯️', '💫'] },
    countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} hung a lantern` : 'Be the first to hang a lantern'),
    doneTitle: 'Your lantern is hanging',
    doneCount: (n) => `${count(n, 'lantern', 'lanterns')} · yours is the one circled`,
    reveal: { readyTitle: 'A sky full of wishes,\njust for you.', readySub: 'Familiar voices, glowing together. Every lantern carries a wish for you.',
      libraryTitle: 'The people behind the lanterns', idleTitle: 'There’s a voice in every lantern.', idleSub: 'Tap a lantern or a name below. Their words will appear here.' },
    lightingTitle: 'Your lanterns are lighting up…',
    lightingSub: `Every lantern is one ${w.one}.`,
    gaveLine: (n) => `${count(n, w.one, w.many)} hung a lantern for you.`,
    progress: (i, n) => (i === n ? `All ${n} lanterns are lit` : `${i} of ${n} lanterns lit`),
    tapHint: `Every lantern is a ${w.one}. Tap one to hear them.`,
    idleTitle: 'Tap a lantern to hear who hung it',
    allHeard: 'You heard everyone. Now let the wishes go.',
    finaleBtn: 'Release the lanterns', finaleTitle: 'Release the lanterns',
    finaleSub: (n) => (n === 1 ? 'The wish floats up.' : `All ${n} wishes float up together.`),
    finaleAction: 'Tap to release', finaleHint: `Every ${w.one}’s wish goes up with them.`
  }),

  // A blossom tree where everyone hangs a red envelope (angpao / phong bì / ang pao). The finale opens them all.
  angpao: (w) => ({
    scene: 'lixi', theme: 'angpao', bg: '#FBF7F5', item: 'envelope', items: 'envelopes', itemsOn: 'hung',
    pickLabel: 'Your envelope on the tree',
    decorate: { shapeLabel: 'Pot', shapes: POTS, swatchLabel: 'Blossoms', swatches: BLOSSOMS, swatch: BLOSSOM_SWATCH, flavor: 'mai', accentLabel: 'Pot colour', accents: POT_COLORS, patternLabel: 'On the branches', patterns: TREE_EXTRAS, topperLabel: 'On top', toppers: TREE_TOPS, draw: false,
      stickers: ['🧧', '🌼', '🌸', '🏮', '💮', '🪙', '💰', '🎆'] },
    countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} hung an envelope` : 'Be the first to hang an envelope'),
    doneTitle: 'Your envelope is on the tree',
    doneCount: (n) => `${count(n, 'envelope', 'envelopes')} · yours is the one circled`,
    reveal: { readyTitle: 'A tree full of blessings,\njust for you.', readySub: `Every red envelope holds a wish from a ${w.one}, in their own voice.`,
      libraryTitle: 'The people behind the envelopes', idleTitle: 'There’s a voice in every envelope.', idleSub: 'Tap an envelope or a name below. Their words will appear here.' },
    lightingTitle: `Your ${w.many} are hanging their envelopes…`,
    lightingSub: `Every envelope is one ${w.one}.`,
    gaveLine: (n) => `${count(n, w.one, w.many)} hung an envelope for you.`,
    progress: (i, n) => (i === n ? `All ${n} ${n === 1 ? 'envelope is' : 'envelopes are'} on the tree` : `${i} of ${n} envelopes on the tree`),
    tapHint: `Every envelope is a ${w.one}. Tap one to hear them.`,
    idleTitle: 'Tap an envelope to hear who hung it',
    allHeard: 'You heard everyone. Now open the envelopes.',
    finaleBtn: 'Open the envelopes', finaleTitle: 'Open the envelopes!',
    finaleSub: (n) => (n === 1 ? 'A little luck, just for you.' : `A little luck from all ${n} ${w.many}.`),
    finaleAction: 'Tap to open', finaleHint: 'Every envelope is full of wishes.'
  }),

  // Everyone floats a little light of banana leaf and flowers down a river at night.
  river: (w) => ({
    scene: 'krathong', theme: 'river', bg: '#F6F8FB', item: 'light', items: 'lights', itemsOn: 'afloat',
    pickLabel: 'The flowers on your floating light',
    decorate: { shapeLabel: 'Float', shapes: FLOATS, swatchLabel: 'Night', swatches: NIGHTS, swatch: NIGHT_SWATCH, flavor: 'moonlit', accentLabel: 'Far bank', accents: BANKS, patternLabel: 'Sky', patterns: SKIES, topperLabel: 'Mark', toppers: SKY_MARKS, draw: false,
      stickers: ['🌕', '🌸', '🌼', '🌊', '🐟', '🌙'] },
    countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} floated a light` : 'Be the first to float a light'),
    doneTitle: 'Your light is on the river',
    doneCount: (n) => `${count(n, 'light', 'lights')} · yours is the one circled`,
    reveal: { readyTitle: 'A river of wishes,\njust for you.', readySub: `Every light on the water carries a ${w.one}’s wish, in their own voice.`,
      libraryTitle: 'The people behind the lights', idleTitle: 'There’s a voice in every light.', idleSub: 'Tap a light or a name below. Their words will appear here.' },
    lightingTitle: `Your ${w.many} are lighting the river…`,
    lightingSub: `Every light is one ${w.one}.`,
    gaveLine: (n) => `${count(n, w.one, w.many)} floated a light for you.`,
    progress: (i, n) => (i === n ? `All ${n} ${n === 1 ? 'light is' : 'lights are'} afloat` : `${i} of ${n} lights afloat`),
    tapHint: `Every light is a ${w.one}. Tap one to hear them.`,
    idleTitle: 'Tap a light to hear who floated it',
    allHeard: 'You heard everyone. Now let the wishes float away.',
    finaleBtn: 'Float the lights', finaleTitle: 'Float the lights',
    finaleSub: (n) => (n === 1 ? 'The wish drifts down the river.' : `All ${n} wishes drift down the river together.`),
    finaleAction: 'Tap to float', finaleHint: 'The river carries every wish with it.'
  }),

  // A big gift box with a little glowing present around it for every voice. The finale opens the big box.
  giftbox: (w) => ({
    scene: 'giftbox', item: 'present', items: 'presents', itemsOn: 'glowing',
    decorate: { shapeLabel: 'Box', shapes: BOX_SHAPES, swatchLabel: 'Paper', swatches: PAPERS, swatch: PAPER_SWATCH, flavor: 'red', accentLabel: 'Ribbon', accents: BOX_RIBBONS, patternLabel: 'Print', patterns: BOX_PATTERNS, topperLabel: 'On top', toppers: BOX_TOPPERS, draw: true,
      stickers: ['🎁', '🎀', '✨', '🎉', '🎊', '💝'] },
    countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} added a present` : 'Be the first to add a present'),
    doneTitle: 'Your present is by the box',
    doneCount: (n) => `${count(n, 'present', 'presents')} · yours is the one circled`,
    reveal: { readyTitle: 'A box full of surprises,\njust for you.', readySub: `Every little present holds a ${w.one}’s wish, in their own voice.`,
      libraryTitle: 'The people behind the presents', idleTitle: 'There’s a voice in every present.', idleSub: 'Tap a present or a name below. Their words will appear here.' },
    lightingTitle: `Your ${w.many} are bringing their presents…`,
    lightingSub: `Every present is one ${w.one}.`,
    gaveLine: (n) => `${count(n, 'person', 'people')} brought you a present.`,
    progress: (i, n) => (i === n ? `All ${n} ${n === 1 ? 'present is' : 'presents are'} glowing` : `${i} of ${n} presents glowing`),
    tapHint: `Every present is a ${w.one}. Tap one to hear them.`,
    idleTitle: 'Tap a present to hear who brought it',
    allHeard: 'You heard everyone. Now open the big box.',
    finaleBtn: 'Open the box', finaleTitle: 'Open the box!',
    finaleSub: (n) => (n === 1 ? 'One last surprise inside.' : `One last surprise from all ${n} ${w.many}.`),
    finaleAction: 'Tap to open', finaleHint: 'Every wish comes out at once.'
  })
};

// Some styles change the words: a money or snack bouquet holds notes / snacks, not flowers; Hội An lanterns float
// down a river instead of up into the sky; ketupat are woven palm leaf, not paper.
const treatWords = (w, one, many, verb, what) => ({
  item: one, items: many, itemsOn: 'in',
  countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} added a ${one}` : `Be the first to add a ${one}`),
  doneTitle: `Your ${one} is in the bouquet`,
  doneCount: (n) => `${count(n, one, many)} · yours is the one circled`,
  lightingTitle: 'Your bouquet is filling up…',
  lightingSub: `Every ${one} is one ${w.one}.`,
  gaveLine: (n) => `${count(n, 'person', 'people')} ${verb} for you.`,
  progress: (i, n) => (i === n ? `All ${n} ${many} are in` : `${i} of ${n} ${many} in`),
  tapHint: `Each ${one} is a ${w.one}. Tap one to hear them.`,
  idleTitle: `Tap a ${one} to hear who added it`,
  reveal: { libraryTitle: `The people behind the ${many}`, idleTitle: `There’s a voice in every ${one}.`, idleSub: `Tap a ${one} or a name below. Their words will appear here.`,
    readySub: `A ${what} bouquet of familiar voices. Every ${one} holds a wish for you.` }
});
const BY_STYLE = {
  bouquet: {
    money: (w) => treatWords(w, 'note', 'notes', 'tucked in a note', 'money'),
    snack: (w) => treatWords(w, 'snack', 'snacks', 'brought a snack', 'snack')
  },
  lanterns: {
    hoian: () => ({
      allHeard: 'You heard everyone. Now let the wishes float away.',
      finaleBtn: 'Float the lanterns', finaleTitle: 'Float the lanterns',
      finaleSub: (n) => (n === 1 ? 'The wish drifts down the river.' : `All ${n} wishes drift down the river together.`),
      finaleAction: 'Tap to float', finaleHint: 'Like the lantern nights on the river in Hội An.',
      reveal: { readyTitle: 'A river of wishes,\njust for you.' }
    }),
    ketupat: (w) => ({
      item: 'ketupat', items: 'ketupat', itemsOn: 'hung',
      decorate: { accent: 'leaf', stickers: ['🌙', '✨', '🍃', '💚', '🌟', '🕊️'] },
      countLine: (n) => (n ? `${count(n, `${w.one} has`, `${w.many} have`)} hung a ketupat` : 'Be the first to hang a ketupat'),
      doneTitle: 'Your ketupat is hanging',
      doneCount: (n) => `${count(n, 'ketupat', 'ketupat')} · yours is the one circled`,
      reveal: { readyTitle: 'A string of ketupat,\njust for you.', readySub: `Every ketupat holds a ${w.one}’s wish, in their own voice.`,
        libraryTitle: 'The people behind the ketupat', idleTitle: 'There’s a voice in every ketupat.', idleSub: 'Tap a ketupat or a name below. Their words will appear here.' },
      lightingTitle: 'Your ketupat are lighting up…',
      lightingSub: `Every ketupat is one ${w.one}.`,
      gaveLine: (n) => `${count(n, w.one, w.many)} hung a ketupat for you.`,
      progress: (i, n) => (i === n ? `All ${n} ketupat are lit` : `${i} of ${n} ketupat lit`),
      tapHint: `Every ketupat is a ${w.one}. Tap one to hear them.`,
      idleTitle: 'Tap a ketupat to hear who hung it',
      finaleBtn: 'Release the ketupat', finaleTitle: 'Release the ketupat'
    })
  }
};

// Where an occasion and a gift need their own words or look together. Every other pair just merges.
const COMBO = {
  'graduation:bouquet': () => ({
    finaleBtn: 'Throw your cap', finaleTitle: 'Throw your cap!', caps: true,
    finaleSub: (n) => `Your ${count(n, 'friend throws theirs', 'friends throw theirs')} with you.`,
    finaleAction: 'Tap to throw', finaleHint: 'Just like the real ceremony, all together.',
    reveal: { readySub: 'A bouquet of familiar voices. Every flower holds a wish for your next chapter.' }
  }),
  'wedding:bouquet': () => ({ finaleBtn: 'Toss the bouquet', finaleTitle: 'Toss the bouquet!', finaleAction: 'Tap to toss', finaleHint: 'Every guest’s wish comes down like petals.' }),
  'wedding:cake': () => ({ finaleBtn: 'Blow the candles together', finaleTitle: 'Make a wish together…', cutTitle: 'The first slice is yours to share' }),
  'anniversary:cake': () => ({ finaleBtn: 'Blow the candles together', finaleTitle: 'Make a wish together…', cutTitle: 'The first slice is yours to share' }),
  'wedding:angpao': () => ({ finaleSub: (n) => (n === 1 ? 'A little luck for the two of you.' : `A little luck from all ${n} guests.`), reveal: { keepTitle: 'A little luck for your life together.' } }),
  // the angpao tree dressed for Chinese New Year: lucky red and gold with a dragon backdrop
  'imlek:angpao': () => ({ theme: 'imlek',
    decorate: { flavor: 'mix', accent: 'red', pattern: 'lanterns', topper: 'fireworks', backdrop: 'dragon', stickers: ['🧧', '🐉', '🏮', '🍊', '🪙', '🎆', '✨', '🌸'] },
    reveal: { readyTitle: 'A lucky red tree,\njust for you.' } })
};

// ==================== Old gifts ====================
// Before 2026-11-27 the occasion picked the gift and gift.cake.shape held a "kind": tumpeng / angpao / imlek / river drew
// another scene. Read them as gift + style; the old Imlek kind keeps its red-and-gold look (dressed).
const LEGACY_KINDS = { tumpeng: 'tumpeng', angpao: 'angpao', imlek: 'angpao', river: 'river' };
export function normalize(occasion, shape, family) {
  let occ = occasion === 'tumpeng' ? 'birthday' : occasion === 'other' ? 'justbecause' : occasion;
  if (!OCCASIONS[occ]) occ = 'birthday';
  let fam = GIFT_INFO[family] ? family : null, style = shape || 'classic', dressed = null;
  if (!fam) {
    fam = occasion === 'tumpeng' ? 'tumpeng' : LEGACY_KINDS[shape] || (occ === 'graduation' ? 'bouquet' : occ === 'wedding' ? 'lanterns' : 'cake');
    if (LEGACY_KINDS[shape]) { if (shape === 'imlek') dressed = 'imlek'; style = 'classic'; }
  }
  return { occasion: occ, family: fam, shape: style, dressed };
}
export const familyOf = (gift) => normalize(gift?.occasion, gift?.cake?.shape, gift?.cake?.family).family;

const COUPLE = /&|\+|\band\b|\bdan\b/i;
// The words and decorate lists of one gift for one occasion.
export function theme(occasion, shape, family, title) {
  const n = normalize(occasion, shape, family);
  const o = n.occasion === 'custom' ? customOccasion(title) : OCCASIONS[n.occasion];
  const g = GIFTS[n.family](o.who);
  const s = BY_STYLE[n.family]?.[n.shape]?.(o.who) || {};
  const c = COMBO[`${n.dressed || n.occasion}:${n.family}`]?.(o.who) || {};
  const { decorate: od, reveal: or, ...oWords } = o;
  const stickers = [...new Set([...(c.decorate?.stickers || []), ...(s.decorate?.stickers || []), ...od.stickers, ...g.decorate.stickers])];
  const decorate = { ...g.decorate, ...od, ...s.decorate, ...c.decorate, stickers };
  // the age only makes sense when the years count (a birthday, an anniversary)
  if (!o.age) decorate.toppers = Object.fromEntries(Object.entries(decorate.toppers).filter(([, v]) => !v.age));
  return {
    ...oWords, ...g, ...s, ...c,
    key: o.key, family: n.family, style: n.shape, gift: GIFT_INFO[n.family],
    theme: c.theme || g.theme || o.key, bg: g.bg || o.bg,
    callName: (r) => (COUPLE.test(String(r || '')) ? fullName(r) : o.callName(r)),
    decorate, reveal: { ...or, ...g.reveal, ...s.reveal, ...c.reveal }
  };
}
export const giftTheme = (gift) => theme(gift?.occasion, gift?.cake?.shape, gift?.cake?.family, gift?.customTitle);

// Quick starts on home: a gift and an occasion already picked. Everything stays changeable on /new.
export const TEMPLATES = [
  { occasion: 'birthday', gift: 'cake', label: 'Birthday cake' },
  { occasion: 'graduation', gift: 'bouquet', label: 'Graduation bouquet' },
  { occasion: 'wedding', gift: 'lanterns', label: 'Wedding lanterns' },
  { occasion: 'lebaran', gift: 'lanterns', style: 'ketupat', label: 'Lebaran ketupat' },
  { occasion: 'imlek', gift: 'angpao', label: 'Imlek angpao' }
];

const SCENES = { giftbox: createGiftBox, cake: createCake, tumpeng: createTumpeng, bouquet: createBouquet, lanterns: createLanterns, lixi: createLixi, krathong: createKrathong };

export function createScene(host, gift, opts = {}) {
  const cake = gift.cake || {};
  const t = giftTheme(gift);
  const o = { ...opts, local: cake.local, flavor: cake.flavor || t.decorate.flavor, shape: t.style, font: cake.font, name: cake.name, dots: cake.dots, stickers: cake.stickers, accent: cake.accent, pattern: cake.pattern, topper: cake.topper, age: cake.age, backdrop: cake.backdrop, greens: cake.greens, names: gift.recipient };
  return (SCENES[t.scene] || createCake)(host, o);
}

// Colours the page (background wash, theme-color) for a gift.
export function applyTheme(occasion, shape, family, title) {
  const t = theme(occasion, shape, family, title);
  document.body.dataset.theme = t.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  return t;
}
