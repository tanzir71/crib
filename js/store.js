// Device-only persistence. Everything lives in localStorage on this device.
const KEY = 'crib.v1';
export const VERSION = 1;

function blank() {
  return {
    v: VERSION,
    langs: [],          // [{code, mode, reasons[], diet[], cramAt, start, added}]
    active: null,       // active language code
    items: {},          // "code:itemId" -> {box, due, seen, ok, miss}
    sheets: {},         // "code:sheetId" -> {best, last, pile[]}
    sessions: [],       // [{lang, sheet, kind, at, total, got}]
    custom: {},         // code -> [{id, t, say, en, from}]
    ui: { installDismissed: false, lastBackup: null, created: Date.now() },
  };
}

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    if (!s || s.v !== VERSION) return blank();
    return Object.assign(blank(), s, { ui: Object.assign(blank().ui, s.ui || {}) });
  } catch { return blank(); }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { console.warn('Crib: could not save', e); return false; }
}

export function replace(next) {
  if (!next || next.v !== VERSION || !Array.isArray(next.langs)) throw new Error('This file is not a Crib backup.');
  state = Object.assign(blank(), next, { ui: Object.assign(blank().ui, next.ui || {}) });
  save();
}

export function reset() { state = blank(); save(); }

export function exportJSON() {
  state.ui.lastBackup = Date.now(); save();
  return JSON.stringify(state, null, 1);
}

export const lang = code => state.langs.find(l => l.code === code);
export const activeLang = () => lang(state.active) || state.langs[0] || null;

export async function storageInfo() {
  const out = { persisted: null, usage: null, quota: null };
  try {
    if (navigator.storage?.persisted) out.persisted = await navigator.storage.persisted();
    if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); out.usage = e.usage; out.quota = e.quota; }
  } catch {}
  return out;
}
export async function requestPersist() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}
