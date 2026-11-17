# Crib

**Cram a language in 24 hours.** Crib is a tiny, offline-first web app that teaches you the 20 or so phrases that do most of the work in a real conversation. You learn them in one evening and lock them in with a few short recalls before the next evening.

It is the opposite of a daily-streak app. You get one cheat sheet at a time, you memorise it in one go, and you only revisit what you forgot.

## How it works

- **A small core that gets reused everywhere.** Three core sheets: *Keep it alive* ("I don't understand", "One moment, please"), *React* ("Exactly", "No worries") and *Frames* ("Where is …?", "I'd like …"). Each frame is a sentence with a blank that you fill with any word.
- **Lenses, not phrasebooks.** Work (Slack and meetings), Travel (eating out, shopping, getting around, toilets and emergencies) and Family. Each lens shows which core lines you already know, then adds only 2–4 new lines and a few words for your blanks.
- **Basic or Utility, one tap.** Basic mode covers greetings, numbers and a one-page *Blueprint* of how the grammar works. Utility mode is the conversation core plus your lenses.
- **The 24-hour loop.** Cram in the evening, recall after 40 minutes, recall before bed, then recall again in the morning and use five phrases on a real person. After that, recalls on day 3, day 7 and day 30. A sheet is mastered at 80% recall.
- **Many languages at once.** Each language runs its own sprint, starting one night apart. Due cards from every language share one queue.
- **Search that builds sentences.** Type "where is the pharmacy" and Crib composes it from your frame and the word, in each of your languages. It never machine-translates: every result comes from a pack.
- **Diet card.** Allergies and restrictions in large type in the local language, ready to show staff, plus a wallet-size printable card.
- **Print and desktop.** A4 fold-and-cover sheets for paper practice, and a three-column desktop layout with ⌘K search and keyboard grading (space to reveal, 1/2/3 to grade).

## Languages (26)

Spanish (Mexico), French, German, Italian, Portuguese (Brazil), Japanese, Mandarin, Korean, Arabic (Modern Standard), Russian, Turkish, Vietnamese, Thai, Indonesian, Malay, Dutch, Polish, Greek, Ukrainian, Romanian, Czech, Swedish, Swahili, Tagalog, Hebrew and Persian.

Every pack has the same 56 lines, about 20 words to drop into the frames, a diet card in the local language and the signs you will see (restrooms, exits, push/pull, plus traps like Spanish *M = Mujeres*). Grammar is handled per language: German *einen Kaffee*, Russian *воду*, French plural *Où sont les toilettes ?*, Turkish *İstasyon*, and right-to-left layout for Arabic, Hebrew and Persian.

## Privacy

There is no account and no server. Progress lives only in your browser's storage on this device. Crib asks the browser to keep that storage permanently, and the **Device** tab lets you export and import a backup file. On iPhone, add Crib to your Home Screen; Safari can clear storage for sites you haven't opened in seven days, but Home Screen apps are exempt.

Reminders work through a calendar file (.ics) that you add to your own calendar. Audio uses your device's built-in voices.

## Run it locally

No build step. Any static file server works:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

With the [GitHub CLI](https://cli.github.com) installed and signed in (`gh auth login`), run this from this folder:

```sh
git init -b main
git add -A
git commit -m "Crib v0.1"
gh repo create crib --public --source . --remote origin --push
gh api -X POST "repos/{owner}/{repo}/pages" -f "source[branch]=main" -f "source[path]=/"
gh api "repos/{owner}/{repo}/pages" --jq .html_url
```

Pages takes about a minute to go live. All paths are relative, so the app works from `username.github.io/crib/` or from a custom domain. Links like "Suggest a phrase" automatically point at this repo's issues.

## Content: add or fix a language

Packs are generated, so all 26 languages stay in step:

- `tools/content.py` holds the shared concepts (English, context, which frames take which words) and the sheet layout.
- `tools/langs/*.py` holds one block per language: the target text and pronunciation for each concept (`I`), the frame words (`W`, with optional object forms `acc`/`accSay` and plural `pl`), the diet card (`DIET`), the signs (`SIGNS`) and optional extra lines (`EXTRA`).
- `{x}` in a frame is the blank; `{x:acc}` uses the word's object form where the language has one. If a frame can't take a blank grammatically (Japanese, Korean, Thai, Arabic and Turkish verb frames), write the whole sentence instead and it becomes a fixed phrase.

Then rebuild:

```sh
python3 tools/build_packs.py
```

This writes `data/<code>.json` and `data/languages.json` and lists anything missing. Corrections from native speakers are very welcome: open an issue or a pull request.

## Files

```
index.html             app shell
styles.css             all styles, including print and desktop
sw.js                  service worker (offline cache)
manifest.webmanifest   PWA manifest
js/                    app modules (no framework)
data/                  generated language packs
tools/                 pack generator and per-language content
```
