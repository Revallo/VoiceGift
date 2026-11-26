// The occasions. Each one has its own scene and its own words; the flow is the same everywhere.
// Pages call theme(gift.occasion) for the words and createScene() for the cake / bouquet / lanterns.
import { createCake, FLAVORS, SHAPES as CAKE_SHAPES, SWATCH as CAKE_SWATCH, ACCENTS as CREAMS, PATTERNS as CAKE_PATTERNS, TOPPERS as CAKE_TOPPERS } from './cake.js';
import { createBouquet, WRAPS, SHAPES as WRAP_SHAPES, SWATCH as WRAP_SWATCH, ACCENTS as RIBBONS, PATTERNS as PETALS, TOPPERS as WRAP_TOPPERS, GREENS } from './bouquet.js';
import { createLanterns, LIGHTS, SHAPES as LIGHT_SHAPES, SWATCH as LIGHT_SWATCH, ACCENTS as STRINGS, PATTERNS as MOTIFS, TOPPERS as LIGHT_TOPPERS } from './lanterns.js';
import { createTumpeng, FLAVORS as RICES, SHAPES as CONES, SWATCH as RICE_SWATCH, ACCENTS as TRAYS, PATTERNS as GARNISH, TOPPERS as TIPS } from './tumpeng.js';
import { createLixi, FLAVORS as BLOSSOMS, SHAPES as POTS, SWATCH as BLOSSOM_SWATCH, ACCENTS as POT_COLORS, PATTERNS as TREE_EXTRAS, TOPPERS as TREE_TOPS } from './lixi.js';
import { createKrathong, FLAVORS as NIGHTS, SHAPES as FLOATS, SWATCH as NIGHT_SWATCH, ACCENTS as BANKS, PATTERNS as SKIES, TOPPERS as SKY_MARKS } from './krathong.js';

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const firstName = (r) => String(r || '').trim().split(/\s+/)[0] || '';
const fullName = (r) => String(r || '').trim().replace(/\s+/g, ' '); // "Kevin Sanjaya" fits on the cake: it shrinks


