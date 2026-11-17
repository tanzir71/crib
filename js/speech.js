// Pronunciation through the device's own text-to-speech voices (works offline when voices are installed).
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voices = [];
function refresh() { voices = synth ? synth.getVoices() : []; }
if (synth) { refresh(); synth.addEventListener?.('voiceschanged', refresh); }

export const supported = () => !!synth;
// Languages whose voices are often missing: try a close relative before giving up.
const FALLBACK = { ms: ['id'], fil: ['tl'] };
export function voiceFor(lang) {
  if (!voices.length) refresh();
  const lc = lang.toLowerCase(), base = lc.split('-')[0];
  const prefix = p => voices.filter(v => { const vl = (v.lang || '').toLowerCase().replace('_', '-'); return vl === p || vl.startsWith(p + '-'); });
  const exact = voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-') === lc);
  let pool = exact.length ? exact : prefix(base);
  for (const f of FALLBACK[base] || []) if (!pool.length) pool = prefix(f);
  return pool.find(v => v.localService) || pool[0] || null;
}
/** 'yes' if a matching voice exists, 'no' if voices are loaded but none fit, 'unknown' while the list is still loading. */
export function canSpeak(lang) {
  if (!synth) return 'no';
  if (!voices.length) refresh();
  if (!voices.length) return 'unknown';
  return voiceFor(lang) ? 'yes' : 'no';
}
const clean = t => t.replace(/\{x\}|…/g, ' ').replace(/·/g, ', ').replace(/[“”「」]/g, '');

let loopTimer = null;
export function stop() { clearTimeout(loopTimer); loopTimer = null; synth?.cancel(); }

export function speak(text, lang, { rate = 0.9, onend } = {}) {
  if (!synth || canSpeak(lang) === 'no') return false; // never read a language with the wrong voice
  synth.cancel();
  const u = new SpeechSynthesisUtterance(clean(text));
  u.lang = lang; u.rate = rate;
  const v = voiceFor(lang); if (v) u.voice = v;
  if (onend) { u.onend = onend; u.onerror = onend; }
  synth.speak(u);
  return true;
}

/** Play a list of phrases with pauses, like a voice-memo loop. */
export function loop(texts, lang, onStep, onDone, gap = 1400) {
  stop();
  if (!synth || canSpeak(lang) === 'no') return false;
  let i = 0;
  const next = () => {
    if (i >= texts.length) { loopTimer = null; onDone?.(); return; }
    onStep?.(i);
    speak(texts[i], lang, { onend: () => { i++; loopTimer = setTimeout(next, gap); } });
  };
  next();
  return true;
}
