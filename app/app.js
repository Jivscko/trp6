// app.js — bootstrap: load the offline data files, wire the toolbar, render tracker + roadmap.
// Everything loads from this app's own directory; the app makes zero network requests.
import {
  loadState, loadPrefs, savePrefs, isEarned, toggleEarned,
  exportProgress, importProgress, resetProgress,
} from './store.js';
import { renderList, renderDetail, renderProgress, toast } from './ui.js';
import { renderRoadmap } from './roadmap.js';

const state = loadState();
const prefs = loadPrefs();
const filters = {
  kind: prefs.kind ?? 'all',
  grade: prefs.grade ?? 'all',
  search: '',
  spoiler: prefs.spoiler === true,
};
let trophies = [];
let stagesData = null;
let selectedId = null;
let view = 'tracker';

const $ = (id) => document.getElementById(id);
const rowsEl = $('rows');
const detailEl = $('detail');
const detailCard = $('detail-card');

async function loadData() {
  const [tRes, sRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/stages.json'),
  ]);
  if (!tRes.ok || !sRes.ok) throw new Error('data files missing');
  const tJson = await tRes.json();
  trophies = Array.isArray(tJson) ? tJson : tJson.trophies;
  stagesData = await sRes.json();
}

function renderAll() {
  renderProgress($('progress-count'), $('progress-pct'), $('bar-fill'), $('grade-counts'), state, trophies, trophies.length);
  if (view === 'tracker') {
    const shown = renderList(rowsEl, trophies, state, filters, selectedId, onToggle, openDetail);
    const missables = trophies.filter((t) => t.missable).length;
    $('list-hint').textContent =
      `${shown} of ${trophies.length} trophies shown · ${missables} missable flagged · click a trophy for its cited guide · ✓ marks it earned`;
  } else {
    renderRoadmap($('roadmap'), stagesData, trophies, state, filters, openDetail);
  }
  if (selectedId !== null && !detailEl.hidden) {
    const t = trophies.find((x) => x.id === selectedId);
    if (t) renderDetail(detailCard, t, state, filters, onToggle, closeDetail);
  }
}

function onToggle(id) {
  toggleEarned(state, id);
  renderAll();
}

function openDetail(id) {
  selectedId = id;
  const t = trophies.find((x) => x.id === id);
  if (!t) return;
  renderDetail(detailCard, t, state, filters, onToggle, closeDetail);
  detailEl.hidden = false;
  renderAll();
}

function closeDetail() {
  detailEl.hidden = true;
  selectedId = null;
  renderAll();
}

function setView(next) {
  view = next;
  $('view-tracker').hidden = next !== 'tracker';
  $('view-roadmap').hidden = next !== 'roadmap';
  $('tab-tracker').classList.toggle('active', next === 'tracker');
  $('tab-roadmap').classList.toggle('active', next === 'roadmap');
  $('tab-tracker').setAttribute('aria-selected', String(next === 'tracker'));
  $('tab-roadmap').setAttribute('aria-selected', String(next === 'roadmap'));
  renderAll();
}

function wireControls() {
  $('tab-tracker').addEventListener('click', () => setView('tracker'));
  $('tab-roadmap').addEventListener('click', () => setView('roadmap'));

  $('search').addEventListener('input', (ev) => {
    filters.search = ev.target.value.trim();
    renderAll();
  });

  const gradeSel = $('grade');
  gradeSel.value = filters.grade;
  gradeSel.addEventListener('change', () => {
    filters.grade = gradeSel.value;
    savePrefs(filters);
    renderAll();
  });

  const spoilerBox = $('spoiler');
  spoilerBox.checked = filters.spoiler;
  spoilerBox.addEventListener('change', () => {
    filters.spoiler = spoilerBox.checked;
    savePrefs(filters);
    renderAll();
    toast(filters.spoiler ? 'Spoiler guard ON — story names & descriptions hidden until earned' : 'Spoiler guard OFF');
  });

  for (const chip of document.querySelectorAll('#kind-chips .chip')) {
    chip.classList.toggle('active', chip.dataset.kind === filters.kind);
    chip.addEventListener('click', () => {
      filters.kind = chip.dataset.kind;
      savePrefs(filters);
      for (const c of document.querySelectorAll('#kind-chips .chip')) {
        c.classList.toggle('active', c === chip);
      }
      renderAll();
    });
  }

  $('export').addEventListener('click', () => {
    const n = exportProgress(state, trophies);
    toast(`Exported ${n} earned trophies to gta6-trophy-progress.json`);
  });

  $('import-btn').addEventListener('click', () => $('import').click());
  $('import').addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    const text = await file.text();
    const result = importProgress(text, state, trophies);
    if (result.ok) {
      toast(`Imported ${result.count} earned trophies${result.skipped ? ` (${result.skipped} unknown ids skipped)` : ''}`);
      renderAll();
    } else {
      toast(`Import failed: ${result.error}`);
    }
  });

  $('reset').addEventListener('click', () => {
    if (confirm('Reset all progress? This clears every earned mark.')) {
      resetProgress(state);
      renderAll();
      toast('Progress reset');
    }
  });

  detailEl.addEventListener('click', (ev) => {
    if (ev.target === detailEl) closeDetail();
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !detailEl.hidden) closeDetail();
  });
}

loadData()
  .then(() => {
    wireControls();
    renderAll();
  })
  .catch((err) => {
    rowsEl.textContent = '';
    const li = document.createElement('li');
    li.className = 'hint';
    li.textContent = `Could not load the trophy data files: ${err.message}. Serve the app/ directory with a static server (node serve.ts).`;
    rowsEl.appendChild(li);
  });