export const THEMES = {
  birthday: {
    key: 'birthday', label: 'Birthday', bg: '#1C1A18', emoji: '🎂', scene: 'cake',
    callName: firstName,
    people: (n) => count(n, 'person', 'people'),
    item: 'candle', items: 'candles', itemsOn: 'lit',
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
    decorate: { next: 'Next: customize gift', title: 'Customize birthday gift', lead: 'style, inscription & accents', shapeLabel: 'Cake', shapes: { ...CAKE_SHAPES, tumpeng: { label: 'Tumpeng' } }, swatchLabel: 'Flavor', swatches: FLAVORS, swatch: CAKE_SWATCH, flavor: 'strawberry', accentLabel: 'Cream', accents: CREAMS, patternLabel: 'Pattern', patterns: CAKE_PATTERNS, topperLabel: 'Topper', toppers: CAKE_TOPPERS, nameLabel: 'Title', nameMax: 20, name: (r) => fullName(r).slice(0, 20), draw: true,
      stickers: ['✨', '🕯️', '🥂', '🎁', '⭐', '🌙', '🎉', '🎈', '💫', '🌸', '👑', '🎀', '🍓', '🍒', '🧁', '🍫', '🎶', '🤍', '🌟', '🔥', '💎', '🍀', '🦋', '🎂'] },
    inviteTitle: (name) => `Record a message for ${name}’s birthday`,
    countLine: (n) => (n ? `${count(n, 'friend has', 'friends have')} added a candle` : 'Be the first to add a candle'),
    doneTitle: 'Your candle is on the cake',
    doneCount: (n) => `${count(n, 'candle', 'candles')} · yours is the one circled`,
    eyebrow: (name) => `For ${name}`,
    reveal: {
      eyebrow: 'A little celebration, just for you',
      salutation: 'Happy birthday,',
      readyTitle: 'A little surprise,\njust for you.',
      readySub: 'A cake full of familiar voices. Each candle holds a wish for you.',
      dedication: (n) => `${count(n, 'voice', 'voices')} · made with love`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`,
      soundHint: 'Find a quiet moment. Turn your sound on.',
      letterLabel: 'A birthday wish, in their own words',
      libraryTitle: 'The people behind the candles',
      idleTitle: 'There’s a voice in every candle.',
      idleSub: 'Tap a candle or a name below. Their words will appear here.',
      pagedHint: 'A few candles at a time. Pick any voice below.',
      keepTitle: 'A little love to come back to.',
      keepSub: 'Your voices are kept here. Open this link whenever you need them.'
    },
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
    cutTitle: 'The first slice is yours',
    cutSub: (n) => `Cut from a cake with ${count(n, 'wish', 'wishes')} in it.`,
    keepSub: (n) => `${count(n, 'person loves', 'people love')} you.`,
    thanksText: 'Thank you for your birthday wish. Hearing your voice made my day.',
    waFriends: (name) => `Record a 15-second birthday wish for ${name}! It’s a secret, don’t tell them.`,
    waRecipient: (name) => `${name}! Your friends made you a voice gift 🎂 Turn your sound on.`
  },

  graduation: {
    key: 'graduation', label: 'Graduation', bg: '#191B1F', emoji: '🎓', scene: 'bouquet',
    callName: firstName,
    people: (n) => count(n, 'person', 'people'),
    item: 'flower', items: 'flowers', itemsOn: 'open',
    recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Nadia',
    decorate: { next: 'Next: customize gift', title: 'Customize graduation gift', lead: 'wrap, title & accents', shapeLabel: 'Bouquet', shapes: WRAP_SHAPES, swatchLabel: 'Wrap', swatches: WRAPS, swatch: WRAP_SWATCH, flavor: 'strawberry', accentLabel: 'Ribbon', accents: RIBBONS, patternLabel: 'Flowers', patterns: PETALS, topperLabel: 'Tuck in', toppers: WRAP_TOPPERS, greens: GREENS, nameLabel: 'Title', nameMax: 20, name: (r) => fullName(r).slice(0, 20), namePlaceholder: 'e.g. Nadia, S.Kom.', draw: true,
      stickers: ['🎓', '✨', '🏆', '📜', '⭐', '🥂', '💐', '🌷', '🌟', '🎉', '📚', '🥇', '👑', '💫', '🍀', '🚀', '🌸', '🎀', '🤍', '💎', '🦋', '🌙', '🌻', '🎶'] },
    inviteTitle: (name) => `Record a message for ${name}’s graduation`,
    countLine: (n) => (n ? `${count(n, 'friend has', 'friends have')} added a flower` : 'Be the first to add a flower'),
    doneTitle: 'Your flower is in the bouquet',
    doneCount: (n) => `${count(n, 'flower', 'flowers')} · yours is the one circled`,
    eyebrow: (name) => `For ${name} · Graduation day`,
    reveal: {
      eyebrow: 'A new chapter, celebrated together', salutation: 'Congratulations,',
      readyTitle: 'Something lovely,\njust for you.', readySub: 'A bouquet of familiar voices. Every flower holds a wish for your next chapter.',
      dedication: (n) => `${count(n, 'voice', 'voices')} · cheering you on`,
      readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`, soundHint: 'Find a quiet moment. Turn your sound on.',
      letterLabel: 'A graduation wish, in their own words', libraryTitle: 'The people behind the flowers',
      idleTitle: 'There’s a voice in every flower.', idleSub: 'Tap a flower or a name below. Their words will appear here.',
      keepTitle: 'Your next chapter begins with love.', keepSub: 'Your voices are kept here. Come back whenever you need a little encouragement.'
    },
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
    key: 'wedding', label: 'Wedding', bg: '#191C1A', emoji: '💍', scene: 'lanterns',
    callName: (r) => String(r || '').trim(), // "Rina & Bayu": the couple, not a first name
    people: (n) => count(n, 'guest', 'guests'),
    item: 'lantern', items: 'lanterns', itemsOn: 'lit',
    recipientLabel: 'The couple', recipientPlaceholder: 'e.g. Rina & Bayu',
    decorate: { next: 'Next: customize gift', title: 'Customize wedding gift', lead: 'lights, message & accents', shapeLabel: 'Lanterns', shapes: { ...LIGHT_SHAPES, angpao: { label: 'Angpao tree' }, river: { label: 'River lights' } }, swatchLabel: 'Lights', swatches: LIGHTS, swatch: LIGHT_SWATCH, flavor: 'vanilla', accentLabel: 'String', accents: STRINGS, patternLabel: 'Motif', patterns: MOTIFS, topperLabel: 'Mark', toppers: LIGHT_TOPPERS, nameLabel: 'Words', nameMax: 30, name: () => 'Happily ever after', draw: false,
      stickers: ['💍', '✨', '🥂', '🕊️', '🤍', '🕯️', '🌙', '💐', '🌹', '🌸', '⭐', '🦢', '🌷', '🎶', '💌', '🌿', '💫', '🎀', '🦋', '🎊', '💎', '👑', '💕', '🍰'] },
    inviteTitle: (name) => `Leave a voice message for ${name}`,
    countLine: (n) => (n ? `${count(n, 'guest has', 'guests have')} hung a lantern` : 'Be the first to hang a lantern'),
    doneTitle: 'Your lantern is hanging',
    doneCount: (n) => `${count(n, 'lantern', 'lanterns')} · yours is the one circled`,
    eyebrow: (name) => `${name} · Wedding`,
    reveal: {
      eyebrow: 'For a lifetime of little moments', salutation: 'With love for',
      readyTitle: 'A sky full of wishes,\njust for you.', readySub: 'Familiar voices, glowing together. Every lantern carries a wish for you.',
      dedication: (n) => `${count(n, 'voice', 'voices')} · celebrating your love`,
      readyNote: (n) => `${count(n, 'guest has', 'guests have')} something to tell you.`, soundHint: 'Find a quiet moment. Turn your sound on.',
      letterLabel: 'A wedding wish, in their own words', libraryTitle: 'The people behind the lanterns',
      idleTitle: 'There’s a voice in every lantern.', idleSub: 'Tap a lantern or a name below. Their words will appear here.',
      keepTitle: 'A little light to keep with you.', keepSub: 'Your voices are kept here. Open this link to hear your people again.'
    },
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
  },

};

