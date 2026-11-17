// Language packs: loading, lookup and frame composition.
import { cap } from './util.js';

export const REASONS = [
  { id: 'work', label: 'Slack & meetings', lenses: ['W'] },
  { id: 'travel', label: 'Travel', lenses: ['T1', 'T2', 'T3', 'T4'] },
  { id: 'family', label: 'Partner’s family', lenses: ['F'] },
  { id: 'friends', label: 'Friends', lenses: ['F'] },
  { id: 'curious', label: 'Just curious', lenses: [] },
];

let catalog = null;
const packs = {};

export async function loadCatalog() {
  if (catalog) return catalog;
  const r = await fetch('data/languages.json');
  catalog = (await r.json()).languages;
  return catalog;
}
export const catalogSync = () => catalog || [];
export const meta = code => (catalog || []).find(l => l.code === code);

export async function loadPack(code) {
  if (packs[code]) return packs[code];
  const m = meta(code) || (await loadCatalog(), meta(code));
  // A language missing from an older cached catalog still loads from its conventional path.
  const r = await fetch(m?.pack || `data/${code}.json`);
  if (!r.ok) throw new Error('No pack for ' + code);
  const p = await r.json();
  index(p);
  packs[code] = p;
  return p;
}
export const pack = code => packs[code];

function index(p) {
  p._items = {}; p._sheetOf = {}; p._words = {}; p._reuse = {};
  for (const s of p.sheets) for (const it of s.items) { p._items[it.id] = it; p._sheetOf[it.id] = s; }
  for (const w of p.words) p._words[w.id] = w;
  for (const s of p.sheets) for (const id of s.core || []) p._reuse[id] = (p._reuse[id] || 0) + 1;
}

export function item(code, id, custom = []) {
  const p = packs[code];
  return (p && p._items[id]) || custom.find(c => c.id === id) || null;
}
export const sheet = (code, id) => packs[code]?.sheets.find(s => s.id === id) || null;
export const word = (code, id) => packs[code]?._words[id] || null;
export const sheetOf = (code, itemId) => packs[code]?._sheetOf[itemId] || null;
/** How many lenses reuse a core item (+1 for the core sheet itself). */
export const reuse = (code, itemId) => 1 + (packs[code]?._reuse[itemId] || 0);

const SLOT = /\{x(:acc)?\}/g;
const capL = (s, code) => s ? s.charAt(0).toLocaleUpperCase(code) + s.slice(1) : s;
/** Fill a frame's {x} (or {x:acc}, the object form) with a word, applying plural frames and the language's contractions. */
export function compose(code, frame, w) {
  const p = packs[code];
  const pl = w.pl && frame.tPl;
  const ft = pl ? frame.tPl : frame.t, fs = pl ? (frame.sayPl || frame.say) : frame.say;
  let t = ft.replace(SLOT, (_, acc) => (acc && w.acc) || w.t);
  let say = fs.replace(SLOT, (_, acc) => (acc && w.accSay) || w.say);
  let en = frame.en.replace(SLOT, w.en);
  for (const [re, rep] of p?.contractions || []) t = t.replace(new RegExp(re, 'g'), rep);
  for (const [re, rep] of p?.sayContractions || []) say = say.replace(new RegExp(re, 'g'), rep);
  if (/^\{x/.test(ft)) { t = capL(t, code); say = cap(say); }
  if (/^\{x/.test(frame.en)) en = cap(en);
  return { t, say, en, frame: frame.id, word: w.id };
}
/** Show a frame with a visible blank. */
export const blank = s => (s || '').replace(SLOT, '…');
export function example(code, it) {
  if (!it.frame || !it.ex) return null;
  const w = word(code, it.ex);
  return w ? compose(code, it, w) : null;
}

/** Sheets for a language in its current mode, in study order. */
export function stack(lang) {
  const p = packs[lang.code];
  if (!p) return [];
  if (lang.mode === 'basic') return p.sheets.filter(s => s.mode === 'basic');
  const lensIds = new Set();
  for (const r of lang.reasons || []) for (const l of REASONS.find(x => x.id === r)?.lenses || []) lensIds.add(l);
  return [...p.sheets.filter(s => s.kind === 'core'), ...p.sheets.filter(s => s.kind === 'lens' && lensIds.has(s.id))];
}
export function otherLenses(lang) {
  const p = packs[lang.code];
  if (!p || lang.mode === 'basic') return [];
  const shown = new Set(stack(lang).map(s => s.id));
  return p.sheets.filter(s => s.kind === 'lens' && !shown.has(s.id));
}
/** Items a sheet drills: core items for core sheets; new items (+ core refs) for lenses. */
export function sheetItems(code, s) {
  if (s.kind !== 'lens') return s.items;
  return [...s.items, ...(s.core || []).map(id => item(code, id)).filter(Boolean)];
}
