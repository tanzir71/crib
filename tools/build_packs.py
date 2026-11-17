"""Builds crib/data/*.json from the shared concept set (content.py) and one module per language (langs/*.py).
Run from the repo root: python3 tools/build_packs.py
"""
import importlib, json, os, pkgutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content import CONCEPTS, WORDS, WORD_CAT, TAGS, SHEETS, DIET_EN, DIET_ASK_EN  # noqa: E402
import langs  # noqa: E402

OUT = os.path.join(HERE, '..', 'data')
ORDER = ['es-MX', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR', 'ar', 'ru-RU', 'tr-TR', 'vi-VN', 'th-TH', 'id-ID', 'ms-MY', 'nl-NL', 'pl-PL',
         'el-GR', 'uk-UA', 'ro-RO', 'cs-CZ', 'sv-SE', 'sw-KE', 'fil-PH', 'he-IL', 'fa-IR']
SOON = []  # every catalog language ships a full pack


def unpack(v):
    t, say = v[0], v[1]
    extra = v[2] if len(v) > 2 else {}
    return t, say, extra


def build(mod):
    meta = mod.META
    code = meta['code']
    I, W = mod.I, mod.W
    warnings = []
    words = []
    for wid, (en, kind) in WORDS.items():
        if wid not in W:
            continue
        t, say, extra = unpack(W[wid])
        w = {'id': wid, 't': t, 'say': say, 'en': en, 'kind': kind}
        if wid in WORD_CAT: w['cat'] = WORD_CAT[wid]
        if wid in TAGS: w['tags'] = TAGS[wid]
        w.update(extra)
        words.append(w)
    wids = {w['id'] for w in words}

    def make_item(cid):
        if cid not in I:
            warnings.append(f'{code}: missing {cid}')
            return None
        c = CONCEPTS[cid]
        t, say, extra = unpack(I[cid])
        it = {'id': cid, 't': t, 'say': say, 'en': c['en']}
        if c.get('ctx'): it['ctx'] = c['ctx']
        if c.get('hear'): it['hear'] = True
        if cid in TAGS: it['tags'] = TAGS[cid]
        if '{x' in c['en']:
            if '{x' in t:
                it['frame'] = True
                it['takes'] = c.get('takes', 'noun')
                ex = c.get('ex')
                if ex not in wids:
                    ex = next((w['id'] for w in words if w['kind'] == it['takes']), None)
                if ex: it['ex'] = ex
                if c.get('fits'): it['fits'] = c['fits']
            else:
                it['en'] = c.get('enFixed') or c['en'].replace('{x}', '…')
        for k in ('lit', 'hook', 'note', 'en', 'tPl', 'sayPl'):
            if k in extra: it[k] = extra[k]
        return it

    sheets = []
    for sdef in SHEETS:
        s = {k: v for k, v in sdef.items() if k not in ('items', 'core', 'words')}
        s['items'] = [x for x in (make_item(c) for c in sdef['items']) if x]
        for i, (t, say, en) in enumerate(getattr(mod, 'EXTRA', {}).get(sdef['id'], []), 1):
            s['items'].append({'id': f"x.{sdef['id']}{i}", 't': t, 'say': say, 'en': en})
        if 'core' in sdef: s['core'] = [c for c in sdef['core'] if c in I]
        if 'words' in sdef: s['words'] = [w for w in sdef['words'] if w in wids]
        sheets.append(s)

    D = mod.DIET
    diet = {'title': D['title'], 'ask': D['ask'], 'askEn': DIET_ASK_EN, 'thanks': D['thanks'], 'note': D.get('note', ''),
            'options': {k: {'label': lbl, 't': D[k], 'en': en} for k, (lbl, en) in DIET_EN.items() if k in D}}
    signs = [{'t': s[0], 'en': s[1], **({'warn': True} if len(s) > 2 and s[2] else {})} for s in mod.SIGNS]
    pack = dict(meta)
    pack.update({'sheets': sheets, 'words': words, 'diet': diet, 'signs': signs})
    return pack, warnings


def main():
    mods = {}
    for m in pkgutil.iter_modules(langs.__path__):
        mod = importlib.import_module(f'langs.{m.name}')
        for L in getattr(mod, 'LANGS', [mod]):
            mods[L.META['code']] = L
    catalog, allw = [], []
    for code in ORDER:
        if code not in mods:
            print('!! missing module for', code); continue
        pack, warns = build(mods[code])
        allw += warns
        with open(os.path.join(OUT, f'{code}.json'), 'w', encoding='utf-8') as f:
            json.dump(pack, f, ensure_ascii=False, separators=(',', ':'))
        entry = {k: pack[k] for k in ('code', 'name', 'native', 'badge', 'tts') if k in pack}
        if pack.get('variant'): entry['variant'] = pack['variant']
        if pack.get('rtl'): entry['rtl'] = True
        entry['pack'] = f'data/{code}.json'
        catalog.append(entry)
    catalog += [{'code': c, 'name': n, 'native': nat, 'soon': True} for c, n, nat in SOON]
    with open(os.path.join(OUT, 'languages.json'), 'w', encoding='utf-8') as f:
        json.dump({'version': 2, 'languages': catalog}, f, ensure_ascii=False, indent=1)
    print(f'built {len([c for c in catalog if not c.get("soon")])} packs')
    for w in allw: print('  warn', w)


if __name__ == '__main__':
    main()
