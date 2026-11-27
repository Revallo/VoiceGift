// Shared visual choices for a friend's own flower or lantern.
export const ITEM_COLORS = {
  gold: { label: 'Gold', hex: '#F9B949' }, pink: { label: 'Pink', hex: '#F48AB5' },
  coral: { label: 'Coral', hex: '#FF8277' }, mint: { label: 'Mint', hex: '#60CBB3' },
  blue: { label: 'Blue', hex: '#79B9F2' }, lilac: { label: 'Lilac', hex: '#B89AEC' },
  white: { label: 'Ivory', hex: '#F5E6BF' }
};
export const FLOWER_TYPES = { round: { label: 'Round' }, tulip: { label: 'Tulip' }, rose: { label: 'Rose' }, daisy: { label: 'Daisy' } };
// The local touch of a gift (gift.cake.local). 'none' = no country. Details (stickers, money, detection) in local.js.
export const LOCAL_KEYS = ['none', 'id', 'th', 'ph', 'vn'];
// The snack a friend puts in a snack bouquet (message.flower.snack). Popular snacks of each country, drawn as
// look-alike packs without brand names or logos (drawings in local.js). local '' = the set for "no country".
export const SNACK_TYPES = {
  noodles: { label: 'Instant noodles', local: 'id' }, kopi: { label: 'Coffee sachet', local: 'id' },
  wafer: { label: 'Choco wafer', local: 'id' }, potato: { label: 'Potato chips', local: 'id' },
  basreng: { label: 'Spicy basreng', local: 'id' }, tehbox: { label: 'Jasmine tea', local: 'id' },
  mama: { label: 'Instant noodles', local: 'th' }, seaweed: { label: 'Seaweed crisps', local: 'th' },
  thaitea: { label: 'Thai milk tea', local: 'th' }, mango: { label: 'Dried mango', local: 'th' },
  squid: { label: 'Squid snack', local: 'th' }, rolls: { label: 'Coconut rolls', local: 'th' },
  pancit: { label: 'Pancit canton', local: 'ph' }, chocnut: { label: 'Choco nut bar', local: 'ph' },
  garlic: { label: 'Garlic corn', local: 'ph' }, mangoes: { label: 'Dried mangoes', local: 'ph' },
  polvoron: { label: 'Polvoron', local: 'ph' }, threeinone: { label: '3-in-1 coffee', local: 'ph' },
  mi: { label: 'Instant noodles', local: 'vn' }, caphe: { label: 'Iced coffee', local: 'vn' },
  banhpia: { label: 'Bánh pía', local: 'vn' }, jackfruit: { label: 'Jackfruit chips', local: 'vn' },
  banhtrang: { label: 'Rice paper snack', local: 'vn' }, keodua: { label: 'Coconut candy', local: 'vn' },
  choco: { label: 'Chocolate bar', local: '' }, chips: { label: 'Chips', local: '' },
  cookies: { label: 'Cookies', local: '' }, gummy: { label: 'Gummy bears', local: '' },
  juice: { label: 'Juice box', local: '' }, candy: { label: 'Candy', local: '' }
};
// The side dish a friend puts around the tumpeng (message.dish = { type }). Drawings in tumpeng.js.
export const DISH_TYPES = {
  satay: { label: 'Satay', tint: '#A65A2A' }, ketupat: { label: 'Ketupat', tint: '#7DB04E' },
  lontong: { label: 'Lontong', tint: '#9CC75A' }, chicken: { label: 'Fried chicken', tint: '#D08A35' },
  egg: { label: 'Egg', tint: '#F4B728' }, tempeh: { label: 'Tempeh', tint: '#C8A061' },
  perkedel: { label: 'Perkedel', tint: '#D59A45' }, krupuk: { label: 'Krupuk', tint: '#EBC9A0' },
  urap: { label: 'Urap', tint: '#5E9C3A' }, sambal: { label: 'Sambal', tint: '#D8361F' },
  fish: { label: 'Fried fish', tint: '#B8742F' }, tofu: { label: 'Tofu', tint: '#E1A94A' }
};
// The envelope a friend hangs on the Tết tree (message.item = { type }). Drawings in lixi.js. Never white or black
// (funerals), no zodiac, no characters that read as religious.
export const ENVELOPE_TYPES = {
  red: { label: 'Classic red', tint: '#D42A2A' }, loc: { label: 'Lộc gold', tint: '#E8B53A' },
  blossom: { label: 'Mai blossom', tint: '#F2C230' }, peach: { label: 'Peach blossom', tint: '#F08AA8' },
  coin: { label: 'Gold coin', tint: '#E9A93A' }, koi: { label: 'Koi', tint: '#F0663A' },
  lantern: { label: 'Lantern', tint: '#E8452E' },
  dragon: { label: 'Gold dragon', tint: '#E8B53A' }, scale: { label: 'Dragon scales', tint: '#D6343A' },
  cloud: { label: 'Lucky clouds', tint: '#E46A3A' }
};
// The flowers on a friend's krathong (message.item = { type }), a float of banana leaf. Drawings in krathong.js.
export const KRATHONG_TYPES = {
  marigold: { label: 'Marigold', tint: '#F59A1E' }, lotus: { label: 'Lotus', tint: '#F38BB0' },
  orchid: { label: 'Orchid', tint: '#B47AE0' }, jasmine: { label: 'Jasmine', tint: '#F4EEDC' },
  rose: { label: 'Rose', tint: '#E8506A' }, butterflypea: { label: 'Butterfly pea', tint: '#5A7BE0' }
};
