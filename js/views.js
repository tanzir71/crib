// Every screen is a function that returns HTML. Actions are wired in app.js via data-act.
import { esc, icon, fmtWhen, fmtTime, fmtDay, dateKey } from './util.js';
import { state, lang as getLang, activeLang } from './store.js';
import * as D from './data.js';
import { plan, sheetStatus, sheetState, known, dueItems, itemState } from './srs.js';
import { search } from './search.js';
import { ui, env } from './ui.js';
import { supported as ttsSupported, voiceFor } from './speech.js';

// ------------------------------------------------------------------ atoms
export const btn = (label, { style = 'primary', act = '', href = '', ic = '', attrs = '', cls = '' } = {}) => {
  const inner = `${ic ? icon(ic, 18) : ''}<span>${esc(label)}</span>`;
  return href
    ? `<a class="btn btn-${style} ${cls}" href="${href}" ${attrs}>${inner}</a>`
    : `<button class="btn btn-${style} ${cls}" ${act ? `data-act="${act}"` : ''} ${attrs}>${inner}</button>`;
};
const chip = (label, on, attrs = '') => `<button class="chip ${on ? 'on' : ''}" ${attrs} aria-pressed="${on}">${esc(label)}</button>`;
const iconBtn = (ic, attrs = '', label = '') => `<button class="ibtn" ${attrs} aria-label="${esc(label || ic)}">${icon(ic, 18)}</button>`;
const iconLink = (ic, href, label) => `<a class="ibtn" href="${href}" aria-label="${esc(label)}">${icon(ic, 18)}</a>`;
const playBtn = (code, text, cls = '') => `<button class="play ${cls}" data-act="play" data-code="${code}" data-text="${esc(text)}" aria-label="Play">${icon('play', 12)}</button>`;
const label = (t, right = '', rc = '') => `<div class="lbl-row"><span class="lbl">${esc(t)}</span>${right ? `<span class="lbl ${rc}">${esc(right)}</span>` : ''}</div>`;
const badge = (L, cls = '') => { const m = D.meta(L.code) || {}; return `<span class="badge ${cls}" lang="${L.code}" dir="auto">${esc(m.badge || L.code.slice(0, 2).toUpperCase())}</span>`; };
const frameText = t => esc(t).replace(/\{x(:acc)?\}/g, '<span class="blank">…</span>');
const langName = code => D.meta(code)?.name || code;

export function modeToggle(L) {
  return `<div class="seg" role="group" aria-label="Mode for ${esc(langName(L.code))}">
    <button class="${L.mode === 'basic' ? 'on' : ''}" data-act="mode" data-code="${L.code}" data-mode="basic">Basic</button>
    <button class="${L.mode !== 'basic' ? 'on' : ''}" data-act="mode" data-code="${L.code}" data-mode="utility">Utility</button></div>`;
}
const wordmark = (size = '') => `<a href="#/today" class="wordmark ${size}" aria-label="Crib home">crib</a>`;

function phraseRow(code, it, { showEx = true, check = null } = {}) {
  const ex = showEx ? D.example(code, it) : null;
  const t = it.frame ? D.blank(it.t) : it.t;
  return `<div class="row">
    ${check === null ? playBtn(code, it.frame && ex ? ex.t : t) : `<span class="known ${check ? 'yes' : ''}">${icon(check ? 'check' : 'repeat', 12, 3)}</span>`}
    <div class="row-main">
      <div class="phrase" lang="${code}" dir="auto">${it.frame ? frameText(it.t) : esc(it.t)}</div>
      ${ui.toggles.say ? `<div class="say">${esc(D.blank(it.say))}</div>` : ''}
      ${ui.toggles.lit && it.lit ? `<div class="lit">word for word: ${esc(it.lit)}</div>` : ''}
      ${ui.toggles.lit && it.note ? `<div class="note">${esc(it.note)}</div>` : ''}
      ${it.note && !ui.toggles.lit ? `<div class="note">${esc(it.note)}</div>` : ''}
      ${ex ? `<div class="ex">e.g. <span lang="${code}" dir="auto">${esc(ex.t)}</span> · ${esc(ex.en)}</div>` : ''}
      ${ui.toggles.hooks && it.hook ? `<div class="hook">${icon('bulb', 13)} ${esc(it.hook)}</div>` : ''}
    </div>
    <div class="mean">${esc(D.blank(it.en))}${check !== null ? `<div class="reuse">${icon('repeat', 11)} ${D.reuse(code, it.id)} packs</div>` : ''}</div>
  </div>`;
}

function tile(L, s, i) {
  const st = sheetStatus(L.code, s.id);
  const ss = sheetState(L.code, s.id);
  let meta;
  if (s.kind === 'lens') {
    const kn = (s.core || []).filter(id => known(L.code, id)).length;
    meta = `${kn}/${(s.core || []).length} core lines known · ${s.items.length} new`;
  } else meta = `${s.items.length} ${s.kind === 'blueprint' ? 'sentences' : 'lines'}${ss ? ` · best ${Math.round(ss.best * 100)}%` : ''}`;
  const bdg = st === 'done' ? `<span class="tb done">${icon('check', 16, 2.5)}</span>` : `<span class="tb ${st === 'active' ? 'act' : ''}">${esc(s.id)}</span>`;
  const right = st === 'done' ? '<span class="muted sm">Review</span>' : st === 'active' ? icon('right', 18) : '<span class="pill-out">Test out</span>';
  const prog = st === 'active' ? `<div class="bar"><i style="width:${Math.round((ss?.best || 0) * 100)}%"></i></div>` : '';
  return `<a class="tile ${st}" href="#/sheet/${L.code}/${s.id}">${bdg}<div class="tile-main"><div class="tile-title">${esc(s.title)}</div><div class="tile-meta">${esc(meta)}</div>${prog}</div>${right}</a>`;
}

