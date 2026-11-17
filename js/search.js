// Offline search across every loaded pack. Accent- and tone-insensitive.
import { pack, compose, reuse, blank } from './data.js';

export const norm = s => (s || '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/\{x\}|…/g, ' ')
  .replace(/[“”"'’‘¿?¡!.,·:;()（）「」『』。、？！～~\-–—/]/g, ' ')
  .replace(/\s+/g, ' ').trim();

// Filler words that never identify a word or frame on their own.
const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'my', 'your', 'it', 'this', 'that', 'i', 'you', 'me', 'please', 'some', 'any']);

const KIND_BONUS = { core: 6, lens: 4, custom: 4, basic: 3, blueprint: 2, word: 1 };

function entries(code, custom) {
  const p = pack(code);
  if (!p) return [];
  if (p._search) return p._search.concat(custom.map(c => mk(code, 'custom', c, null)));
  const out = [];
  for (const s of p.sheets) for (const it of s.items) out.push(mk(code, s.kind === 'lens' ? 'lens' : s.kind, it, s));
  for (const w of p.words) out.push(mk(code, 'word', w, null));
  p._search = out;
  return out.concat(custom.map(c => mk(code, 'custom', c, null)));
}
function mk(code, kind, it, s) {
  const hay = [norm(it.t), norm(it.say), norm(it.en), norm(it.tags)].join(' | ');
  return { code, kind, id: it.id, it, sheet: s?.id || null, hay, tNorm: norm(it.t).replace(/\s/g, '') };
}

// Short tokens must match whole words ("the" shouldn't hit "then"); longer ones may match inside words.
const has = (hay, t) => t.length > 3 ? hay.includes(t) : (' ' + hay.replace(/ \| /g, ' ') + ' ').includes(' ' + t + ' ');

function score(e, q, toks) {
  if (!q) return 0;
  let s = 0;
  if (e.tNorm && q.replace(/\s/g, '') && e.tNorm.includes(q.replace(/\s/g, ''))) s += 12; // CJK / exact target hit
  const all = toks.every(t => has(e.hay, t));
  if (all) s += 10;
  else { const some = toks.filter(t => has(e.hay, t)).length; if (!some) return s; s += some * 2; }
  if (e.hay.split(' | ').some(f => f.startsWith(q))) s += 4;
  s += KIND_BONUS[e.kind] || 0;
  if (e.kind === 'core') s += Math.min(5, reuse(e.code, e.id));
  return s;
}

/**
 * @returns {{matches: Array, built: Array}}
 * matches: direct hits; built: frame + word compositions ("¿Dónde está la farmacia?").
 */
export function search(query, codes, customByCode = {}) {
  const q = norm(query);
  const toks = q.split(' ').filter(Boolean);
  if (!toks.length) return { matches: [], built: [] };
  const matches = [], built = [];
  for (const code of codes) {
    const es = entries(code, customByCode[code] || []);
    const st = toks.filter(t => !STOP.has(t));
    for (const e of es) { const s = score(e, q, st.length ? st : toks); if (s >= 8) matches.push({ ...e, score: s }); }
    // Build: find words that match, combine with frames whose English matches the rest of the query.
    const p = pack(code); if (!p) continue;
    const enKeys = it => norm(it.en + ' ' + (it.tags || '')).split(' ');
    const content = toks.filter(t => !STOP.has(t));
    const wordHits = e => content.filter(t => enKeys(e.it).includes(t) || (t.length > 3 && (norm(e.it.t).includes(t) || norm(e.it.say).includes(t)))).length;
    const words = es.filter(e => e.kind === 'word').map(e => ({ e, n: wordHits(e) })).filter(x => x.n).sort((a, b) => b.n - a.n).map(x => x.e);
    if (!words.length) continue;
    const frames = p.sheets.flatMap(s => s.items).filter(it => it.frame);
    for (const w of words.slice(0, 3)) {
      const rest = content.filter(t => !enKeys(w.it).includes(t) && !norm(w.it.t).includes(t));
      const ranked = frames.filter(f => (f.takes || 'noun') === (w.it.kind || 'noun'))
        .map(f => ({ f, fit: !f.fits || !w.it.cat || f.fits.includes(w.it.cat), s: rest.filter(t => norm(blank(f.en) + ' ' + (f.tags || '')).split(' ').includes(t)).length * 10 + (reuse(code, f.id) || 0) + (f.ex === w.it.id ? 3 : 0) }))
        .filter(r => r.fit || r.s >= 10)
        .sort((a, b) => b.s - a.s);
      const pick = rest.length ? ranked.filter(r => r.s >= 10).slice(0, 2) : ranked.slice(0, 2);
      for (const { f, s } of pick) built.push({ code, ...compose(code, f, w.it), frameIt: f, wordIt: w.it, score: s });
    }
  }
  matches.sort((a, b) => b.score - a.score);
  built.sort((a, b) => b.score - a.score);
  const seen = new Set(matches.map(m => m.code + norm(m.it.t)));
  return { matches: matches.slice(0, 24), built: built.filter(b => !seen.has(b.code + norm(b.t))).slice(0, 8) };
}
