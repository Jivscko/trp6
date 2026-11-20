// store.js — progress state, localStorage persistence, export/import. No network anywhere.
const KEY = 'leonida-legend.progress.v1';
const PREFS_KEY = 'leonida-legend.prefs.v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { earned: {} };
    const parsed = JSON.parse(raw);
    return { earned: sanitizeEarned(parsed.earned) };
  } catch {
    return { earned: {} };
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, earned: state.earned }));
  } catch {
    // storage full or blocked: progress stays in memory for this session
  }
}

export function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function sanitizeEarned(earned) {
  const clean = {};
  if (earned && typeof earned === 'object') {
    for (const [id, val] of Object.entries(earned)) {
      if (/^\d+$/.test(id) && val === true) clean[id] = true;
    }
  }
  return clean;
}

export function isEarned(state, id) {
  return state.earned[String(id)] === true;
}

export function toggleEarned(state, id) {
  const key = String(id);
  if (state.earned[key]) delete state.earned[key];
  else state.earned[key] = true;
  saveState(state);
}

export function earnedCount(state) {
  return Object.keys(state.earned).length;
}

export function gradeCounts(state, trophies) {
  const counts = {};
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) counts[g] = { earned: 0, total: 0 };
  for (const t of trophies) {
    const bucket = counts[t.grade];
    if (!bucket) continue;
    bucket.total += 1;
    if (isEarned(state, t.id)) bucket.earned += 1;
  }
  return counts;
}

// Export: build a JSON file in memory and hand it to the browser's download. No server involved.
export function exportProgress(state, trophies) {
  const payload = {
    app: 'leonida-legend-gta6-trophy-tracker',
    version: 1,
    exported_at: new Date().toISOString(),
    earned_ids: Object.keys(state.earned).map(Number).sort((a, b) => a - b),
    earned_names: trophies.filter((t) => isEarned(state, t.id)).map((t) => t.name),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gta6-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return payload.earned_ids.length;
}

// Import: accept our export format (earned_ids) or a raw {earned:{id:true}} map.
// Returns {ok, count} or {ok:false, error}.
export function importProgress(text, state, trophies) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }
  const validIds = new Set(trophies.map((t) => t.id));
  let ids = [];
  if (Array.isArray(parsed)) {
    ids = parsed;
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.earned_ids)) ids = parsed.earned_ids;
    else if (parsed.earned && typeof parsed.earned === 'object') {
      ids = Object.entries(parsed.earned).filter(([, v]) => v === true).map(([k]) => Number(k));
    } else {
      return { ok: false, error: 'No earned_ids or earned map found in file.' };
    }
  } else {
    return { ok: false, error: 'Unrecognized progress format.' };
  }
  const clean = {};
  let skipped = 0;
  for (const raw of ids) {
    const id = Number(raw);
    if (validIds.has(id)) clean[String(id)] = true;
    else skipped += 1;
  }
  state.earned = clean;
  saveState(state);
  return { ok: true, count: Object.keys(clean).length, skipped };
}

export function resetProgress(state) {
  state.earned = {};
  saveState(state);
}