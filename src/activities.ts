import { create } from './dom';
import {
  ACTIVITY_LISTENING,
  activityImage,
  richActivities,
  type Activity,
  type Presence,
} from './lanyard';

const MAX_ACTIVITIES = 4;
const TICK_INTERVAL = 1000;

function elapsed(start: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
  if (minutes < 1) return 'há menos de 1 min';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `há ${hours}h ${rest}min` : `há ${rest}min`;
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function cover(activity: Activity): HTMLElement {
  const art = create('div', 'art');
  const initial = (): void => art.replaceChildren(activity.name.trim().charAt(0).toUpperCase());
  const src = activityImage(activity);

  if (!src) {
    initial();
    return art;
  }

  const img = create('img');
  img.alt = '';
  img.src = src;
  img.addEventListener('error', initial);
  art.append(img);
  return art;
}

function progress(start: number, end: number): HTMLElement {
  const wrap = create('div', 'progress');
  wrap.dataset.start = String(start);
  wrap.dataset.end = String(end);
  wrap.append(create('div', 'bar'), create('div', 'line times'));
  return wrap;
}

function trackInfo(activity: Activity): HTMLElement {
  const info = create('div', 'info');
  info.append(create('div', 'name', activity.details || activity.name));
  if (activity.state) info.append(create('div', 'line', activity.state));
  info.append(create('div', 'line source', activity.name));

  const { start, end } = activity.timestamps ?? {};
  if (start && end) info.append(progress(start, end));
  return info;
}

function gameInfo(activity: Activity): HTMLElement {
  const info = create('div', 'info');
  info.append(create('div', 'name', activity.name));
  if (activity.details) info.append(create('div', 'line', activity.details));
  if (activity.state) info.append(create('div', 'line', activity.state));

  const start = activity.timestamps?.start;
  if (start) {
    const time = create('div', 'line', elapsed(start));
    time.dataset.elapsed = String(start);
    info.append(time);
  }
  return info;
}

function card(activity: Activity): HTMLElement {
  const listening = activity.type === ACTIVITY_LISTENING;
  const item = create('li', listening ? 'activity listening' : 'activity');
  item.append(cover(activity), listening ? trackInfo(activity) : gameInfo(activity));
  return item;
}

function tick(list: HTMLElement): void {
  const now = Date.now();

  list.querySelectorAll<HTMLElement>('[data-elapsed]').forEach((node) => {
    node.textContent = elapsed(Number(node.dataset.elapsed));
  });

  list.querySelectorAll<HTMLElement>('.progress').forEach((node) => {
    const start = Number(node.dataset.start);
    const end = Number(node.dataset.end);
    const length = end - start;
    const position = Math.min(Math.max(now - start, 0), length);
    const bar = node.firstElementChild as HTMLElement;
    const times = node.lastElementChild as HTMLElement;
    bar.style.setProperty('--progress', `${((position / length) * 100).toFixed(1)}%`);
    times.textContent = `${clock(position)} / ${clock(length)}`;
  });
}

export function createActivitiesView(list: HTMLElement): (presence: Presence) => void {
  window.setInterval(() => {
    if (!document.hidden && !list.hidden) tick(list);
  }, TICK_INTERVAL);

  return (presence) => {
    const items = richActivities(presence, MAX_ACTIVITIES);
    list.replaceChildren(...items.map(card));
    list.hidden = items.length === 0;
    tick(list);
  };
}
