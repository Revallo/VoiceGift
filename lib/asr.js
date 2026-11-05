// Speech recognition seam. This is the ONLY place to change when the company ASR API is ready.
//
// Set these environment variables to use a real ASR service:
//   ASR_URL      e.g. https://asr.example.com/v1/transcribe
//   ASR_API_KEY  sent as "Authorization: Bearer <key>"
// The request body is the WAV file (16 kHz, mono, 16-bit) with Content-Type audio/wav and ?lang=id.
// Expected response: { "text": "...", "words": [{ "w": "...", "start": 0.1, "end": 0.4, "conf": 0.92 }] }  (words optional)
// If the real API has a different shape, adapt `fromProvider()` below.

export const asrProvider = process.env.ASR_URL ? 'http' : 'mock';

export function evenWords(text, durationSec, lowConfSet = new Set(), speechStartSec = 0, speechEndSec = null) {
  const parts = String(text).split(/\s+/).filter(Boolean);
  const d = Math.max(0.5, Number(durationSec) || 1);
  const startBase = Math.max(0, Math.min(d - 0.3, Number(speechStartSec) || 0));
  const endBase = speechEndSec != null ? Math.max(startBase + 0.3, Math.min(d, Number(speechEndSec))) : d;
  const activeSpan = Math.max(0.3, endBase - startBase);
  const step = activeSpan / Math.max(1, parts.length);
  return parts.map((w, i) => {
    const clean = w.replace(/[.,!?…]+$/g, '').toLowerCase();
    const isLow = lowConfSet.has(clean);
    return {
      w,
      start: +(startBase + i * step).toFixed(2),
      end: +(startBase + (i + 1) * step).toFixed(2),
      conf: isLow ? 0.58 : 0.94
    };
  });
}

function fromProvider(json, durationSec, speechStartSec = 0, speechEndSec = null) {
  const text = String(json.text ?? json.transcript ?? '').trim();
  const words = Array.isArray(json.words) && json.words.length
    ? json.words.map((x) => ({
        w: String(x.w ?? x.word ?? ''),
        start: Number(x.start) || 0,
        end: Number(x.end) || 0,
        conf: Number(x.conf ?? x.confidence ?? 0.9)
      }))
    : evenWords(text, durationSec, new Set(), speechStartSec, speechEndSec);
  const typos = Array.isArray(json.typos) ? json.typos : [];
  return { text, words, typos };
}

// Simulates how an ~70%-accurate Indonesian ASR model splits or phoneticizes proper names
function phoneticSplitName(recipient) {
  const clean = String(recipient || 'Dimas').trim();
  if (!clean) return { wrong: 'di mas', right: 'Dimas' };
  if (clean.includes('&') || /\bdan\b/i.test(clean)) {
    const parts = clean.split(/\s*(?:&|\bdan\b)\s*/i).filter(Boolean);
    if (parts.length >= 2) {
      const p1 = parts[0].toLowerCase();
      const p2 = parts[1];
      const p2split = p2.length >= 4 ? `${p2.slice(0, 2).toLowerCase()} ${p2.slice(2).toLowerCase()}` : p2.toLowerCase();
      return { wrong: `${p1} dan ${p2split}`, right: `${parts[0]} & ${parts[1]}` };
    }
  }
  const first = clean.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
  if (!first || first.length < 4) return { wrong: first.toLowerCase() || 'di mas', right: first || 'Dimas' };
  // Find a natural syllable split (after first vowel or 2 chars)
  const m = first.match(/^([^aiueoAIUEO]*[aiueoAIUEO])(.{2,})$/);
  const a = (m ? m[1] : first.slice(0, 2)).toLowerCase();
  const b = (m ? m[2] : first.slice(2)).toLowerCase();
  return { wrong: `${a} ${b}`, right: first };
}

