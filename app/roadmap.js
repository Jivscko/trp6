// roadmap.js — the platinum roadmap: ordered stages built from the official descriptions,
// every missable called out before the point of no return (the final mission, stage 4).
import { isEarned } from './store.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderRoadmap(container, stagesData, trophies, state, filters, onOpen) {
  container.textContent = '';

  const intro = el('div', 'roadmap-intro');
  intro.appendChild(el('b', undefined, 'Point of no return: '));
  intro.appendChild(document.createTextNode(stagesData.point_of_no_return));
  container.appendChild(intro);

  for (const stage of stagesData.stages) {
    const members = trophies.filter((t) => t.stage === stage.stage);
    const earnedHere = members.filter((t) => isEarned(state, t.id)).length;
    const allDone = members.length > 0 && earnedHere === members.length;

    const box = el('section', `stage${allDone ? ' done' : ''}`);
    const head = el('div', 'stage-head');
    head.appendChild(el('div', 'stage-num', String(stage.stage)));
    head.appendChild(el('h2', 'stage-title', stage.title));
    head.appendChild(el('div', 'stage-count', `${earnedHere}/${members.length} earned`));
    box.appendChild(head);

    const body = el('div', 'stage-body');
    body.appendChild(el('p', 'stage-summary', stage.summary));
    if (stage.warning) {
      const warn = el('div', `stage-warning${stage.stage === 4 ? ' ponr' : ''}`, `⚠ ${stage.warning}`);
      body.appendChild(warn);
    }

    const chips = el('div', 'stage-trophies');
    for (const t of members) {
      const earned = isEarned(state, t.id);
      const spoiled = filters.spoiler && t.kind === 'story' && !earned;
      const chip = el('button', `rt${earned ? ' earned' : ''}${t.missable ? ' missable' : ''}`);
      chip.type = 'button';
      chip.appendChild(el('span', `dot ${t.grade}`));
      chip.appendChild(el('span', 'rt-name', spoiled ? 'Hidden story trophy' : t.name));
      if (t.missable) chip.appendChild(el('span', 'warn', '⚠'));
      chip.title = spoiled ? 'Spoiler guard on — earn to reveal' : `${t.grade} · ${t.missable ? 'MISSABLE — ' : ''}click for guide`;
      chip.addEventListener('click', () => onOpen(t.id));
      chips.appendChild(chip);
    }
    body.appendChild(chips);
    box.appendChild(body);
    container.appendChild(box);
  }
}