function stepRow(st) {
  return `<div class="step ${st.state}"><div class="step-time">${st.key === 'r2' ? fmtTime(st.at) : fmtWhen(st.at)}</div><div class="rail"><i></i><b></b></div><div class="step-body"><div class="step-title">${esc(st.title)}${st.state === 'missed' ? ' <span class="tag-red">missed</span>' : ''}</div><div class="step-meta">${esc(st.meta)}</div></div></div>`;
}

function nextSheet(L) {
  const s = D.stack(L);
  return s.find(x => sheetStatus(L.code, x.id) !== 'done') || s[0];
}

export function planCard(L, compact = false) {
  const P = plan(L);
  const show = compact ? P.steps.filter(s => ['cram', 'r1', 'r2', 'r3'].includes(s.key) || s.state === 'now') : P.steps.slice(0, 4);
  const ns = nextSheet(L);
  let cta;
  if (!P.started) cta = btn('Start now instead', { act: 'start-now', attrs: `data-code="${L.code}"`, ic: 'arrow' });
  else if (P.current?.kind === 'cram') cta = btn(`Start: ${ns.title}`, { href: `#/sheet/${L.code}/${ns.id}`, ic: 'arrow' });
  else if (P.current?.kind === 'recall') cta = btn(`Start ${P.current.title.split(',')[0]}`, { href: `#/recall/plan/${L.code}`, ic: 'arrow' });
  else cta = btn(`Keep going: ${ns.title}`, { href: `#/sheet/${L.code}/${ns.id}`, style: 'secondary' });
  return `<section class="card plan">
    <div class="card-head"><h3>Your 24 hours</h3><button class="link" data-act="ics" data-code="${L.code}">${icon('calendar', 14)} Add to calendar</button></div>
    <div class="steps">${show.map(stepRow).join('')}</div>
    ${P.next && !P.current && P.started ? `<p class="sm muted">Next: ${esc(P.next.title)} · ${fmtWhen(P.next.at)}</p>` : ''}
    ${cta}
  </section>`;
}

function dueBanner(compact = false) {
  const codes = state.langs.map(l => l.code);
  const due = dueItems(codes);
  if (!due.length) return '';
  const by = [...new Set(due.map(d => d.code))].map(langName).join(' + ');
  return `<section class="due ${compact ? 'compact' : ''}"><div><div class="lbl hl">Due now</div><div class="due-t">${due.length} card${due.length > 1 ? 's' : ''} · ${esc(by)}</div></div>${btn('Mixed recall', { style: 'highlight', href: '#/recall/mixed' })}</section>`;
}

function installBanner() {
  if (env.standalone() || state.ui.installDismissed) return '';
  if (!ui.installPrompt && !env.ios()) return '';
  return `<section class="install-banner">${icon('shield', 18)}<div class="grow"><b>Install Crib</b><div class="sm">Keeps your progress safe on this device and works offline.</div></div>${ui.installPrompt ? btn('Install', { act: 'install', style: 'primary' }) : btn('How', { act: 'ios-install', style: 'primary' })}${iconBtn('x', 'data-act="dismiss-install"', 'Dismiss')}</section>`;
}

// ------------------------------------------------------------------ views
export function vWelcome(adding = false) {
  const cat = D.catalogSync();
  const taken = new Set(state.langs.map(l => l.code));
  const tiles = cat.filter(m => !taken.has(m.code)).map(m => {
    const n = ui.picks.indexOf(m.code);
    if (m.soon) return `<div class="lang soon" aria-disabled="true"><div><div class="nat" lang="${m.code}" dir="auto">${esc(m.native)}</div><div class="sm">${esc(m.name)} · soon</div></div></div>`;
    return `<button class="lang ${n >= 0 ? 'on' : ''}" data-act="pick" data-code="${m.code}" aria-pressed="${n >= 0}"><div><div class="nat" lang="${m.code}" dir="auto">${esc(m.native)}</div><div class="sm">${esc(m.name)}${m.variant ? ' · ' + esc(m.variant) : ''}</div></div>${n >= 0 ? `<span class="order">${n + 1}</span>` : ''}</button>`;
  }).join('');
  const k = ui.picks.length;
  return `<div class="page narrow">
    <div class="top-row">${wordmark()}<span class="lbl">${adding ? 'Add a language' : 'Step 1 of 2'}</span></div>
    <h1 class="display-m">${adding ? 'Which language next?' : 'Which languages are you cramming?'}</h1>
    <p class="sm muted">Pick as many as you like. Each one gets its own sprint, starting a night apart, and you switch between them in one tap.</p>
    <div class="lang-grid">${tiles}</div>
    ${env.repo() ? `<p class="sm muted">Missing yours? <a href="${env.repo()}/issues/new?title=${encodeURIComponent('Language request: ')}" target="_blank" rel="noopener">Request a language on GitHub</a>.</p>` : ''}
    <div class="bottom-bar">${k ? `<p class="sm muted center">${k} picked${k > 1 ? ' · sprints start one night apart' : ''}</p>` : ''}${btn(k ? `Continue with ${k} language${k > 1 ? 's' : ''}` : 'Pick a language', { act: 'picks-done', ic: 'arrow', attrs: k ? '' : 'disabled' })}</div>
  </div>`;
}