function buildMockAsr(occasion, recipient, durationSec, speechStartSec = 0, speechEndSec = null) {
  const namePair = phoneticSplitName(recipient);
  const templates = {
    birthday: {
      text: `Selamat ulang taun, ${namePair.wrong}! Inget nggak waktu kita di hukum lari keliling lapangan? Sukses trus ya, bro.`,
      typos: [
        { wrong: namePair.wrong, right: namePair.right, reason: 'Proper name split by ASR', conf: 0.54 },
        { wrong: 'taun', right: 'tahun', reason: 'Colloquial spelling', conf: 0.62 },
        { wrong: 'di hukum', right: 'dihukum', reason: 'Passive prefix di-', conf: 0.59 },
        { wrong: 'trus', right: 'terus', reason: 'Informal vowel drop', conf: 0.65 }
      ]
    },
    graduation: {
      text: `Selamat wis udah, ${namePair.wrong}! Begadang ngerjain sekripsi akhirnya terbayar juga. Sukses trus di dunia kerja ya!`,
      typos: [
        { wrong: 'wis udah', right: 'wisuda', reason: 'Homophone phrase split', conf: 0.51 },
        { wrong: namePair.wrong, right: namePair.right, reason: 'Proper name split by ASR', conf: 0.55 },
        { wrong: 'sekripsi', right: 'skripsi', reason: 'Spoken vowel insertion', conf: 0.63 },
        { wrong: 'trus', right: 'terus', reason: 'Informal vowel drop', conf: 0.66 }
      ]
    },
    wedding: {
      text: `Selamat menempuh hidup baru, ${namePair.wrong}! Semoga jadi keluarga yang sakinah mawadah warohmah dan bahagia selamanya.`,
      typos: [
        { wrong: namePair.wrong, right: namePair.right, reason: 'Couple names & capitalization', conf: 0.53 },
        { wrong: 'mawadah', right: 'mawaddah', reason: 'Loanword spelling', conf: 0.61 },
        { wrong: 'warohmah', right: 'warahmah', reason: 'Phonetic vowel variant', conf: 0.60 }
      ]
    }
  };
  const chosen = templates[occasion] || templates.birthday;
  const lowTokens = new Set();
  for (const t of chosen.typos) {
    for (const part of t.wrong.toLowerCase().split(/\s+/)) lowTokens.add(part);
  }
  return {
    text: chosen.text,
    words: evenWords(chosen.text, durationSec, lowTokens, speechStartSec, speechEndSec),
    typos: chosen.typos
  };
}

// If browser Web Speech API captured actual words from the speaker, enrich with ASR typo detection
function buildClientHintAsr(clientHint, occasion, recipient, durationSec, speechStartSec = 0, speechEndSec = null) {
  let text = String(clientHint || '').trim();
  const namePair = phoneticSplitName(recipient);
  const typos = [];
  // If speaker said recipient name, simulate phonetic split if not already split, or flag it
  if (namePair.right && new RegExp(`\\b${namePair.right}\\b`, 'i').test(text)) {
    text = text.replace(new RegExp(`\\b${namePair.right}\\b`, 'i'), namePair.wrong);
    typos.push({ wrong: namePair.wrong, right: namePair.right, reason: 'Proper name split by ASR', conf: 0.56 });
  }
  const commonSubs = [
    { re: /\btahun\b/i, wrong: 'taun', right: 'tahun', reason: 'Colloquial spelling', conf: 0.62 },
    { re: /\bterus\b/i, wrong: 'trus', right: 'terus', reason: 'Informal vowel drop', conf: 0.65 },
    { re: /\bwisuda\b/i, wrong: 'wis udah', right: 'wisuda', reason: 'Homophone phrase split', conf: 0.52 },
    { re: /\bskripsi\b/i, wrong: 'sekripsi', right: 'skripsi', reason: 'Spoken vowel insertion', conf: 0.63 }
  ];
  for (const s of commonSubs) {
    if (s.re.test(text)) {
      text = text.replace(s.re, s.wrong);
      typos.push({ wrong: s.wrong, right: s.right, reason: s.reason, conf: s.conf });
    } else if (new RegExp(`\\b${s.wrong}\\b`, 'i').test(text)) {
      typos.push({ wrong: s.wrong, right: s.right, reason: s.reason, conf: s.conf });
    }
  }
  const lowTokens = new Set();
  for (const t of typos) {
    for (const part of t.wrong.toLowerCase().split(/\s+/)) lowTokens.add(part);
  }
  return {
    text,
    words: evenWords(text, durationSec, lowTokens, speechStartSec, speechEndSec),
    typos
  };
}

