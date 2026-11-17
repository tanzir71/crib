// Crib: router, actions and recall sessions.
import { state, save, replace, reset, exportJSON, lang as getLang, activeLang, storageInfo, requestPersist } from './store.js';
import * as D from './data.js';
import * as V from './views.js';
import { grade, dueItems, planQueue, recordSession, plan, nextStartDate, key as ikey } from './srs.js';
import { speak, stop as stopSpeech, loop } from './speech.js';
import { buildICS } from './ics.js';
import { ui, env } from './ui.js';
import { dateKey, download, shuffle, fmtTime, esc } from './util.js';

const $ = s => document.querySelector(s);
let lastRoute = '';

// ------------------------------------------------------------------ boot
async function boot() {
  await D.loadCatalog();
  await Promise.all(state.langs.map(l => D.loadPack(l.code).catch(() => null)));
  window.addEventListener('hashchange', render);
  document.addEventListener('click', onClick);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', onKey);
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); ui.installPrompt = e; render(); });
  window.addEventListener('appinstalled', () => { ui.installPrompt = null; render(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (!location.hash) location.replace(state.langs.length ? '#/today' : '#/welcome');
  if (!state.langs.length && env.ios() && !env.standalone() && !state.ui.installDismissed) ui.iosSheet = true;
  render();
}

const parse = () => (location.hash.replace(/^#\/?/, '').split('?')[0] || 'today').split('/').map(decodeURIComponent);

async function render() {
  const r = parse();
  const routeKey = r.join('/');
  if (routeKey !== lastRoute) { stopSpeech(); ui.looping = null; }
  let main;
  try { main = await route(r); } catch (e) { console.error(e); main = V.notFound(); }
  const desktopChrome = !['welcome', 'setup', 'recall', 'print', 'card', 'add'].includes(r[0]) && state.langs.length;
  document.body.dataset.route = r[0];
  document.body.classList.toggle('chrome', !!desktopChrome);
  $('#main').innerHTML = main;
  $('#side').innerHTML = desktopChrome ? V.side(r) : '';
  $('#panel').innerHTML = desktopChrome && ['today', 'sheet', 'done'].includes(r[0]) ? V.panel() : '';
  $('#tabs').innerHTML = desktopChrome ? V.tabbar(r) : '';
  $('#overlay').innerHTML = V.overlayShow() + V.overlayInstall() + (ui.toast ? `<div class="toast" role="status">${esc(ui.toast)}</div>` : '');
  if (routeKey !== lastRoute) { window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); }
  lastRoute = routeKey;
  if (r[0] === 'search') { const q = $('#q'); if (q && document.activeElement !== q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  if (r[0] === 'device') storageInfo().then(info => { if (parse()[0] === 'device') $('#main').innerHTML = V.vDevice(info); });
  document.title = titleFor(r);
}

function titleFor(r) {
  const n = { today: 'Today', sheet: 'Sheet', recall: 'Recall', done: 'Results', search: 'Search', languages: 'Languages', device: 'This device', card: 'Diet card', print: 'Print', welcome: 'Welcome', setup: 'Set up', add: 'Add a language' }[r[0]] || '';
  return n ? `${n} · Crib` : 'Crib';
}

async function route([view, a, b, c]) {
  switch (view) {
    case 'welcome': return V.vWelcome();
    case 'add': return V.vWelcome(true);
    case 'setup': return ui.draft ? V.vSetup() : (location.hash = '#/welcome', '');
    case 'today':
      if (!state.langs.length) { location.hash = '#/welcome'; return ''; }
      await ensure(activeLang().code); return V.vToday();
    case 'sheet': await ensure(a); return V.vSheet(a, b);
    case 'recall': return startRecall(a, b, c);
    case 'done': return V.vDone();
    case 'search': await Promise.all(state.langs.map(l => ensure(l.code))); if (location.hash.includes('?q=')) ui.q = decodeURIComponent(location.hash.split('?q=')[1]); return V.vSearch();
    case 'languages': await Promise.all(state.langs.map(l => ensure(l.code))); return V.vLanguages();
    case 'device': return V.vDevice({});
    case 'card': await ensure(a); return V.vCard(a);
    case 'print': await ensure(a); return V.vPrint(a, b);
    default: return V.notFound();
  }
}
const ensure = code => code ? D.loadPack(code) : null;

// ------------------------------------------------------------------ recall sessions
async function startRecall(kind, a, b) {
  // Re-entering the same route (e.g. after a re-render) keeps the running session.
  const sig = [kind, a, b].join('/');
  if (ui.session && ui.session.sig === sig) return V.vRecall();
  let queue = [], title = 'Recall', code = null, sheetId = null;
  if (kind === 'sheet') {
    code = a; sheetId = b; await ensure(code);
    const s = D.sheet(code, sheetId); if (!s) return V.notFound();
    const its = s.kind === 'lens' ? [...s.items, ...(s.core || []).map(id => D.item(code, id)).filter(Boolean).filter(it => (state.items[ikey(code, it.id)]?.box || 0) < 2)] : s.items;
    queue = its.map(it => ({ code, id: it.id })); title = s.title;
  } else if (kind === 'plan') {
    code = a; await ensure(code);
    queue = planQueue(code);
    title = plan(getLang(code)).current?.title.split(',')[0] || 'Recall';
    if (!queue.length) { const s = D.stack(getLang(code))[0]; location.hash = `#/sheet/${code}/${s.id}`; return ''; }
  } else if (kind === 'mixed') {
    await Promise.all(state.langs.map(l => ensure(l.code)));
    queue = dueItems(state.langs.map(l => l.code)).map(d => ({ code: d.code, id: d.id }));
    title = 'Mixed recall';
    if (!queue.length) { toast('Nothing is due right now.'); location.hash = '#/today'; return ''; }
  } else if (kind === 'pile') {
    const R = ui.lastResult; if (!R) { location.hash = '#/today'; return ''; }
    queue = R.pile.map(p => ({ code: p.code, id: p.id })); code = R.code; sheetId = null; title = 'Revisit pile';
  } else return V.notFound();
  queue = queue.filter(q => D.item(q.code, q.id, state.custom[q.code] || []));
  if (kind !== 'sheet') queue = queue.slice(0, 25);
  else queue = shuffle(queue);
  ui.session = { sig, kind, code, sheet: sheetId, title, queue, order: queue.map(q => `${q.code}:${q.id}`), total: queue.length, pos: 0, revealed: false, hint: false, first: {}, tries: {} };
  return V.vRecall();
}

function gradeCard(g) {
  const S = ui.session; if (!S || !S.revealed) return;
  const cur = S.queue[S.pos]; const k = `${cur.code}:${cur.id}`;
  if (!(k in S.first)) { S.first[k] = g; grade(cur.code, cur.id, g); save(); }
  S.tries[k] = (S.tries[k] || 0) + 1;
  // Forgot: comes back in ~3 cards. Shaky: in ~5. (Pimsleur-style short gaps inside a session.)
  if (g === 0 && S.tries[k] <= 2) S.queue.splice(Math.min(S.queue.length, S.pos + 3), 0, cur);
  if (g === 1 && S.tries[k] <= 1) S.queue.splice(Math.min(S.queue.length, S.pos + 5), 0, cur);
  S.pos++; S.revealed = false; S.hint = false;
  if (S.pos >= S.queue.length) return finish();
  render();
}

function finish() {
  const S = ui.session; const now = Date.now();
  const marks = S.order.map(k => S.first[k] ?? 0);
  const got = marks.filter(g => g === 2).length;
  const pile = S.order.filter(k => (S.first[k] ?? 0) < 2).map(k => { const i = k.indexOf(':'); return { code: k.slice(0, i), id: k.slice(i + 1), g: S.first[k] ?? 0 }; });
  const score = S.total ? got / S.total : 0;
  const langs = [...new Set(S.order.map(k => k.slice(0, k.indexOf(':'))))];
  for (const code of langs) {
    const ks = S.order.filter(k => k.startsWith(code + ':'));
    const g2 = ks.filter(k => S.first[k] === 2).length;
    recordSession({ lang: code, sheet: S.kind === 'sheet' && code === S.code ? S.sheet : null, kind: S.kind, at: now, total: ks.length, got: g2, score: ks.length ? g2 / ks.length : 0, pile: ks.filter(k => S.first[k] !== 2).map(k => k.slice(code.length + 1)) });
  }
  if (!state.ui.persistAsked) { state.ui.persistAsked = true; save(); requestPersist(); }
  ui.lastResult = { title: S.title, code: S.code || langs[0], sheet: S.kind === 'sheet' ? S.sheet : null, total: S.total, got, score, marks, pile };
  ui.session = null;
  location.hash = '#/done';
}

// ------------------------------------------------------------------ actions
/** Speak, or explain why not: a missing voice would otherwise read the line with the wrong accent. */
function say(text, code, opts) {
  if (speak(text, D.meta(code)?.tts || code, opts)) return true;
  toast(`No ${D.meta(code)?.name || 'matching'} voice on this device. Add one in your system’s speech settings.`);
  return false;
}
function toast(msg) { ui.toast = msg; render(); clearTimeout(toast.t); toast.t = setTimeout(() => { ui.toast = null; render(); }, 2600); }

async function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act, ds = el.dataset;
  if (el.tagName === 'A' && act !== 'end-recall') e.preventDefault();
  switch (act) {
    case 'play': say(ds.text, ds.code); break;
    case 'mode': { const L = getLang(ds.code); if (L) { L.mode = ds.mode; save(); if (parse()[0] === 'sheet') location.hash = '#/today'; render(); } break; }
    case 'lang': state.active = ds.code; save(); await ensure(ds.code); location.hash = '#/today'; render(); break;
    case 'pick': { const i = ui.picks.indexOf(ds.code); i >= 0 ? ui.picks.splice(i, 1) : ui.picks.push(ds.code); render(); break; }
    case 'picks-done': {
      if (!ui.picks.length) break;
      ui.setupQueue = ui.picks.slice();
      await Promise.all(ui.picks.map(c => D.loadPack(c)));
      nextDraft(); location.hash = '#/setup'; render(); break;
    }
    case 'reason': { const d = ui.draft, i = d.reasons.indexOf(ds.id); i >= 0 ? d.reasons.splice(i, 1) : d.reasons.push(ds.id); render(); break; }
    case 'draft-mode': ui.draft.mode = ds.mode; render(); break;
    case 'setup-next': {
      const d = ui.draft;
      const existing = getLang(d.code);
      if (existing) Object.assign(existing, d); else state.langs.push(d);
      if (!state.active) state.active = d.code;
      save();
      if (ui.setupQueue.length) { nextDraft(); render(); }
      else { state.active = ui.picks[0] || d.code; ui.picks = []; ui.draft = null; save(); location.hash = '#/today'; }
      break;
    }
    case 'start-now': { const L = getLang(ds.code); const n = new Date(); L.start = dateKey(); L.cramAt = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; save(); render(); break; }
    case 'add-reason': { const L = getLang(ds.code); if (!L.reasons.includes(ds.id)) L.reasons.push(ds.id); save(); render(); break; }
    case 'reveal': if (ui.session) { ui.session.revealed = true; render(); } break;
    case 'hint': if (ui.session) { ui.session.hint = true; render(); } break;
    case 'grade': gradeCard(Number(ds.g)); break;
    case 'end-recall': ui.session = null; location.hash = '#/today'; break;
    case 'revisit': ui.session = null; location.hash = '#/recall/pile'; break;
    case 'toggle': ui.toggles[ds.k] = !ui.toggles[ds.k]; render(); break;
    case 'loop': {
      const k = `${ds.code}/${ds.sheet}`;
      if (ui.looping === k) { stopSpeech(); ui.looping = null; render(); break; }
      const s = D.sheet(ds.code, ds.sheet);
      const its = s.kind === 'lens' ? [...(s.core || []).map(id => D.item(ds.code, id)), ...s.items] : s.items;
      const texts = its.filter(Boolean).map(it => { const ex = D.example(ds.code, it); return it.frame && ex ? ex.t : D.blank(it.t); });
      if (!loop(texts, D.meta(ds.code)?.tts || ds.code, null, () => { ui.looping = null; render(); })) { say('', ds.code); break; }
      ui.looping = k; render();
      break;
    }
    case 'print': window.print(); break;
    case 'qlang': ui.qLang = ds.code; $('#results').innerHTML = V.results(); render(); break;
    case 'show': ui.show = { code: ds.code, t: ds.t, say: ds.say, en: ds.en }; render(); break;
    case 'close-show': ui.show = null; render(); break;
    case 'add-recall': {
      const code = ds.code; let id = ds.id;
      if (!id) {
        state.custom[code] = state.custom[code] || [];
        const ex = state.custom[code].find(c => c.t === ds.t);
        id = ex ? ex.id : `x.${Date.now().toString(36)}`;
        if (!ex) state.custom[code].push({ id, t: ds.t, say: ds.say, en: ds.en, from: 'search' });
      }
      const k = ikey(code, id);
      state.items[k] = Object.assign({ box: 0, seen: Date.now(), ok: 0, miss: 0 }, state.items[k] || {}, { due: Date.now() });
      save(); toast('Added to your next recall.'); break;
    }
    case 'diet': { const L = getLang(ds.code); L.diet = L.diet || []; const i = L.diet.indexOf(ds.opt); i >= 0 ? L.diet.splice(i, 1) : L.diet.push(ds.opt); save(); render(); break; }
    case 'card-flip': ui.cardEnglish = !ui.cardEnglish; render(); break;
    case 'card-read': {
      const L = getLang(ds.code), dt = D.pack(ds.code).diet;
      const text = [...(L.diet || []).map(k => dt.options[k]?.t), dt.ask, dt.thanks].filter(Boolean).join(' ');
      say(text, ds.code, { rate: 0.85 }); break;
    }
    case 'export': download(`crib-backup-${dateKey()}.json`, exportJSON()); toast('Backup saved to your downloads.'); render(); break;
    case 'ics': {
      const langs = ds.code ? [getLang(ds.code)] : state.langs;
      const url = location.href.split('#')[0];
      const events = langs.flatMap(L => plan(L).steps.filter(s => s.at > Date.now() && !s.done).map(s => ({ title: `Crib · ${D.meta(L.code)?.name} · ${s.title}`, at: s.at, minutes: s.kind === 'cram' ? 30 : 10, desc: s.meta })));
      if (!events.length) { toast('No upcoming recalls to add.'); break; }
      download('crib-recalls.ics', buildICS(events, url), 'text/calendar'); toast(`${events.length} reminders exported.`); break;
    }
    case 'persist': { const ok = await requestPersist(); toast(ok ? 'Storage protected.' : 'The browser said no. Installing Crib usually fixes this.'); render(); break; }
    case 'reset': if (!ui.resetArmed) { ui.resetArmed = true; render(); setTimeout(() => { ui.resetArmed = false; render(); }, 4000); } else { reset(); ui.resetArmed = false; location.hash = '#/welcome'; render(); } break;
    case 'install': if (ui.installPrompt) { ui.installPrompt.prompt(); await ui.installPrompt.userChoice.catch(() => null); ui.installPrompt = null; render(); } break;
    case 'ios-install': ui.iosSheet = true; render(); break;
    case 'close-ios': ui.iosSheet = false; render(); break;
    case 'dismiss-install': ui.iosSheet = false; state.ui.installDismissed = true; save(); render(); break;
  }
}

function nextDraft() {
  const code = ui.setupQueue.shift();
  const existing = getLang(code);
  const others = state.langs.filter(l => l.code !== code);
  ui.draft = existing ? { ...existing } : { code, mode: 'utility', reasons: ['work', 'travel'], diet: [], cramAt: '21:00', start: nextStartDate(others.concat(ui.pendingStarts || [])), added: Date.now() };
  ui.pendingStarts = (ui.pendingStarts || []).concat([{ start: ui.draft.start }]);
  if (!ui.setupQueue.length) ui.pendingStarts = [];
}

function onInput(e) {
  if (e.target.id === 'q') { ui.q = e.target.value; $('#results').innerHTML = V.results(); }
  if (e.target.dataset.act === 'cram-time' && ui.draft) ui.draft.cramAt = e.target.value || '21:00';
}
function onChange(e) {
  if (e.target.dataset.act === 'import') {
    const f = e.target.files?.[0]; if (!f) return;
    f.text().then(t => { replace(JSON.parse(t)); return Promise.all(state.langs.map(l => D.loadPack(l.code))); })
      .then(() => { toast('Backup restored.'); location.hash = '#/today'; render(); })
      .catch(err => toast(err.message || 'Could not read that file.'));
  }
}

function onKey(e) {
  const typing = /input|textarea|select/i.test(e.target.tagName);
  if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); location.hash = '#/search'; return; }
  if (e.key === 'Escape') { if (ui.show) { ui.show = null; render(); } else if (ui.iosSheet) { ui.iosSheet = false; render(); } else if (parse()[0] === 'search') location.hash = '#/today'; return; }
  if (typing || parse()[0] !== 'recall' || !ui.session) return;
  const S = ui.session;
  if ((e.key === ' ' || e.key === 'Enter') && !S.revealed) { e.preventDefault(); S.revealed = true; render(); }
  else if (S.revealed && ['1', '2', '3'].includes(e.key)) gradeCard(Number(e.key) - 1);
  else if (e.key === 'h') { S.hint = true; render(); }
  else if (e.key === 'p') { const cur = S.queue[S.pos]; const it = D.item(cur.code, cur.id, state.custom[cur.code] || []); if (it) say(D.blank(it.t), cur.code); }
}

boot();