// Some kinds change the words: a money or snack bouquet holds notes / snacks, not flowers, and the Hội An
// lanterns float down a river instead of up into the sky.
const treatWords = (one, many, verb) => ({
  item: one, items: many, itemsOn: 'in',
  countLine: (n) => (n ? `${count(n, 'friend has', 'friends have')} added a ${one}` : `Be the first to add a ${one}`),
  doneTitle: `Your ${one} is in the bouquet`,
  doneCount: (n) => `${count(n, one, many)} · yours is the one circled`,
  lightingTitle: 'Your bouquet is filling up…',
  lightingSub: `Every ${one} is one friend.`,
  gaveLine: (n) => `${count(n, 'person', 'people')} ${verb} for you.`,
  progress: (i, n) => (i === n ? `All ${n} ${many} are in` : `${i} of ${n} ${many} in`),
  tapHint: `Each ${one} is a friend. Tap one to hear them.`,
  idleTitle: `Tap a ${one} to hear who added it`,
  reveal: {
    libraryTitle: `The people behind the ${many}`,
    idleTitle: `There’s a voice in every ${one}.`,
    idleSub: `Tap a ${one} or a name below. Their words will appear here.`
  }
});
// Birthday, kind "tumpeng" (an Indonesian birthday): a cone of rice with a side dish from every friend.
const TUMPENG = {
  scene: 'tumpeng', theme: 'tumpeng', bg: '#16170F',
  callName: firstName,
  people: (n) => count(n, 'person', 'people'),
  item: 'dish', items: 'dishes', itemsOn: 'served',
  recipientLabel: 'Their name', recipientPlaceholder: 'e.g. Dimas',
  decorate: { next: 'Next: customize gift', title: 'Customize your tumpeng', lead: 'rice, tray & garnish', shapeLabel: 'Tumpeng', shapes: CONES, swatchLabel: 'Rice', swatches: RICES, swatch: RICE_SWATCH, flavor: 'turmeric', accentLabel: 'Tray', accents: TRAYS, patternLabel: 'Garnish', patterns: GARNISH, topperLabel: 'On top', toppers: TIPS, nameLabel: 'Title', nameMax: 24, name: (r) => fullName(r).slice(0, 24), draw: false,
    stickers: ['🌶️', '🍃', '✨', '🎉', '🎈', '🌺', '⭐', '🥥', '🍌', '🎁', '💛', '🌟', '🎶', '🙏', '🥳', '🌼', '🎀', '🍀', '💫', '🔥', '🌙', '👑', '🤍', '🍚'] },
  inviteTitle: (name) => `Record a message for ${name}’s birthday`,
  countLine: (n) => (n ? `${count(n, 'friend has', 'friends have')} brought a dish` : 'Be the first to bring a dish'),
  doneTitle: 'Your dish is on the tumpeng',
  doneCount: (n) => `${count(n, 'dish', 'dishes')} · yours is the one circled`,
  eyebrow: (name) => `For ${name}`,
  reveal: {
    eyebrow: 'A little celebration, just for you',
    salutation: 'Happy birthday,',
    readyTitle: 'A tumpeng,\njust for you.',
    readySub: 'Every dish around it was brought by someone who loves you. Each one holds a wish.',
    dedication: (n) => `${count(n, 'voice', 'voices')} · made with love`,
    readyNote: (n) => `${count(n, 'person has', 'people have')} something to tell you.`,
    soundHint: 'Find a quiet moment. Turn your sound on.',
    letterLabel: 'A birthday wish, in their own words',
    libraryTitle: 'The people behind the dishes',
    idleTitle: 'There’s a voice in every dish.',
    idleSub: 'Tap a dish or a name below. Their words will appear here.',
    keepTitle: 'A little love to come back to.',
    keepSub: 'Your voices are kept here. Open this link whenever you need them.'
  },
  lightingTitle: 'Your friends are bringing the dishes…',
  lightingSub: 'Every dish is one friend.',
  gaveLine: (n) => `${count(n, 'person', 'people')} brought a dish for you.`,
  progress: (i, n) => (i === n ? `All ${n} ${n === 1 ? 'dish is' : 'dishes are'} served` : `${i} of ${n} dishes served`),
  greeting: (name) => `Happy birthday, ${name}!`,
  tapHint: 'Each dish is a friend. Tap one to hear them.',
  idleTitle: 'Tap a dish to hear who brought it',
  allHeard: 'You heard everyone. Now cut the tumpeng.',
  finaleBtn: 'Cut the tumpeng',
  finaleTitle: 'Cut the tumpeng!',
  finaleSub: () => 'The top is yours. Give it to someone you love.',
  finaleAction: 'Tap to cut',
  finaleHint: 'Just like at a real syukuran.',
  keepSub: (n) => `${count(n, 'person loves', 'people love')} you.`,
  thanksText: 'Thank you for your birthday wish. Hearing your voice made my day.',
  waFriends: (name) => `Record a 15-second birthday wish for ${name}! It’s a secret, don’t tell them.`,
  waRecipient: (name) => `${name}! Your friends made you a voice tumpeng 🍚 Turn your sound on.`
};

