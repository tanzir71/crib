// Recall scheduling: the 24-hour plan, per-item spacing and session results.
import { state, save } from './store.js';
import { MIN, HOUR, DAY, atTime, addDays, dateKey } from './util.js';

// Box ladder: after a "Got it" an item climbs one box. Gaps grow like Pimsleur's.
export const STEPS = [10 * MIN, 3 * HOUR, 12 * HOUR, 3 * DAY, 7 * DAY, 30 * DAY];
export const key = (code, id) => `${code}:${id}`;
export const itemState = (code, id) => state.items[key(code, id)] || null;
export const known = (code, id) => (itemState(code, id)?.box || 0) >= 1;

/** grade: 0 forgot, 1 shaky, 2 got it */
export function grade(code, id, g, now = Date.now()) {
  const k = key(code, id);
  const s = state.items[k] || { box: 0, due: now, seen: now, ok: 0, miss: 0 };
  s.seen = now;
  if (g === 2) { s.box = Math.min(STEPS.length - 1, (s.ok || s.box ? s.box + 1 : 1)); s.ok++; }
  else if (g === 1) { s.box = Math.max(0, s.box - 1); s.miss++; }
  else { s.box = 0; s.miss++; }
  s.due = now + STEPS[g === 0 ? 0 : s.box];
  state.items[k] = s;
  return s;
}

export function dueItems(codes, now = Date.now()) {
  const out = [];
  for (const [k, s] of Object.entries(state.items)) {
    const i = k.indexOf(':'); const code = k.slice(0, i), id = k.slice(i + 1);
    if (codes.includes(code) && s.due <= now) out.push({ code, id, due: s.due });
  }
  return out.sort((a, b) => a.due - b.due);
}

export function recordSession(r) {
  state.sessions.push(r);
  if (state.sessions.length > 400) state.sessions = state.sessions.slice(-400);
  if (r.sheet) {
    const k = key(r.lang, r.sheet);
    const prev = state.sheets[k] || { best: 0 };
    state.sheets[k] = { best: Math.max(prev.best || 0, r.score), last: r.at, pile: r.pile };
  }
  save();
}
export const sheetState = (code, id) => state.sheets[key(code, id)] || null;
export function sheetStatus(code, id) {
  const s = sheetState(code, id);
  if (!s) return 'next';
  return s.best >= 0.8 ? 'done' : 'active';
}

// ---------------------------------------------------------------- 24-hour plan
export function plan(lang) {
  const d0 = atTime(lang.start, lang.cramAt || '21:00');
  const morning = atTime(addDays(lang.start, 1), '08:00');
  const steps = [
    { key: 'cram', title: 'Cram', meta: 'Read the first sheets out loud, then cover & recall · ~25 min', at: d0, kind: 'cram' },
    { key: 'r1', title: 'Recall #1', meta: '10 min after the cram · about 5 min', at: d0 + 40 * MIN, kind: 'recall' },
    { key: 'r2', title: 'Recall #2, then sleep', meta: 'Misses only. Your brain files it overnight.', at: d0 + 100 * MIN, kind: 'recall' },
    { key: 'r3', title: 'Recall #3 + field test', meta: 'On waking, then use 5 phrases on a real person', at: Math.max(morning, d0 + 8 * HOUR), kind: 'recall' },
    { key: 'd3', title: 'Day-3 recall', meta: 'Keeps it for weeks · ~5 min', at: atTime(addDays(lang.start, 3), lang.cramAt || '21:00'), kind: 'recall' },
    { key: 'd7', title: 'Day-7 recall', meta: 'Quick pass, misses only', at: atTime(addDays(lang.start, 7), lang.cramAt || '21:00'), kind: 'recall' },
    { key: 'd30', title: 'Day-30 recall', meta: 'Locks it in', at: atTime(addDays(lang.start, 30), lang.cramAt || '21:00'), kind: 'recall' },
  ];
  const now = Date.now();
  const mine = state.sessions.filter(s => s.lang === lang.code);
  steps.forEach((st, i) => {
    st.start = st.at - 60 * MIN;
    st.end = i < steps.length - 1 ? steps[i + 1].at - 60 * MIN : st.at + 7 * DAY;
    st.done = mine.some(s => s.at >= st.start && s.at < st.end);
  });
  let current = steps.find(st => !st.done && now >= st.start && now < st.end);
  const next = steps.find(st => !st.done && now < st.start);
  steps.forEach(st => { st.state = st.done ? 'done' : st === current ? 'now' : (now >= st.end ? 'missed' : 'later'); });
  return { steps, current: current || null, next: next || null, started: now >= d0 - 60 * MIN, d0 };
}

/** Items to drill in a plan recall: everything seen in this language that isn't solid yet. */
export function planQueue(code) {
  return Object.entries(state.items)
    .filter(([k, s]) => k.startsWith(code + ':') && s.box < 3)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([k]) => ({ code, id: k.slice(code.length + 1) }));
}

export function nextStartDate(existing) {
  const taken = new Set(existing.map(l => l.start));
  let d = dateKey();
  while (taken.has(d)) d = addDays(d, 1);
  return d;
}
