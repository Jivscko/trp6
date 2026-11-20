// ui.js — tracker list, filters, spoiler guard, and the per-trophy detail panel.
import { isEarned } from './store.js';

const GRADE_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
const KIND_LABEL = { story: 'Story', collectible: 'Collectible', activity: 'Activity', online: 'Online' };

export function matchesFilters(t, filters, state) {
  if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
  if (filters.kind === 'missable') {
    if (!t.missable) return false;
  } else if (filters.kind !== 'all' && t.kind !== filters.kind) {
    return false;
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const hiddenBySpoiler = filters.spoiler && t.kind === 'story' && !isEarned(state, t.id);
    const name = hiddenBySpoiler ? '' : t.name.toLowerCase();
    const desc = hiddenBySpoiler ? '' : t.description.toLowerCase();
    if (!name.includes(q) && !desc.includes(q)) return false;
  }
  return true;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function medal(grade) {
  return el('div', `medal ${grade}`, GRADE_LETTER[grade] ?? '?');
}

function tagPills(t) {
  const wrap = el('div', 't-tags');
  wrap.appendChild(el('span', `tagpill kind-${t.kind}`, KIND_LABEL[t.kind] ?? t.kind));
  if (t.missable) wrap.appendChild(el('span', 'tagpill missable', '⚠ missable'));
  if (t.hidden) wrap.appendChild(el('span', 'tagpill hidden-t', 'hidden'));
  wrap.appendChild(el('span', 'tagpill stage', `stage ${t.stage}`));
  if (t.count) wrap.appendChild(el('span', 'tagpill', `×${t.count.toLocaleString('en-US')}`));
  return wrap;
}

export function renderList(container, trophies, state, filters, selectedId, onToggle, onOpen) {
  container.textContent = '';
  const visible = trophies.filter((t) => matchesFilters(t, filters, state));
  for (const t of visible) {
    const earned = isEarned(state, t.id);
    const spoiled = filters.spoiler && t.kind === 'story' && !earned;
    const row = el('li', `row${earned ? ' earned' : ''}${spoiled ? ' spoiled' : ''}${t.id === selectedId ? ' selected' : ''}`);
    row.dataset.id = String(t.id);

    const check = el('button', 'check', earned ? '✓' : '');
    check.type = 'button';
    check.title = earned ? 'Mark as not earned' : 'Mark as earned';
    check.setAttribute('aria-label', `${earned ? 'Unmark' : 'Mark'} ${spoiled ? 'hidden story trophy' : t.name}`);
    check.addEventListener('click', (ev) => {
      ev.stopPropagation();
      onToggle(t.id);
    });
    row.appendChild(check);
    row.appendChild(medal(t.grade));

    const main = el('div', 't-main');
    if (spoiled) {
      main.appendChild(el('div', 't-name', 'Hidden story trophy'));
      main.appendChild(el('div', 'spoiler-note', 'Spoiler guard on — name & description hidden until earned'));
    } else {
      main.appendChild(el('div', 't-name', t.name));
      main.appendChild(el('div', 't-desc', t.description));
    }
    row.appendChild(main);
    row.appendChild(tagPills(t));
    row.addEventListener('click', () => onOpen(t.id));
    container.appendChild(row);
  }
  return visible.length;
}

export function renderDetail(card, t, state, filters, onToggle, onClose) {
  card.textContent = '';
  const earned = isEarned(state, t.id);
  const spoiled = filters.spoiler && t.kind === 'story' && !earned;

  const head = el('div', 'd-head');
  head.appendChild(medal(t.grade));
  const titleWrap = el('div');
  titleWrap.appendChild(el('h2', 'd-title', spoiled ? 'Hidden story trophy' : t.name));
  titleWrap.appendChild(el('div', 'd-grade', `${t.grade} · ${KIND_LABEL[t.kind] ?? t.kind}${t.hidden ? ' · hidden on PlayStation' : ''}`));
  head.appendChild(titleWrap);
  const close = el('button', 'd-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close detail');
  close.addEventListener('click', onClose);
  head.appendChild(close);
  card.appendChild(head);

  if (spoiled) {
    const box = el('div', 'd-spoiler');
    box.appendChild(el('p', undefined, '🔒 Spoiler guard is on.'));
    box.appendChild(el('p', undefined, 'The name, description and guide of this story trophy stay hidden until you mark it earned. Use the toggle below once you have it.'));
    card.appendChild(box);
  } else {
    const desc = el('div', 'd-desc');
    desc.appendChild(el('span', 'lbl', 'Official description'));
    desc.appendChild(document.createTextNode(t.description));
    card.appendChild(desc);

    if (t.missable) {
      card.appendChild(el('div', 'd-warn', `⚠ MISSABLE — ${t.missable_note ?? 'One-time content: earn it before the story point of no return.'}`));
    }

    const meta = el('div', 'd-meta');
    meta.appendChild(el('span', `tagpill kind-${t.kind}`, KIND_LABEL[t.kind] ?? t.kind));
    meta.appendChild(el('span', 'tagpill stage', `Roadmap stage ${t.stage}`));
    if (t.hidden) meta.appendChild(el('span', 'tagpill hidden-t', 'hidden trophy'));
    if (t.count) meta.appendChild(el('span', 'tagpill', `Target: ${t.count.toLocaleString('en-US')}`));
    card.appendChild(meta);

    const { body, sources } = splitGuide(t.guide);
    const guide = el('div', 'd-guide');
    guide.appendChild(el('span', 'lbl', 'Guide (own words, derived from the official description)'));
    guide.appendChild(document.createTextNode(body));
    card.appendChild(guide);
    if (sources) {
      const src = el('div', 'd-src');
      src.appendChild(el('span', 'lbl', 'Sources'));
      src.appendChild(document.createTextNode(sources));
      card.appendChild(src);
    }
  }

  const btn = el('button', `d-earn${earned ? ' on' : ''}`, earned ? '✓ Earned — click to unmark' : 'Mark as earned');
  btn.type = 'button';
  btn.addEventListener('click', () => onToggle(t.id));
  card.appendChild(btn);
}

// Guides end with a "Sources:" sentence; show it as its own cited block.
export function splitGuide(guide) {
  const idx = guide.indexOf('Sources:');
  if (idx === -1) return { body: guide, sources: '' };
  return { body: guide.slice(0, idx).trim(), sources: guide.slice(idx + 'Sources:'.length).trim() };
}

export function renderProgress(countEl, pctEl, barEl, gradeEl, state, trophies, total) {
  const earned = Object.keys(state.earned).filter((id) => trophies.some((t) => String(t.id) === id)).length;
  countEl.textContent = `${earned} / ${total} earned`;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  pctEl.textContent = `${pct}%`;
  barEl.style.width = `${pct}%`;
  gradeEl.textContent = '';
  const counts = {};
  for (const t of trophies) {
    counts[t.grade] ??= { earned: 0, total: 0 };
    counts[t.grade].total += 1;
    if (isEarned(state, t.id)) counts[t.grade].earned += 1;
  }
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const c = counts[g];
    if (!c) continue;
    const span = el('span', `gc-${g}`);
    const b = el('b', undefined, `${c.earned}/${c.total}`);
    span.appendChild(b);
    span.appendChild(document.createTextNode(` ${g}`));
    gradeEl.appendChild(span);
  }
}

export function toast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const node = el('div', 'toast', msg);
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2600);
}