// Wedding, kind "angpao": a blossom tree where every guest hangs a red envelope (angpao / phong bì / ang pao),
// the way guests give the couple an envelope at the door. The finale opens them all.
const ANGPAO = {
  scene: 'lixi', theme: 'angpao', bg: '#1E1012',
  item: 'envelope', items: 'envelopes', itemsOn: 'hung',
  pickLabel: 'Your envelope on the tree',
  decorate: { shapeLabel: 'Lanterns', swatchLabel: 'Blossoms', swatches: BLOSSOMS, swatch: BLOSSOM_SWATCH, flavor: 'mai', accentLabel: 'Pot colour', accents: POT_COLORS, patternLabel: 'On the branches', patterns: TREE_EXTRAS, topperLabel: 'On top', toppers: TREE_TOPS,
    stickers: ['🧧', '🌼', '🌸', '🏮', '💮', '🪙', '💰', '🎆'] },
  countLine: (n) => (n ? `${count(n, 'guest has', 'guests have')} hung an envelope` : 'Be the first to hang an envelope'),
  doneTitle: 'Your envelope is on the tree',
  doneCount: (n) => `${count(n, 'envelope', 'envelopes')} · yours is the one circled`,
  reveal: {
    readyTitle: 'A tree full of blessings,\njust for you.',
    readySub: 'Every red envelope holds a wish from a guest, in their own voice.',
    libraryTitle: 'The people behind the envelopes',
    idleTitle: 'There’s a voice in every envelope.',
    idleSub: 'Tap an envelope or a name below. Their words will appear here.',
    keepTitle: 'A little luck for your life together.'
  },
  lightingTitle: 'Your guests are hanging their envelopes…',
  lightingSub: 'Every envelope is one guest.',
  gaveLine: (n) => `${count(n, 'guest', 'guests')} hung an envelope for you.`,
  progress: (i, n) => (i === n ? `All ${n} ${n === 1 ? 'envelope is' : 'envelopes are'} on the tree` : `${i} of ${n} envelopes on the tree`),
  tapHint: 'Every envelope is a guest. Tap one to hear them.',
  idleTitle: 'Tap an envelope to hear who hung it',
  allHeard: 'You heard everyone. Now open the envelopes.',
  finaleBtn: 'Open the envelopes', finaleTitle: 'Open the envelopes!',
  finaleSub: (n) => (n === 1 ? 'A little luck for the two of you.' : `A little luck from all ${n} guests.`),
  finaleAction: 'Tap to open', finaleHint: 'Every envelope is full of wishes.'
};

