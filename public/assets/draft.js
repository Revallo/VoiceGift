// A voice recorded on the Record tab before it has a gift to go to. It is kept on this phone only (IndexedDB),
// never on the server: it is uploaded once the person has picked a gift, ticked the consent box and tapped go
// (see record.js, "?draft=1"). One draft at a time; it is forgotten after a day.

const DAY = 24 * 60 * 60 * 1000;

function open() {
  return new Promise((ok, fail) => {
    const r = indexedDB.open('voice-gift', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('draft');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}

async function store(mode, fn) {
  const db = await open();
  return new Promise((ok, fail) => {
    const tx = db.transaction('draft', mode);
    const req = fn(tx.objectStore('draft'));
    tx.oncomplete = () => { db.close(); ok(req.result); };
    tx.onerror = tx.onabort = () => { db.close(); fail(tx.error); };
  });
}

// wav: the Blob from recorder.js. Throws when the phone won't keep it (some private windows).
export function saveDraft(wav, durationSec) {
  return store('readwrite', (s) => s.put({ wav, durationSec, at: Date.now() }, 'one'));
}

// { wav, durationSec, at } or null.
export async function loadDraft() {
  try {
    const d = await store('readonly', (s) => s.get('one'));
    return d && d.wav && Date.now() - d.at < DAY ? d : null;
  } catch {
    return null;
  }
}

export function clearDraft() {
  return store('readwrite', (s) => s.delete('one')).catch(() => {});
}
