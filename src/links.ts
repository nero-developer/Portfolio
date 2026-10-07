import { config } from './config';
import { create } from './dom';
import { icons } from './icons';

export function renderLinks(list: HTMLElement): void {
  for (const link of config.links) {
    const anchor = create('a');
    anchor.href = link.href;
    anchor.title = link.label;
    anchor.setAttribute('aria-label', link.label);
    anchor.innerHTML = icons[link.id];
    if (!link.href.startsWith('mailto:')) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }

    const item = create('li');
    item.append(anchor);
    list.append(item);
  }
}

export function renderStack(list: HTMLElement): void {
  for (const tech of config.stack) {
    const glyph = create('i', tech.icon);
    glyph.setAttribute('aria-hidden', 'true');

    const item = create('li');
    item.dataset.label = tech.label;
    item.setAttribute('role', 'img');
    item.setAttribute('aria-label', tech.label);
    item.append(glyph);
    list.append(item);
  }
}
