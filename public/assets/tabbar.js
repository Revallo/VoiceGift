// The bar at the bottom of the main pages (home, friends, gifts, profile), like an app's.
// Focused pages (recording, opening a gift, decorating) don't have it.
import { h, icon } from './common.js';

const TABS = [
  ['/', 'Home', 'home'],
  ['/friends', 'Friends', 'user'],
  ['/?send=1', 'Send a voice', 'mic'],
  ['/gifts', 'Gifts', 'gift'],
  ['/account', 'Profile', 'settings']
];

// `onMic`: what the middle button does on this page (elsewhere it goes home and opens the sheet there).
export function tabBar({ onMic } = {}) {
  const here = location.pathname;
  const bar = h('nav', { class: 'tabbar', 'aria-label': 'Main' }, TABS.map(([href, label, ico]) => {
    const mic = ico === 'mic';
    const a = h('a', { href, class: mic ? 'tab-mic' : 'tab' + (href === here ? ' on' : ''), 'aria-label': mic ? label : null, 'aria-current': href === here ? 'page' : null, html: icon[ico](mic ? 26 : 20) });
    if (!mic) a.append(h('span', {}, label));
    if (mic && onMic) a.addEventListener('click', (e) => { e.preventDefault(); onMic(); });
    return a;
  }));
  document.querySelector('.app').append(bar);
  return bar;
}
