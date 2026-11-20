// Leonida Legend — GTA VI trophy guide & tracker. Entry program (Node 22, standard library only).
// The guide itself is the static app/ directory (no build step, fully offline). This program hands
// the entry in: it copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json with the kit's vendored buildDossier. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// vendor/makefun-frontend.ts is the kit's copy, unchanged: the scorer rebuilds the dossier with the
// same library and compares byte for byte, so the caps below must stay the scorer's own.
//
// Revision pass: the output directory is now cleared of any previous hand-in before copying (two
// runs write the same bytes even when the output dir is reused), and the trophy data and screenshots
// are sanity-checked before buildDossier runs, so a broken entry fails with a clear message instead
// of a library error.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: the trophy file must carry all 55 official trophies, each with a non-blank guide.
const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
const trophies = Array.isArray(data) ? data : data.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) {
  throw new Error(`trophies.json must hold exactly 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'no array'}`);
}
for (const t of trophies) {
  if (!t.name || typeof t.guide !== 'string' || !t.guide.trim()) {
    throw new Error(`trophy ${t.id ?? '?'} (${t.name ?? 'unnamed'}) has no guide text`);
  }
}

// Pre-flight: 3-4 screenshots, each a whole file within the scorer's 256 KiB cap.
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => !f.startsWith('.') && statSync(join(shotsDir, f)).isFile())
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}
for (const f of shots) {
  const size = statSync(join(shotsDir, f)).size;
  if (size > 262144) throw new Error(`screenshot ${f} is ${size} bytes, past the 262144-byte cap`);
}

// Hand in the app and its screenshots. Clear any previous hand-in first so repeated runs are
// byte-identical and no stale file rides along.
mkdirSync(out, { recursive: true });
for (const name of ['app', 'screenshots', 'dossier.json']) {
  rmSync(join(out, name), { recursive: true, force: true });
}
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's caps: 4 screenshots at most, 256 KiB each; app/ at most 993 entries and 48 MiB;
// dossier text capped at 160 KiB. buildDossier refuses anything past them.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`handed in: app/ + ${shots.length} screenshots + dossier.json (${dossier.length} bytes) -> ${out}`);