// Wedding, kind "river": every guest floats a little light of banana leaf and flowers down a river at night.
const RIVER = {
  scene: 'krathong', theme: 'river', bg: '#0B1226',
  item: 'light', items: 'lights', itemsOn: 'afloat',
  pickLabel: 'The flowers on your floating light',
  decorate: { swatchLabel: 'Night', swatches: NIGHTS, swatch: NIGHT_SWATCH, flavor: 'moonlit', accentLabel: 'Far bank', accents: BANKS, patternLabel: 'Sky', patterns: SKIES, topperLabel: 'Mark', toppers: SKY_MARKS,
    stickers: ['🌕', '🌸', '🌼', '🌊', '🐟', '🌙'] },
  countLine: (n) => (n ? `${count(n, 'guest has', 'guests have')} floated a light` : 'Be the first to float a light'),
  doneTitle: 'Your light is on the river',
  doneCount: (n) => `${count(n, 'light', 'lights')} · yours is the one circled`,
  reveal: {
    readyTitle: 'A river of wishes,\njust for you.',
    readySub: 'Every light on the water carries a guest’s wish, in their own voice.',
    libraryTitle: 'The people behind the lights',
    idleTitle: 'There’s a voice in every light.',
    idleSub: 'Tap a light or a name below. Their words will appear here.'
  },
  lightingTitle: 'Your guests are lighting the river…',
  lightingSub: 'Every light is one guest.',
  gaveLine: (n) => `${count(n, 'guest', 'guests')} floated a light for you.`,
  progress: (i, n) => (i === n ? `All ${n} ${n === 1 ? 'light is' : 'lights are'} afloat` : `${i} of ${n} lights afloat`),
  tapHint: 'Every light is a guest. Tap one to hear them.',
  idleTitle: 'Tap a light to hear who floated it',
  allHeard: 'You heard everyone. Now let the wishes float away.',
  finaleBtn: 'Float the lights', finaleTitle: 'Float the lights',
  finaleSub: (n) => (n === 1 ? 'The wish drifts down the river.' : `All ${n} wishes drift down the river together.`),
  finaleAction: 'Tap to float', finaleHint: 'The river carries every wish with it.'
};