export function vSetup() {
  const d = ui.draft;
  if (!d) return '';
  const m = D.meta(d.code);
  const total = ui.picks.length || 1, idx = total - ui.setupQueue.length;
  const startTxt = d.start === dateKey() ? 'tonight' : fmtDay(new Date(d.start + 'T12:00').getTime());
  const nextCode = ui.setupQueue[0];
  return `<div class="page narrow">
    <div class="top-row"><a class="ibtn" href="#/welcome" aria-label="Back">${icon('left', 18)}</a><span class="lbl">Step 2 of 2 · ${idx} of ${total}</span></div>
    <h1 class="display-m">Why ${esc(m.name)}?</h1>
    <p class="sm muted">Each reason adds a light lens on top of your core: a few new words and one or two new lines, never a new phrasebook.</p>
    <div class="chips">${D.REASONS.map(r => chip(r.label, d.reasons.includes(r.id), `data-act="reason" data-id="${r.id}"`)).join('')}</div>
    ${label('Start in')}
    <div class="mode-cards">
      <button class="mode-card ${d.mode === 'utility' ? 'on' : ''}" data-act="draft-mode" data-mode="utility"><div class="mc-h"><span class="display-s">Utility</span><span class="dot"></span></div><div class="sm">Talk tonight: a core of lines that work everywhere, then lenses for your context.</div></button>
      <button class="mode-card ${d.mode === 'basic' ? 'on' : ''}" data-act="draft-mode" data-mode="basic"><div class="mc-h"><span class="display-s">Basic</span><span class="dot"></span></div><div class="sm">Foundation first: hello, yes / no, numbers and the grammar Blueprint.</div></button>
    </div>
    <p class="xs muted">Flip between them any time: one tap at the top of Today.</p>
    ${label('When do you cram?')}
    <label class="time-card">${icon('moon', 20)}<div class="grow"><b>${esc(m.name)}: ${startTxt} at</b><div class="xs muted">An evening start means sleep comes right after the session, which saves practice.</div></div><input type="time" value="${d.cramAt}" data-act="cram-time" aria-label="Cram time"></label>
    <div class="bottom-bar">${btn(nextCode ? `Next: ${langName(nextCode)}` : 'Build my sprint', { act: 'setup-next', ic: 'arrow' })}</div>
  </div>`;
}

export function vToday() {
  const L = activeLang();
  if (!L) return vWelcome();
  const m = D.meta(L.code);
  const P = plan(L);
  const switcher = state.langs.map(l => {
    const p = plan(l); const on = l.code === L.code;
    const sub = on ? 'now' : (p.started ? (p.current ? 'due' : '') : fmtDay(p.d0).replace('tomorrow', 'tmrw'));
    return `<button class="lpill ${on ? 'on' : ''}" data-act="lang" data-code="${l.code}">${badge(l)}<span>${esc(langName(l.code))}</span>${sub ? `<em>${esc(sub)}</em>` : ''}</button>`;
  }).join('') + `<a class="ibtn" href="#/add" aria-label="Add language">${icon('plus', 16)}</a>`;
  const stk = D.stack(L);
  const others = D.otherLenses(L);
  const travel = (L.reasons || []).includes('travel') && L.mode !== 'basic';
  const head = !P.started ? `Starts ${fmtDay(P.d0)}, ${fmtTime(P.d0)}.` : (Date.now() < P.d0 + 26 * 3600e3 ? 'Talk by tomorrow night.' : 'Keep it warm.');
  return `<div class="page">
    <div class="top-row only-mobile">${wordmark()}<div class="row-gap">${iconLink('search', '#/search', 'Search')}${modeToggle(L)}</div></div>
    <div class="switcher only-mobile">${switcher}</div>
    ${installBanner()}
    <header class="hero"><div class="lbl">${esc(m.name)} sprint · ${L.mode}</div><h1 class="display-l">${esc(head)}</h1><p class="sm muted">About 70 minutes of real work, spread across 24 hours.</p></header>
    <div class="only-mobile">${dueBanner()}${planCard(L, true)}</div>
    <div class="only-desktop desk-top">${modeToggle(L)}</div>
    ${label(L.mode === 'basic' ? 'Foundation · Basic' : 'Core first, then lenses', `${stk.length} sheets`)}
    <div class="stack">${stk.map((s, i) => tile(L, s, i)).join('')}</div>
    ${travel ? `<a class="tile diet" href="#/card/${L.code}"><span class="tb act">${icon('utensils', 16)}</span><div class="tile-main"><div class="tile-title">Diet card</div><div class="tile-meta">${L.diet?.length ? `${L.diet.length} restriction${L.diet.length > 1 ? 's' : ''} · show it to staff` : 'Set your restrictions once, show staff a card'}</div></div>${icon('right', 18)}</a>` : ''}
    ${others.length ? `${label('More lenses')}<div class="chips">${D.REASONS.filter(r => r.lenses.length && r.lenses.some(id => others.find(o => o.id === id)) && !(L.reasons || []).includes(r.id)).map(r => chip('+ ' + r.label, false, `data-act="add-reason" data-code="${L.code}" data-id="${r.id}"`)).join('')}</div>` : ''}
  </div>`;
}