// Computes word/phrase-level corrections between raw ASR output and speaker-verified text
export function computeCorrections(asrText, finalText, knownTypos = []) {
  const raw = String(asrText || '').trim();
  const fin = String(finalText || '').trim();
  if (!raw || !fin || raw === fin) return [];

  const corrections = [];
  const usedRights = new Set();

  // First check known multi-word or single-word ASR typo candidates that were fixed
  for (const t of knownTypos || []) {
    if (t.wrong && t.right && raw.toLowerCase().includes(t.wrong.toLowerCase()) && fin.includes(t.right) && !fin.toLowerCase().includes(t.wrong.toLowerCase())) {
      corrections.push({ from: t.wrong, to: t.right, reason: t.reason || 'Speaker correction' });
      usedRights.add(t.right.toLowerCase());
    }
  }

  // Also run a lightweight token-level alignment for any custom edits the speaker made
  const cleanTok = (s) => s.replace(/^[.,!?""''()]+|[.,!?""''()]+$/g, '');
  const aTokens = raw.split(/\s+/).map(cleanTok).filter(Boolean);
  const bTokens = fin.split(/\s+/).map(cleanTok).filter(Boolean);

  // Simple LCS / window diff for remaining token substitutions
  let i = 0, j = 0;
  while (i < aTokens.length && j < bTokens.length) {
    if (aTokens[i] === bTokens[j]) {
      i++; j++;
      continue;
    }
    // Check if 2 tokens in raw merged into 1 token in final (e.g. "di" + "mas" -> "Dimas")
    if (i + 1 < aTokens.length && (aTokens[i] + aTokens[i + 1]).toLowerCase() === bTokens[j].toLowerCase()) {
      const fromStr = `${aTokens[i]} ${aTokens[i + 1]}`;
      if (!usedRights.has(bTokens[j].toLowerCase())) {
        corrections.push({ from: fromStr, to: bTokens[j], reason: 'Merged split word' });
        usedRights.add(bTokens[j].toLowerCase());
      }
      i += 2; j += 1;
      continue;
    }
    // Check 1-to-1 substitution where next token matches
    if (i + 1 < aTokens.length && j + 1 < bTokens.length && aTokens[i + 1].toLowerCase() === bTokens[j + 1].toLowerCase()) {
      if (!usedRights.has(bTokens[j].toLowerCase())) {
        corrections.push({ from: aTokens[i], to: bTokens[j], reason: 'Word fix' });
        usedRights.add(bTokens[j].toLowerCase());
      }
      i++; j++;
      continue;
    }
    i++; j++;
  }

  if (!corrections.length && raw !== fin) {
    corrections.push({ from: raw.slice(0, 36) + (raw.length > 36 ? '…' : ''), to: fin.slice(0, 36) + (fin.length > 36 ? '…' : ''), reason: 'Full caption rewrite' });
  }
  return corrections.slice(0, 8);
}

export async function transcribe({ wav, durationSec, recipient, occasion, speechStartSec = 0, speechEndSec = null, clientHint = '' }) {
  if (asrProvider === 'http') {
    const url = new URL(process.env.ASR_URL);
    if (!url.searchParams.has('lang')) url.searchParams.set('lang', 'id');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        ...(process.env.ASR_API_KEY ? { Authorization: `Bearer ${process.env.ASR_API_KEY}` } : {})
      },
      body: wav
    });
    if (!res.ok) throw new Error(`ASR failed: ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
    return fromProvider(await res.json(), durationSec, speechStartSec, speechEndSec);
  }
  if (clientHint && String(clientHint).trim().length >= 4) {
    return buildClientHintAsr(clientHint, occasion, recipient, durationSec, speechStartSec, speechEndSec);
  }
  // Mock: a plausible first guess with realistic Indonesian ASR typos that the friend corrects.
  return buildMockAsr(occasion, recipient, durationSec, speechStartSec, speechEndSec);
}
