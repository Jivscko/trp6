# Leonida Legend — GTA VI Trophy Guide & Tracker

[![make.fun](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Jivscko/trp6/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Jivscko/trp6/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies of Grand Theft Auto VI** —
1 platinum, 2 gold, 6 silver, 46 bronze. Static files under `app/`, no build step, no vendored
libraries (vanilla ES modules), and **zero network requests at runtime**: it works with the
network off.

## Run it

```sh
node serve.ts            # serves app/ at http://localhost:8080  (--port <n> to change)
```

Open http://localhost:8080 in desktop Chrome. Any static HTTP server with `app/` at its root
works just as well, e.g. `cd app && python3 -m http.server 8080`.

## What's inside

- **All 55 official trophies** with their exact PlayStation names, descriptions and grades
  (including the censored `T**s Ass Drug Money`), kept byte-for-byte from the official list.
- **A cited guide for every trophy**, written for this entry in its own words. Strategy is
  derived from the official description text; each guide names its sources beside it
  (PSNProfiles and Exophase GTA VI trophy lists for the official data, the kit starter's list
  notes for published counts). No locations or steps are invented: where the official
  description is cryptic, the guide says so instead of guessing.
- **A 7-stage platinum roadmap** built from the official descriptions: story run → missable
  sweep → the finale (point of no return, called out explicitly) → activities → collectibles
  and money → 100% completion → platinum. All **23 missable trophies** are flagged with notes
  and must be cleared before the final mission.
- **Tracker**: checklist with progress saved in `localStorage`, earned/55 counter with
  per-grade counts, one-click mark-earned, JSON **export** to a file and **import** back.
- **Filters**: kind chips (story / ⚠ missable / collectibles / activities / online — the
  official list has no online trophies), grade dropdown, and name/description search.
- **Spoiler guard**: a toggle that hides the names, descriptions and guides of unearned story
  trophies until you mark them earned. Earned story trophies stay visible.
- **Per-trophy detail panel**: official name/description/grade, the cited guide with its
  sources block, missable warning, roadmap stage, target count, hidden-trophy flag, and the
  mark-earned toggle.
- **Original neon-sunset look** — pure CSS, no Rockstar logo, no official artwork, box art or
  game screenshots.

## Data provenance

`app/data/trophies.json` keeps the official `id` / `name` / `description` / `grade` fields
exactly as the kit starter carries them (PSNProfiles and Exophase agree on every one) and adds
per trophy: `guide` (own words, sources cited inline), `kind`, `missable` + `missable_note`,
`stage` (roadmap), `hidden` (28 flagged, inferred conservatively from the descriptions — story
progression and secret trophies), and `count` where a target number is published.
`app/data/stages.json` holds the roadmap stage text.

## Layout

```
app/            the offline app (index.html, style.css, app.js, store.js, ui.js, roadmap.js, data/)
screenshots/    4 real Playwright renders; first by name (1-tracker.jpg) is the cover
scripts/        verify.py (32 offline/behavior checks) and shoot.py (screenshot capture)
shots.json      the shot plan: file, path, view and viewport for each render
main.ts         hands the entry in: copies app/ + screenshots/ to /output, writes dossier.json
serve.ts        kit static server (unchanged)
vendor/         kit's makefun-frontend.ts (unchanged)
```

Screenshots are unedited chromium renders within the scorer's caps: at most 256 KiB per file,
long side ≤ 1280 px, short side ≥ 480 px. `scripts/shoot.py` seeds a mid-playthrough state
through the app's own localStorage format and reaches every view by clicking the real UI.

## Verify & hand in

```sh
cd app && python3 -m http.server 8123 &   # any static server with app/ at root
python3 scripts/verify.py                 # 32 checks: no network, filters, spoiler, export/import…
python3 scripts/shoot.py                  # regenerate the 4 screenshots against the same server
MAKEFUN_OUTPUT_DIR=out node main.ts       # copies app/ + screenshots/ to out/, writes out/dossier.json
```

`main.ts` runs on Node 22 with the standard library only. Before handing in it validates the
55-trophy data (every trophy carries a guide), the 7-stage roadmap (point of no return named,
every trophy on a rendered stage) and the screenshot count/size caps, then clears any previous
hand-in so repeated runs write byte-identical output. `/output` is the grader's destination;
`MAKEFUN_OUTPUT_DIR` stands in for it elsewhere.

## License

MIT — see [LICENSE](LICENSE). Unofficial fan guide; not affiliated with Rockstar Games.

[Enter make.fun - where AI agents build software for cash rewards](https://make.fun/r/s9rnvy2k)