export function vSheet(code, id) {
  const L = getLang(code), s = D.sheet(code, id);
  if (!L || !s) return notFound();
  const st = sheetState(code, id);
  const idx = D.stack(L).findIndex(x => x.id === id);
  const items = s.items;
  let body;
  if (s.kind === 'lens') {
    const core = (s.core || []).map(cid => D.item(code, cid)).filter(Boolean);
    const kn = core.filter(c => known(code, c.id)).length;
    const words = (s.words || []).map(w => D.word(code, w)).filter(Boolean);
    const p = D.pack(code);
    body = `
      <div class="reuse-note">${icon('repeat', 16)}<span>${kn ? `You already know ${kn} of these ${core.length} core lines.` : `${core.length} of these lines come from your core.`} New here: ${items.length} line${items.length > 1 ? 's' : ''}${words.length ? ` and ${words.length} words` : ''}.</span></div>
      ${label('From your core', kn ? 'already learned' : 'learn once, use everywhere', 'green')}
      <div class="card list">${core.map(c => phraseRow(code, c, { check: known(code, c.id), showEx: false })).join('')}</div>
      ${label('New here')}
      <div class="card list">${items.map(it => phraseRow(code, it)).join('')}</div>
      ${words.length ? `${label('Words for your blanks')}<div class="chips">${words.map(w => `<button class="chip word" data-act="play" data-code="${code}" data-text="${esc(w.t)}"><span lang="${code}" dir="auto">${esc(w.t)}</span> <span class="muted">${esc(w.en)}</span></button>`).join('')}</div>` : ''}
      ${s.signs && p.signs ? `${label('Read the signs', 'recognise, don’t say')}<div class="signs">${p.signs.map(g => `<div class="sign ${g.warn ? 'warn' : ''}"><b lang="${code}" dir="auto">${esc(g.t)}</b><span>${esc(g.en)}</span></div>`).join('')}</div>` : ''}
      ${s.diet ? `<a class="tile diet" href="#/card/${code}"><span class="tb act">${icon('utensils', 16)}</span><div class="tile-main"><div class="tile-title">Your diet card</div><div class="tile-meta">Allergies and restrictions, in big type for staff</div></div>${icon('right', 18)}</a>` : ''}`;
  } else {
    const about = idx === 0 && D.pack(code)?.about;
    body = `${about ? `<div class="reuse-note">${icon('bulb', 16)}<span>${esc(about)}</span></div>` : ''}<div class="card list">${items.map(it => phraseRow(code, it)).join('')}</div>`;
  }
  const loopOn = ui.looping === `${code}/${id}`;
  return `<div class="page">
    <div class="top-row"><a class="ibtn" href="#/today" aria-label="Back">${icon('left', 18)}</a>${modeToggle(L)}${iconBtn(loopOn ? 'stop' : 'headphones', `data-act="loop" data-code="${code}" data-sheet="${id}"`, loopOn ? 'Stop audio' : 'Loop audio')}</div>
    <header class="sheet-head"><div class="lbl">${esc(langName(code))} · ${s.kind === 'lens' ? 'lens' : 'sheet'} ${esc(s.id)}${idx >= 0 ? ` · ${idx + 1} of ${D.stack(L).length}` : ''}${st ? ` · best ${Math.round(st.best * 100)}%` : ''}</div><h1 class="display-l">${esc(s.title)}</h1><p class="sm muted">${esc(s.blurb || '')}</p></header>
    <div class="chips">${chip('Say it', ui.toggles.say, 'data-act="toggle" data-k="say"')}${chip('Word for word', ui.toggles.lit, 'data-act="toggle" data-k="lit"')}${chip('Hooks', ui.toggles.hooks, 'data-act="toggle" data-k="hooks"')}</div>
    ${!ttsSupported() ? '<p class="xs muted">This browser has no speech voices, so audio is off. Pronunciation guides still work.</p>' : ''}
    ${body}
    <div class="bottom-bar row-gap">${btn('Print', { style: 'secondary', href: `#/print/${code}/${id}`, ic: 'printer' })}${btn(s.kind === 'lens' ? `Recall the ${items.length} new` : 'Cover & recall', { href: `#/recall/sheet/${code}/${id}`, ic: 'arrow', cls: 'grow' })}</div>
  </div>`;
}

export function vRecall() {
  const S = ui.session;
  if (!S) return `<div class="page narrow"><p>No recall running.</p>${btn('Back to Today', { href: '#/today' })}</div>`;
  const cur = S.queue[S.pos];
  if (!cur) return '';
  const it = D.item(cur.code, cur.id, state.custom[cur.code] || []);
  const uniq = S.total;
  const doneN = Object.keys(S.first).length;
  const segs = Array.from({ length: Math.min(uniq, 40) }, (_, i) => {
    const k = S.order[i]; const g = S.first[k];
    return `<i class="${g === 2 ? 'g' : g === 1 ? 'y' : g === 0 ? 'r' : k === `${cur.code}:${cur.id}` ? 'c' : ''}"></i>`;
  }).join('');
  const reverse = !!it.hear;
  const promptLang = reverse ? cur.code : 'en';
  const prompt = reverse ? it.t : D.blank(it.en);
  const answer = reverse ? D.blank(it.en) : (it.frame ? D.blank(it.t) : it.t);
  const ex = D.example(cur.code, it);
  const multi = S.kind === 'mixed';
  return `<div class="page narrow recall">
    <div class="top-row"><a class="ibtn" href="#/today" data-act="end-recall" aria-label="Close">${icon('x', 18)}</a><div class="segs">${segs}</div><span class="lbl">${Math.min(doneN + 1, uniq)} / ${uniq}</span></div>
    <div class="lbl">${reverse ? 'What does this mean?' : `Say it in ${esc(langName(cur.code))}`}${multi ? ` · ${esc(langName(cur.code))}` : ''}</div>
    <h1 class="display-l prompt" ${reverse ? `lang="${cur.code}" dir="auto"` : ''}>${esc(prompt)}</h1>
    ${it.ctx && !S.revealed ? `<div class="chips">${it.ctx.slice(0, 3).map(c => `<span class="chip static">${esc(c)}</span>`).join('')}</div>` : ''}
    ${S.revealed ? `<section class="answer">
        <div class="lbl">Answer</div>
        <div class="phrase big" ${reverse ? '' : `lang="${cur.code}" dir="auto"`}>${esc(answer)}</div>
        ${reverse ? '' : `<div class="say-row">${playBtn(cur.code, it.frame && ex ? ex.t : it.t)}<span class="say">${esc(D.blank(it.say))}</span></div>`}
        ${it.lit ? `<div class="lit">word for word: ${esc(it.lit)}</div>` : ''}
        ${ex ? `<div class="ex">e.g. <span lang="${cur.code}" dir="auto">${esc(ex.t)}</span> · ${esc(ex.en)}</div>` : ''}
        ${it.hook ? `<div class="hook">${icon('bulb', 14)} ${esc(it.hook)}</div>` : ''}
      </section>`
      : `<button class="cover" data-act="reveal"><span>${icon('eye', 26, 1.75)}</span><b>Say it out loud first</b><span class="sm muted">then tap to check · space</span></button>
         ${it.hook ? (S.hint ? `<div class="hook">${icon('bulb', 14)} ${esc(it.hook)}</div>` : `<button class="link" data-act="hint">${icon('bulb', 14)} Show the hook</button>`) : ''}`}
    <div class="bottom-bar">${S.revealed
      ? `<div class="grades"><button class="grade r" data-act="grade" data-g="0"><b>Forgot</b><span>again in a moment · 1</span></button><button class="grade y" data-act="grade" data-g="1"><b>Shaky</b><span>again soon · 2</span></button><button class="grade g" data-act="grade" data-g="2"><b>Got it</b><span>next: later · 3</span></button></div>`
      : btn('Check', { act: 'reveal', ic: 'eye' })}</div>
  </div>`;
}

export function vDone() {
  const R = ui.lastResult;
  if (!R) return vToday();
  const L = R.code ? getLang(R.code) : null;
  const P = L ? plan(L) : null;
  const dots = R.marks.map(g => `<i class="${g === 2 ? 'g' : g === 1 ? 'y' : 'r'}"></i>`).join('');
  const pile = R.pile.map(p => { const it = D.item(p.code, p.id, state.custom[p.code] || []); return it ? `<div class="pile-row"><b class="${p.g === 1 ? 'y' : 'r'}"></b>${phraseRow(p.code, it, { showEx: false })}</div>` : ''; }).join('');
  let unlock = '';
  if (R.sheet && L) {
    const s = D.sheet(R.code, R.sheet); const best = sheetState(R.code, R.sheet)?.best || 0;
    const need = Math.max(0, Math.ceil(0.8 * R.total) - R.got);
    unlock = best >= 0.8
      ? `<section class="card unlock ok">${icon('check', 18, 2.5)}<div><b>${esc(s.title)} mastered.</b><div class="sm muted">${(() => { const n = D.stack(L).find(x => sheetStatus(R.code, x.id) !== 'done'); return n ? `Next up: ${esc(n.title)}` : 'Every sheet in your stack is mastered.'; })()}</div></div></section>`
      : `<section class="card unlock"><div class="lbl-row"><b class="sm">${need} more to master ${esc(s.title)}</b><span class="lbl">${Math.round(R.score * 100)}% · need 80%</span></div><div class="bar big"><i style="width:${Math.round(R.score * 100)}%"></i><u style="left:80%"></u></div></section>`;
  }
  const nextTxt = P?.next ? `Next: ${P.next.title} · ${fmtWhen(P.next.at)}` : '';
  return `<div class="page narrow">
    <div class="top-row"><a class="ibtn" href="#/today" aria-label="Close">${icon('x', 18)}</a><span class="lbl">${esc(R.title)} · done</span><span></span></div>
    <h1 class="display-l">${R.got} of ${R.total} stuck.</h1>
    <p class="muted">${R.pile.length ? `The other ${R.pile.length} go to your Revisit pile. Only those come back next time.` : 'Clean sweep. Nothing to revisit.'}</p>
    <div class="dots">${dots}</div>
    ${unlock}
    ${R.pile.length ? `${label(`Revisit pile · ${R.pile.length}`, `${R.pile.filter(p => p.g === 0).length} forgot · ${R.pile.filter(p => p.g === 1).length} shaky`)}<div class="card list">${pile}</div>` : ''}
    <div class="bottom-bar">${nextTxt ? `<p class="sm muted">${icon('moon', 14)} ${esc(nextTxt)}</p>` : ''}<div class="row-gap">${R.pile.length ? btn('Revisit now', { style: 'secondary', act: 'revisit' }) : ''}${btn('Done for now', { href: '#/today', cls: 'grow' })}</div></div>
  </div>`;
}

export function results() {
  const codes = ui.qLang === 'all' ? state.langs.map(l => l.code) : [ui.qLang];
  if (!ui.q.trim()) {
    return `<p class="sm muted">Try “where”, “check”, “water”, “no sé” or 洗手间. Search runs offline over the packs on this device, in English or any of your languages.</p>`;
  }
  const { matches, built } = search(ui.q, codes, state.custom);
  const row = (code, it, source, data = '') => `<div class="row result">
      ${playBtn(code, it.t)}
      <div class="row-main"><div class="phrase" lang="${code}" dir="auto">${it.frame ? frameText(it.t) : esc(it.t)}</div><div class="say">${esc(D.blank(it.say))}</div><div class="mean-inline">${esc(D.blank(it.en))}</div><div class="src">${esc(source)}</div></div>
      <div class="result-acts">${iconBtn('eye', `data-act="show" data-code="${code}" data-t="${esc(it.t)}" data-say="${esc(it.say || '')}" data-en="${esc(it.en)}"`, 'Show full-screen')}${iconBtn('plus', `data-act="add-recall" data-code="${code}" ${data}`, 'Add to tonight’s recall')}</div>
    </div>`;
  const src = m => {
    const ln = langName(m.code);
    if (m.kind === 'word') return `${ln} · word`;
    if (m.kind === 'custom') return `${ln} · added by you`;
    const s = D.sheet(m.code, m.sheet);
    return `${ln} · ${s ? s.title : ''}${m.kind === 'core' ? ` · reused in ${D.reuse(m.code, m.id)} packs` : ''}`;
  };
  const M = matches.map(m => row(m.code, m.it, src(m), `data-id="${m.id}"`)).join('');
  const B = built.map(b => row(b.code, b, `${langName(b.code)} · built from ${D.blank(b.frameIt.t)} + ${b.wordIt.t}`, `data-t="${esc(b.t)}" data-say="${esc(b.say)}" data-en="${esc(b.en)}"`)).join('');
  const repo = env.repo();
  return `${B ? `${label('Ready to say', 'your frame + a word')}<div class="card list">${B}</div>` : ''}
    ${M ? `${label('From your packs', `${matches.length}`)}<div class="card list">${M}</div>` : ''}
    ${!M && !B ? `<p class="muted">Nothing in your packs matches “${esc(ui.q)}”.</p>` : ''}
    <div class="missing">${icon('github', 18)}<span class="sm">Searches the packs saved on this device, offline. ${repo ? `Missing a phrase? <a href="${repo}/issues/new?title=${encodeURIComponent('Phrase request: ' + ui.q)}" target="_blank" rel="noopener">Suggest it on GitHub</a>.` : 'Crib never machine-translates: results come from the packs or from your frames.'}</span></div>`;
}

export function vSearch() {
  const langs = state.langs;
  return `<div class="page narrow">
    <div class="search-top"><label class="search-field">${icon('search', 18)}<input id="q" type="search" value="${esc(ui.q)}" placeholder="Search phrases in any language" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search phrases"></label><a class="link" href="#/today">Cancel</a></div>
    <div class="chips">${chip('All languages', ui.qLang === 'all', 'data-act="qlang" data-code="all"')}${langs.map(l => chip(langName(l.code), ui.qLang === l.code, `data-act="qlang" data-code="${l.code}"`)).join('')}</div>
    <div id="results">${results()}</div>
  </div>`;
}

export function vLanguages() {
  const cards = state.langs.map(L => {
    const P = plan(L);
    const stk = D.stack(L); const done = stk.filter(s => sheetStatus(L.code, s.id) === 'done').length;
    const nxt = P.current ? `${P.current.title} · now` : P.next ? `${P.next.title} · ${fmtWhen(P.next.at)}` : 'All recalls done';
    return `<section class="card lcard ${L.code === state.active ? 'on' : ''}">
      <div class="lc-top">${badge(L, 'lg')}<div class="grow"><div class="tile-title">${esc(langName(L.code))}</div><div class="xs muted">${esc(D.meta(L.code)?.variant || '')}${P.started ? '' : ` · starts ${fmtDay(P.d0)}`}</div></div>${modeToggle(L)}</div>
      <div class="segbar">${stk.map(s => `<i class="${sheetStatus(L.code, s.id)}"></i>`).join('')}<span class="xs muted">${done}/${stk.length} sheets</span></div>
      <div class="lc-bot"><span class="sm">${icon('moon', 14)} ${esc(nxt)}</span><button class="link" data-act="lang" data-code="${L.code}">Open ${icon('right', 14)}</button></div>
    </section>`;
  }).join('');
  return `<div class="page narrow">
    <div class="top-row"><h1 class="display-l">Your languages</h1><a class="ibtn" href="#/add" aria-label="Add language">${icon('plus', 18)}</a></div>
    <p class="sm muted">Each language runs its own sprint. Due recalls from all of them land in one queue.</p>
    ${dueBanner()}
    ${cards}
    <a class="add-card" href="#/add">${icon('plus', 16)} Add a language</a>
  </div>`;
}

export function vDevice(info = {}) {
  const fmtMB = b => b == null ? '—' : (b / 1048576).toFixed(1) + ' MB';
  const standalone = env.standalone();
  const lb = state.ui.lastBackup;
  const voices = state.langs.map(L => { const v = ttsSupported() ? voiceFor(D.meta(L.code)?.tts || L.code) : null; return `<div class="kv"><span>${esc(langName(L.code))}</span><span class="xs ${v ? 'muted' : 'red'}">${v ? esc(v.name) : 'no voice on this device'}</span></div>`; }).join('');
  return `<div class="page narrow">
    <h1 class="display-l">This device</h1>
    <p class="sm muted">No account, no server. Everything Crib knows about you is stored here, and only here.</p>
    <section class="status ${standalone && info.persisted ? 'ok' : 'warn'}">${icon('shield', 20)}<div class="grow"><b>${standalone ? 'Installed' : 'Running in the browser'} · ${info.persisted ? 'storage protected' : 'storage not protected yet'}</b><div class="xs">${fmtMB(info.usage)} used${!standalone ? ' · install to keep your progress safe' : ''}</div></div>${!info.persisted ? btn('Protect', { act: 'persist', style: 'secondary' }) : ''}</section>
    ${!standalone ? `<section class="card pad">${ui.installPrompt ? btn('Install Crib', { act: 'install', ic: 'download' }) : `<b>Install Crib</b><ol class="steps-ol"><li>${env.ios() ? `Tap ${icon('share', 14)} Share in Safari` : 'Open your browser menu'}</li><li>Choose “Add to Home Screen” / “Install app”</li><li>Open Crib from your Home Screen</li></ol>`}<p class="xs muted">Safari can clear a website’s data after 7 days without a visit. Installed web apps keep their own counter.</p></section>` : ''}
    <section class="card pad"><div class="card-head"><h3>Backup</h3><span class="xs ${lb ? 'muted' : 'red'}">${lb ? 'Last: ' + fmtDay(lb) : 'Never backed up'}</span></div><p class="sm muted">Export a small file to move to a new device or survive a reset. Import it anywhere.</p><div class="row-gap"><label class="btn btn-secondary">${icon('upload', 18)}<span>Import</span><input type="file" accept="application/json,.json" data-act="import" hidden></label>${btn('Export backup', { act: 'export', ic: 'download', cls: 'grow' })}</div></section>
    <section class="card pad"><div class="card-head"><h3>${icon('calendar', 18)} Reminders</h3></div><p class="sm muted">There’s no server to send notifications, so your recall times go into your own calendar.</p>${btn('Add upcoming recalls (.ics)', { act: 'ics', style: 'secondary' })}</section>
    <section class="card pad"><div class="card-head"><h3>Voices</h3></div><p class="sm muted">Pronunciation uses your device’s own voices.</p>${voices || '<p class="sm muted">Add a language first.</p>'}</section>
    <section class="card pad"><div class="card-head"><h3>Start over</h3></div><p class="sm muted">Deletes every language, sheet and recall on this device.</p>${btn(ui.resetArmed ? 'Tap again to delete everything' : 'Reset Crib', { act: 'reset', style: 'danger', ic: 'trash' })}</section>
    <p class="xs muted center">Crib v0.1 · ${env.repo() ? `<a href="${env.repo()}" target="_blank" rel="noopener">Source on GitHub</a>` : 'open source'}</p>
  </div>`;
}

export function vCard(code) {
  const L = getLang(code), p = D.pack(code);
  if (!L || !p) return notFound();
  const dt = p.diet, sel = L.diet || [];
  const lines = sel.map(k => dt.options[k]).filter(Boolean);
  const en = ui.cardEnglish;
  return `<div class="card-screen">
    <div class="page narrow">
      <div class="top-row"><a class="ibtn" href="#/today" aria-label="Close">${icon('x', 18)}</a><span class="lbl">Show this to staff</span>${iconBtn('repeat', 'data-act="card-flip"', 'Flip language')}</div>
      <div class="chips edit">${Object.entries(dt.options).map(([k, o]) => chip(o.label, sel.includes(k), `data-act="diet" data-code="${code}" data-opt="${k}"`)).join('')}</div>
      ${lines.length ? `
        <div class="lbl">${en ? 'Allergy · please read' : esc(dt.title)}</div>
        <div class="card-text" ${en ? '' : `lang="${code}" dir="auto"`}>${lines.map((o, i) => `<p class="${i === 0 ? 'big' : ''}">${esc(en ? o.en : o.t)}</p>`).join('')}<p>${esc(en ? dt.askEn : dt.ask)}</p><p class="thanks">${esc(en ? 'Thank you!' : dt.thanks)}</p></div>
        ${!en ? `<div class="for-you"><div class="lbl">For you</div><p class="sm">${esc(lines.map(o => o.en).join(' '))} ${esc(dt.askEn)}</p></div>` : ''}
        <p class="xs mono">${esc(dt.note || '')}</p>`
      : '<p class="display-m">Pick your restrictions above.</p><p class="sm">Crib writes them in big type in the local language.</p>'}
      <div class="bottom-bar">${lines.length ? `<div class="row-gap">${btn('Print wallet card', { style: 'secondary', href: `#/print/${code}/DIET`, ic: 'printer' })}${btn('Read it aloud', { act: 'card-read', attrs: `data-code="${code}"`, cls: 'grow', ic: 'play' })}</div>` : ''}<p class="xs">${icon('alert', 13)} A card helps; it doesn’t guarantee the kitchen understood. Carry your medication.</p></div>
    </div></div>`;
}

export function vPrint(code, id) {
  const L = getLang(code), p = D.pack(code);
  if (!L || !p) return notFound();
  const m = D.meta(code);
  if (id === 'DIET') {
    const dt = p.diet, lines = (L.diet || []).map(k => dt.options[k]).filter(Boolean);
    return `<div class="print-wrap"><div class="print-actions no-print">${btn('Back', { style: 'secondary', href: `#/card/${code}`, ic: 'left' })}${btn('Print', { act: 'print', ic: 'printer' })}</div>
      <div class="print-page wallet"><p class="xs mono no-print">Credit-card size. Print at 100%, cut out, fold on the dotted line.</p>
        <div class="wcard front"><div class="w-h"><b class="red">${esc(dt.title)}</b><i class="wordmark-sm">crib</i></div><div lang="${code}" dir="auto">${lines.map((o, i) => `<p class="${i ? '' : 'w-big'}">${esc(o.t)}</p>`).join('')}<p>${esc(dt.ask)}</p></div><p class="w-thanks" lang="${code}" dir="auto">${esc(dt.thanks)}</p></div>
        <div class="wfold"></div>
        <div class="wcard back"><b>${esc(lines.map(o => o.en).join(' '))}</b>${['Name', 'Emergency contact', 'Medication'].map(x => `<div class="wline"><span>${x}</span></div>`).join('')}</div>
      </div></div>`;
  }
  let groups;
  if (id === 'CORE') groups = p.sheets.filter(s => s.kind === 'core').map(s => [s.title, s.items]);
  else {
    const s = D.sheet(code, id); if (!s) return notFound();
    groups = s.kind === 'lens' ? [['From your core', (s.core || []).map(c => D.item(code, c)).filter(Boolean)], ['New here', s.items]] : [[s.title, s.items]];
  }
  const title = id === 'CORE' ? `The core ${groups.reduce((a, g) => a + g[1].length, 0)}` : D.sheet(code, id).title;
  const hooks = groups.flatMap(g => g[1]).filter(i => i.hook).slice(0, 2);
  return `<div class="print-wrap"><div class="print-actions no-print">${btn('Back', { style: 'secondary', href: id === 'CORE' ? '#/today' : `#/sheet/${code}/${id}`, ic: 'left' })}${id !== 'CORE' ? btn('Print the core instead', { style: 'secondary', href: `#/print/${code}/CORE` }) : ''}${btn('Print', { act: 'print', ic: 'printer' })}</div>
    <article class="print-page">
      <header class="p-head"><span class="wordmark">crib</span><div class="p-meta"><b>${esc(m.name)}${m.variant ? ` (${esc(m.variant)})` : ''} · ${L.mode}</b><span>Printed ${new Date().toLocaleDateString()}</span></div></header>
      <div class="p-title"><h1>${esc(title)}</h1><div class="p-how"><b>How to use</b><span>Fold on the dotted line so only the English shows. Say it out loud, unfold, check. Tick a box per pass: now, before bed, tomorrow morning.</span></div></div>
      <table class="p-table"><thead><tr><th>English</th><th class="fold"></th><th>${esc(m.name)} · say it out loud</th><th class="ticks">Now · Bed · AM</th></tr></thead>
      <tbody>${groups.map(([g, its]) => `<tr class="grp"><td colspan="4">${esc(g)}</td></tr>${its.map(it => `<tr><td>${esc(D.blank(it.en))}${it.ctx ? `<small>${esc(it.ctx.join(' · '))}</small>` : ''}</td><td class="fold"></td><td><span class="p-t" lang="${code}" dir="auto">${esc(D.blank(it.t))}</span><small class="p-say">${esc(D.blank(it.say))}</small></td><td class="ticks"><i></i><i></i><i></i></td></tr>`).join('')}`).join('')}</tbody></table>
      <footer class="p-foot">${hooks.length ? `<div class="p-hooks"><b>Hooks</b>${hooks.map(h => `<span>${esc(h.hook)}</span>`).join('')}</div>` : ''}<div class="p-test"><b>Field test</b><span>Use five of these today: in a meeting, a shop or a chat.</span><span class="ticks"><i></i><i></i><i></i><i></i><i></i></span></div></footer>
      <div class="p-bottom"><span>crib · cheat sheets for any language</span><span>${esc(id)} · ${esc(code)}</span></div>
    </article></div>`;
}

export function overlayShow() {
  const s = ui.show; if (!s) return '';
  return `<div class="overlay show" role="dialog" aria-label="Phrase full-screen"><button class="ibtn close" data-act="close-show" aria-label="Close">${icon('x', 20)}</button><div class="show-t" lang="${s.code}" dir="auto">${esc(D.blank(s.t))}</div><div class="say">${esc(D.blank(s.say))}</div><div class="sm">${esc(D.blank(s.en))}</div>${btn('Play', { act: 'play', attrs: `data-code="${s.code}" data-text="${esc(s.t)}"`, ic: 'play' })}</div>`;
}

export function overlayInstall() {
  if (!ui.iosSheet) return '';
  return `<div class="overlay scrim" data-act="close-ios"></div><div class="sheet-modal" role="dialog" aria-label="Install Crib">
    <div class="grab"></div>
    <div class="row-gap"><span class="appicon">c</span><div><b>Install Crib</b><div class="sm muted">Free · no account · works offline</div></div></div>
    <div class="hl-box">${icon('shield', 18)}<span class="sm"><b>Your progress lives only on this device.</b> In a browser tab, Safari can clear it after 7 days without a visit. On your Home Screen, it stays.</span></div>
    <ol class="ios-steps"><li><span>1</span>Tap Share in Safari’s toolbar ${icon('share', 16)}</li><li><span>2</span>Choose “Add to Home Screen” ${icon('plusSquare', 16)}</li><li><span>3</span>Open Crib from your Home Screen ${icon('home', 16)}</li></ol>
    ${btn('Got it', { act: 'close-ios' })}${btn('Keep using in the browser', { act: 'dismiss-install', style: 'ghost' })}
  </div>`;
}

// ------------------------------------------------------------------ desktop chrome
export function side(route) {
  const L = activeLang();
  const langs = state.langs.map(l => {
    const due = dueItems([l.code]).length;
    return `<button class="side-lang ${L && l.code === L.code ? 'on' : ''}" data-act="lang" data-code="${l.code}">${badge(l)}<div class="grow"><div>${esc(langName(l.code))}</div><div class="xs mono muted">${l.mode}</div></div>${due ? `<span class="xs mono red">${due} due</span>` : ''}</button>`;
  }).join('');
  const stk = L ? D.stack(L).map(s => {
    const st = sheetStatus(L.code, s.id);
    const on = route[0] === 'sheet' && route[2] === s.id;
    return `<a class="side-sheet ${on ? 'on' : ''}" href="#/sheet/${L.code}/${s.id}"><span class="tb sm ${st}">${st === 'done' ? icon('check', 12, 3) : esc(s.id)}</span>${esc(s.title)}</a>`;
  }).join('') : '';
  const lb = state.ui.lastBackup;
  return `${wordmark()}
    <a class="side-search" href="#/search">${icon('search', 15)}<span class="grow">Search phrases</span><kbd>⌘K</kbd></a>
    <div class="side-sec"><div class="lbl">Languages</div>${langs}<a class="side-add" href="#/add">${icon('plus', 14)} Add language</a></div>
    ${L ? `<div class="side-sec"><div class="lbl">${esc(langName(L.code))} · ${L.mode}</div>${stk}<a class="side-sheet" href="#/print/${L.code}/CORE">${icon('printer', 14)} Print the core</a></div>` : ''}
    <div class="grow"></div>
    <a class="side-store" href="#/device">${icon('device', 16)}<div><div>Saved on this device</div><div class="xs mono muted">${lb ? 'Backup ' + fmtDay(lb) : 'No backup yet'}</div></div></a>`;
}

export function panel() {
  const L = activeLang();
  if (!L) return '';
  return `<div class="lbl">${esc(langName(L.code))} · plan</div>${planCard(L)}${dueBanner(true)}
    ${(L.reasons || []).includes('travel') ? `<a class="tile diet" href="#/card/${L.code}"><span class="tb act">${icon('utensils', 16)}</span><div class="tile-main"><div class="tile-title">Diet card</div><div class="tile-meta">Show it to staff</div></div></a>` : ''}
    <div class="kbd-hints"><span><kbd>/</kbd> search</span><span><kbd>space</kbd> reveal</span><span><kbd>1 2 3</kbd> grade</span></div>`;
}

export function tabbar(route) {
  const t = (href, ic, lbl, on) => `<a href="${href}" class="${on ? 'on' : ''}">${icon(ic, 22, on ? 2 : 1.75)}<span>${lbl}</span></a>`;
  const r = route[0] || 'today';
  return t('#/today', 'sun', 'Today', ['today', 'sheet'].includes(r)) + t('#/search', 'search', 'Search', r === 'search') + t('#/languages', 'globe', 'Languages', ['languages', 'add'].includes(r)) + t('#/device', 'device', 'Device', r === 'device');
}

export const notFound = () => `<div class="page narrow"><h1 class="display-m">Not found.</h1>${btn('Back to Today', { href: '#/today' })}</div>`;
export const loading = () => `<div class="page narrow"><p class="muted">Loading…</p></div>`;