const BY_SHAPE = {
  birthday: { tumpeng: TUMPENG },
  graduation: {
    money: { ...treatWords('note', 'notes', 'tucked in a note'), reveal: { ...treatWords('note', 'notes').reveal, readySub: 'A money bouquet of familiar voices. Every note holds a wish for your next chapter.' } },
    snack: { ...treatWords('snack', 'snacks', 'brought a snack'), reveal: { ...treatWords('snack', 'snacks').reveal, readySub: 'A snack bouquet of familiar voices. Every snack holds a wish for your next chapter.' } }
  },
  wedding: {
    hoian: {
      allHeard: 'You heard everyone. Now let the wishes float away.',
      finaleBtn: 'Float the lanterns', finaleTitle: 'Float the lanterns',
      finaleSub: (n) => (n === 1 ? 'The wish drifts down the river.' : `All ${n} wishes drift down the river together.`),
      finaleAction: 'Tap to float', finaleHint: 'Like the lantern nights on the river in Hội An.',
      reveal: { readyTitle: 'A river of wishes,\njust for you.' }
    },
    angpao: ANGPAO,
    river: RIVER
  }
};
// The words (and, for kinds that draw another scene, the decorate lists) of a gift. Old "tumpeng" gifts, from when it
// was an occasion of its own, open as a birthday tumpeng.
export function theme(occasion, shape) {
  if (occasion === 'tumpeng') return theme('birthday', 'tumpeng');
  const t = THEMES[occasion] || THEMES.birthday;
  const o = BY_SHAPE[t.key]?.[shape];
  if (!o) return t;
  // a kind with its own scene keeps the occasion's strip of kinds, so you can still slide back to the others
  const decorate = o.decorate ? { ...t.decorate, ...o.decorate, shapes: t.decorate.shapes, stickers: [...o.decorate.stickers, ...t.decorate.stickers.filter((e) => !o.decorate.stickers.includes(e))] } : t.decorate;
  return { ...t, ...o, decorate, reveal: { ...t.reveal, ...o.reveal } };
}

const SCENES = { cake: createCake, tumpeng: createTumpeng, bouquet: createBouquet, lanterns: createLanterns, lixi: createLixi, krathong: createKrathong };

// The scene for a gift: the occasion's own (cake, bouquet, lanterns), or the one its kind draws (tumpeng, angpao tree, river).
export function createScene(host, gift, opts = {}) {
  const cake = gift.cake || {};
  const t = theme(gift.occasion, cake.shape);
  const o = { ...opts, local: cake.local, flavor: cake.flavor || t.decorate.flavor, shape: cake.shape, font: cake.font, name: cake.name, dots: cake.dots, stickers: cake.stickers, accent: cake.accent, pattern: cake.pattern, topper: cake.topper, age: cake.age, backdrop: cake.backdrop, greens: cake.greens, names: gift.recipient };
  return (SCENES[t.scene] || createCake)(host, o);
}

// Colours the page for the occasion (background, theme-color).
export function applyTheme(occasion, shape) {
  const t = theme(occasion, shape);
  document.body.dataset.theme = t.theme || t.key;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
  return t;
}
