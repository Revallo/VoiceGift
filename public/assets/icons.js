// The app's icons (2026-11-26, "Soft" look): chunky, rounded, two-tone. Each icon is an outline in
// currentColor over a soft pastel fill (--ico-fill, the occasion's --wash by default), so they read as
// cute stickers rather than thin system glyphs. Every function returns trusted static SVG markup.

const FILL = 'style="fill:var(--ico-fill, var(--wash, #FFE3D3))"';

// outline: the stroked paths; fill: the soft shapes drawn underneath (no stroke).
function ic(size, outline, fill = '', sw = 2.2) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${fill ? `<g stroke="none" ${FILL}>${fill}</g>` : ''}${outline}</svg>`;
}
// solid: filled with currentColor (play, pause, stop, the mic on the big button).
const solid = (size, d) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${d}</svg>`;

export const icon = {
  // ---- actions
  back: (s = 20) => ic(s, '<path d="M14.5 5.5 8 12l6.5 6.5"/>', '', 2.6),
  x: (s = 16) => ic(s, '<path d="M7 7l10 10M17 7 7 17"/>', '', 2.6),
  arrow: (s = 18) => ic(s, '<path d="M5 12h13M12.5 6l6 6-6 6"/>', '', 2.4),
  chevronRight: (s = 16) => ic(s, '<path d="m9.5 6 6 6-6 6"/>', '', 2.4),
  chevrons: (s = 16) => ic(s, '<path d="m5 17 5-5-5-5M12 17l5-5-5-5"/>', '', 2.4),
  plus: (s = 20) => ic(s, '<path d="M12 5.5v13M5.5 12h13"/>', '', 2.6),
  check: (s = 10, sw = 4) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  menu: (s = 20) => ic(s, '<path d="M5 9h14M5 15h9"/>', '', 2.4),
  copy: (s = 18) => ic(s, '<rect x="8.5" y="8.5" width="12" height="12" rx="3.5"/><path d="M15.5 5.5v-.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.5"/>', '<rect x="8.5" y="8.5" width="12" height="12" rx="3.5"/>'),
  share: (s = 18) => ic(s, '<path d="M8 10H6.5a2.5 2.5 0 0 0-2.5 2.5v5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-5a2.5 2.5 0 0 0-2.5-2.5H16"/><path d="M12 14V3.5M8.5 7 12 3.5 15.5 7"/>', '<rect x="4" y="10" width="16" height="10" rx="2.5"/>'),
  send: (s = 18) => ic(s, '<path d="M20.5 3.5 10.5 13.5"/><path d="M20.5 3.5 14.5 20.5l-4-7-7-4z"/>', '<path d="M20.5 3.5 14.5 20.5l-4-7-7-4z"/>'),
  link: (s = 18) => ic(s, '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>'),
  redo: (s = 18) => ic(s, '<path d="M4 12a8 8 0 1 0 2.6-5.9L4 8.5"/><path d="M4 4v4.5h4.5"/>'),
  refresh: (s = 18) => ic(s, '<path d="M20 12a8 8 0 0 1-14 5.3M4 12A8 8 0 0 1 18 6.7"/><path d="M18 3v4h-4M6 21v-4h4"/>'),
  download: (s = 18) => ic(s, '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 16v1.5A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5V16"/>'),
  edit: (s = 18) => ic(s, '<path d="M15.5 4.5a2.3 2.3 0 0 1 3.3 3.3L8.5 18 4 19.5 5.5 15z"/>', '<path d="M15.5 4.5a2.3 2.3 0 0 1 3.3 3.3L8.5 18 4 19.5 5.5 15z"/>'),
  trash: (s = 18) => ic(s, '<path d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2"/><path d="M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7"/>', '<path d="M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7z"/>'),
  eye: (s = 18) => ic(s, '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/>'),
  eyeOff: (s = 18) => ic(s, '<path d="M10 5.7A9 9 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a16 16 0 0 1-2.4 3.2M6.5 7.2A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.6-1.3M3.5 3.5l17 17"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  sliders: (s = 18) => ic(s, '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/>', '<circle cx="15" cy="7" r="2.3"/><circle cx="9" cy="17" r="2.3"/>'),
  settings: (s = 18) => ic(s, '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>', '<circle cx="12" cy="12" r="6.5"/>'),

  // ---- media
  play: (s = 18) => solid(s, '<path d="M8 5.8c0-1.2 1.3-2 2.4-1.3l8.4 5.4a1.6 1.6 0 0 1 0 2.7l-8.4 5.4C9.3 18.7 8 17.9 8 16.7z"/>'),
  pause: (s = 18) => solid(s, '<rect x="6" y="4.5" width="4.6" height="15" rx="2.2"/><rect x="13.4" y="4.5" width="4.6" height="15" rx="2.2"/>'),
  stop: (s = 32) => solid(s, '<rect x="6" y="6" width="12" height="12" rx="3.5"/>'),
  mic: (s = 20) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke-linecap="round" aria-hidden="true"><rect x="8" y="2.5" width="8" height="12.5" rx="4" fill="currentColor"/><path d="M5.2 11.4a6.8 6.8 0 0 0 13.6 0M12 18.3V21.5M8.8 21.5h6.4" stroke="currentColor" stroke-width="2.2"/></svg>`,
  wave: (s = 18) => ic(s, '<path d="M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10.5v3"/>', '', 2.4),
  music: (s = 18) => ic(s, '<path d="M9 17.5V6l10-2.5v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>', '<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>'),
  speaker: (s = 18) => ic(s, '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>', '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>'),

  // ---- people & places
  user: (s = 18) => ic(s, '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>', '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0z"/>'),
  users: (s = 18) => ic(s, '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5a6 6 0 0 1 12 0"/><path d="M15.5 5.6a3.3 3.3 0 0 1 0 6M17.5 14.2a6 6 0 0 1 3.5 5.3"/>', '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5a6 6 0 0 1 12 0z"/>'),
  home: (s = 20) => ic(s, '<path d="M4 10.5 12 4l8 6.5V18a2 2 0 0 1-2 2h-3.5v-5.5h-5V20H6a2 2 0 0 1-2-2z"/>', '<path d="M4 10.5 12 4l8 6.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>'),
  globe: (s = 18) => ic(s, '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.4 3.6 5.2 3.6 8.5s-1 6.1-3.6 8.5c-2.6-2.4-3.6-5.2-3.6-8.5s1-6.1 3.6-8.5z"/>', '<circle cx="12" cy="12" r="8.5"/>'),
  smartphone: (s = 18) => ic(s, '<rect x="6" y="2.5" width="12" height="19" rx="3.5"/><path d="M11 18.2h2"/>', '<rect x="6" y="2.5" width="12" height="19" rx="3.5"/>'),
  monitor: (s = 18) => ic(s, '<rect x="2.5" y="4" width="19" height="13" rx="3"/><path d="M9 21h6M12 17v4"/>', '<rect x="2.5" y="4" width="19" height="13" rx="3"/>'),

  // ---- safety
  lock: (s = 16) => ic(s, '<rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>', '<rect x="5" y="10.5" width="14" height="10" rx="3"/>'),
  key: (s = 18) => ic(s, '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 19.5 3.5M16 7l2.5 2.5M18 5l1.5 1.5"/>', '<circle cx="8" cy="15" r="4.5"/>'),
  shield: (s = 18) => ic(s, '<path d="M12 21s7.5-3.6 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.4 12 21 12 21z"/><path d="m9 12 2.2 2.2L15.5 10"/>', '<path d="M12 21s7.5-3.6 7.5-9.5V5.5L12 3 4.5 5.5v6C4.5 17.4 12 21 12 21z"/>'),

  // ---- the gift & feelings
  gift: (s = 20) => ic(s, '<rect x="3.5" y="8" width="17" height="4.5" rx="1.5"/><path d="M5.5 12.5V18a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5.5M12 8v12"/><path d="M12 8C10.5 4 6.5 3.5 6.5 6c0 1.5 2 2 5.5 2zM12 8c1.5-4 5.5-4.5 5.5-2 0 1.5-2 2-5.5 2z"/>', '<rect x="3.5" y="8" width="17" height="4.5" rx="1.5"/><path d="M5.5 12.5h13V18a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z"/>'),
  heart: (s = 18) => ic(s, '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>', '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>'),
  smile: (s = 18) => ic(s, '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4.3 4.3 0 0 0 7 0"/><path d="M9 9.8v.4M15 9.8v.4"/>', '<circle cx="12" cy="12" r="8.5"/>'),
  sparkle: (s = 20) => ic(s, '<path d="M12 3.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5z"/><path d="M18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z"/>', '<path d="M12 3.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5z"/>'),
  star: (s = 18) => ic(s, '<path d="m12 3.8 2.4 5 5.4.7-4 3.7 1 5.4L12 16l-4.8 2.6 1-5.4-4-3.7 5.4-.7z"/>', '<path d="m12 3.8 2.4 5 5.4.7-4 3.7 1 5.4L12 16l-4.8 2.6 1-5.4-4-3.7 5.4-.7z"/>'),
  wand: (s = 18) => ic(s, '<path d="m4.5 19.5 10-10M13 8l3 3"/><path d="M17.5 3.5v3M16 5h3M20 9.5v2M19 10.5h2M9 3.5v2M8 4.5h2"/>'),
  bell: (s = 18) => ic(s, '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/><path d="M10 20.5a2.3 2.3 0 0 0 4 0"/>', '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z"/>'),
  cal: (s = 18) => ic(s, '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>', '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/>'),
  wind: (s = 30) => ic(s, '<path d="M3 9h10.5a2.5 2.5 0 1 0-2.5-2.5M3 15h14.5a2.5 2.5 0 1 1-2.5 2.5M3 12h6"/>', '', 2.4),
  print: (s = 18) => ic(s, '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2.5"/><rect x="7" y="14" width="10" height="6.5" rx="1.5"/>', '<rect x="3.5" y="9" width="17" height="8" rx="2.5"/>'),

  // ---- the scenes (occasions and kinds)
  cake: (s = 20) => ic(s, '<path d="M4 20.5h16M5.5 20.5v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6"/><path d="M5.5 16c1.5 1 3 1 4.3 0s3-1 4.4 0 2.8 1 4.3 0"/><path d="M12 12.5V9"/><path d="M12 4.2c1 1.1 1.3 1.9.9 2.6a1 1 0 0 1-1.8 0c-.4-.7-.1-1.5.9-2.6z"/>', '<path d="M5.5 20.5v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6z"/>'),
  flower: (s = 20) => ic(s, '<circle cx="12" cy="9" r="2.4"/><path d="M12 6.6a2.6 2.6 0 1 1 2.3-3.8 2.6 2.6 0 1 1 1.4 4.6 2.6 2.6 0 1 1-1.9 4.3 2.6 2.6 0 1 1-3.6 0 2.6 2.6 0 1 1-1.9-4.3 2.6 2.6 0 1 1 1.4-4.6A2.6 2.6 0 0 1 12 6.6z"/><path d="M12 13.5V21M12 18c-1.5-2-3.5-2.3-5-1.8M12 17c1.3-1.6 3-1.9 4.5-1.5"/>', '<path d="M12 6.6a2.6 2.6 0 1 1 2.3-3.8 2.6 2.6 0 1 1 1.4 4.6 2.6 2.6 0 1 1-1.9 4.3 2.6 2.6 0 1 1-3.6 0 2.6 2.6 0 1 1-1.9-4.3 2.6 2.6 0 1 1 1.4-4.6A2.6 2.6 0 0 1 12 6.6z"/>', 2),
  lantern: (s = 20) => ic(s, '<path d="M12 2.5v2.5M9 5h6"/><path d="M7.5 7h9c1.3 2 1.8 4 1.8 6s-.5 4-1.8 6h-9C6.2 17 5.7 15 5.7 13s.5-4 1.8-6z"/><path d="M9 19v1.5h6V19M12 20.5V22M12 7v12"/>', '<path d="M7.5 7h9c1.3 2 1.8 4 1.8 6s-.5 4-1.8 6h-9C6.2 17 5.7 15 5.7 13s.5-4 1.8-6z"/>', 2),
  cap: (s = 22) => ic(s, '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.3c3.3 2.3 7.7 2.3 11 0v-4.3M21.5 9.5v5"/>', '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/>'),
  ring: (s = 20) => ic(s, '<circle cx="12" cy="14.5" r="6"/><path d="m9 5.5 3 3 3-3-1.5-2.5h-3z"/>', '<path d="m9 5.5 3 3 3-3-1.5-2.5h-3z"/>'),
  ketupat: (s = 20) => ic(s, '<path d="M12 3.5 19.5 11 12 18.5 4.5 11z"/><path d="m8.3 7.3 7.4 7.4M15.7 7.3l-7.4 7.4"/><path d="M12 18.5c-.3 1.4-1.2 2.3-2.5 2.8M12 18.5c.6 1.2 1.6 1.8 2.8 2"/>', '<path d="M12 3.5 19.5 11 12 18.5 4.5 11z"/>', 2),
  envelope: (s = 20) => ic(s, '<rect x="5.5" y="3" width="13" height="18" rx="2.5"/><path d="M5.5 8.5c2 1.6 4.2 2.4 6.5 2.4s4.5-.8 6.5-2.4"/><circle cx="12" cy="11" r="1.6"/>', '<rect x="5.5" y="3" width="13" height="18" rx="2.5"/>', 2),

  // ---- decorate tools
  palette: (s = 20) => ic(s, '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.8 1.8-1.8h2.2a3.8 3.8 0 0 0 3.8-3.8c0-3.7-3.8-6.7-8.3-6.7z"/><circle cx="8" cy="11" r="1.1"/><circle cx="10.5" cy="7.3" r="1.1"/><circle cx="15" cy="7.8" r="1.1"/>', '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.8 1.8-1.8h2.2a3.8 3.8 0 0 0 3.8-3.8c0-3.7-3.8-6.7-8.3-6.7z"/>'),
  ribbon: (s = 20) => ic(s, '<path d="M12 10.5c-2-4-7-5.5-7-2.5 0 2.2 3.6 2.8 7 2.5zM12 10.5c2-4 7-5.5 7-2.5 0 2.2-3.6 2.8-7 2.5z"/><path d="m10.5 11.5-2.5 8 2.5-1.2L12 20l1.5-1.7 2.5 1.2-2.5-8"/>', '<path d="M12 10.5c-2-4-7-5.5-7-2.5 0 2.2 3.6 2.8 7 2.5zM12 10.5c2-4 7-5.5 7-2.5 0 2.2-3.6 2.8-7 2.5z"/>'),
  pattern: (s = 20) => ic(s, '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="9" cy="9" r="1.4"/><circle cx="15" cy="9" r="1.4"/><circle cx="9" cy="15" r="1.4"/><circle cx="15" cy="15" r="1.4"/>', '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/>'),
  crown: (s = 20) => ic(s, '<path d="m4 8 4 4 4-6.5 4 6.5 4-4-1.5 10h-13z"/><path d="M5.5 20.5h13"/>', '<path d="m4 8 4 4 4-6.5 4 6.5 4-4-1.5 10h-13z"/>'),
  leaf: (s = 20) => ic(s, '<path d="M5 19C5 10 10 5 19.5 4.5 19.5 14 14 19 5 19z"/><path d="M5 19 13 11"/>', '<path d="M5 19C5 10 10 5 19.5 4.5 19.5 14 14 19 5 19z"/>'),
  text: (s = 20) => ic(s, '<path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5"/>', '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/>', 2.4),
  font: (s = 20) => ic(s, '<path d="m4 19 5-14h1l5 14M6 14h7"/><path d="M17 13.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM19.5 13v6"/>'),
  sticker: (s = 20) => ic(s, '<path d="M14.5 20.5H8a4.5 4.5 0 0 1-4.5-4.5V8A4.5 4.5 0 0 1 8 3.5h8A4.5 4.5 0 0 1 20.5 8v6.5z"/><path d="M20.5 14.5h-3.5a2.5 2.5 0 0 0-2.5 2.5v3.5"/><path d="M8.5 10v.3M15.5 10v.3M9 13.5a4 4 0 0 0 5.5.5"/>', '<path d="M14.5 20.5H8a4.5 4.5 0 0 1-4.5-4.5V8A4.5 4.5 0 0 1 8 3.5h8A4.5 4.5 0 0 1 20.5 8v6.5z"/>'),
  pen: (s = 20) => ic(s, '<path d="M15 4.5a2.4 2.4 0 0 1 3.5 3.5L8 18.5 4 20l1.5-4z"/><path d="M13 6.5 17 10.5"/><path d="M14 20.5c1.5-1.5 3-1.5 4.5 0"/>', '<path d="M15 4.5a2.4 2.4 0 0 1 3.5 3.5L8 18.5 4 20l1.5-4z"/>'),
  image: (s = 20) => ic(s, '<rect x="3.5" y="4.5" width="17" height="15" rx="4"/><circle cx="9" cy="9.5" r="1.7"/><path d="m3.8 17 5-4.5 4 3.5 2.5-2 4.7 4"/>', '<rect x="3.5" y="4.5" width="17" height="15" rx="4"/>'),
  candle: (s = 20) => ic(s, '<rect x="8.5" y="10" width="7" height="11" rx="2"/><path d="M12 10V8"/><path d="M12 2.8c1.4 1.5 1.8 2.6 1.2 3.6a1.4 1.4 0 0 1-2.4 0c-.6-1 -.2-2.1 1.2-3.6z"/>', '<rect x="8.5" y="10" width="7" height="11" rx="2"/>'),
  flame: (s = 20) => ic(s, '<path d="M12 3c3.5 3.4 5 6.2 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.7-4.3.2 1.5.9 2.4 1.8 2.7C10.3 8 10.8 5.5 12 3z"/>', '<path d="M12 3c3.5 3.4 5 6.2 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.7-4.3.2 1.5.9 2.4 1.8 2.7C10.3 8 10.8 5.5 12 3z"/>'),
  bowl: (s = 20) => ic(s, '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/><path d="M9 20h6M8.5 8c0-1.5 1-2 1-3.5M12.5 8c0-1.5 1-2 1-3.5"/>', '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z"/>')
};
