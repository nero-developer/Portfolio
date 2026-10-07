import { create } from './dom';
import {
  ACTIVITY_LISTENING,
  activityImage,
  richActivities,
  type Activity,
  type Presence,
} from './lanyard';

interface Entry {
  element: HTMLElement;
  signature: string;
  swap: number;
}

const MAX_ACTIVITIES = 4;
const TICK_INTERVAL = 1000;
const SWAP_OUT_MS = 260;
const SWAP_GAP_MS = 160;
const LEAVE_MS = 380;

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

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

function keyFor(activity: Activity, counts: Map<string, number>): string {
  const base = `${activity.type}:${activity.application_id ?? activity.name}`;
  const seen = counts.get(base) ?? 0;
  counts.set(base, seen + 1);
  return seen ? `${base}#${seen}` : base;
}

function signature(activity: Activity): string {
  const { start, end } = activity.timestamps ?? {};
  return [
    activity.name,
    activity.details ?? '',
    activity.state ?? '',
    activity.assets?.large_image ?? '',
    Boolean(start),
    Boolean(start && end),
  ].join('\u0000');
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

function fill(element: HTMLElement, activity: Activity): void {
  const listening = activity.type === ACTIVITY_LISTENING;
  element.classList.toggle('listening', listening);
  element.replaceChildren(cover(activity), listening ? trackInfo(activity) : gameInfo(activity));
}

function refreshTimes(element: HTMLElement, activity: Activity): void {
  const { start, end } = activity.timestamps ?? {};
  const bar = element.querySelector<HTMLElement>('.progress');
  if (bar && start && end) {
    bar.dataset.start = String(start);
    bar.dataset.end = String(end);
  }
  const clockNode = element.querySelector<HTMLElement>('[data-elapsed]');
  if (clockNode && start) clockNode.dataset.elapsed = String(start);
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
  const entries = new Map<string, Entry>();

  const add = (key: string, activity: Activity): void => {
    const element = create('li', 'activity entering');
    fill(element, activity);
    list.hidden = false;
    list.append(element);
    void element.offsetWidth;
    element.classList.remove('entering');
    entries.set(key, { element, signature: signature(activity), swap: 0 });
  };

  const change = async (entry: Entry, activity: Activity): Promise<void> => {
    entry.swap += 1;
    const current = entry.swap;
    entry.signature = signature(activity);
    entry.element.classList.add('swapping');
    await wait(SWAP_OUT_MS + SWAP_GAP_MS);
    if (entry.swap !== current) return;
    fill(entry.element, activity);
    void entry.element.offsetWidth;
    entry.element.classList.remove('swapping');
    tick(list);
  };

  const sync = (entry: Entry, activity: Activity): void => {
    if (entry.signature === signature(activity)) {
      refreshTimes(entry.element, activity);
      return;
    }
    void change(entry, activity);
  };

  const remove = (key: string, entry: Entry): void => {
    entries.delete(key);
    entry.swap += 1;
    entry.element.style.maxHeight = `${entry.element.offsetHeight}px`;
    void entry.element.offsetWidth;
    entry.element.classList.add('leaving');
    void wait(LEAVE_MS).then(() => {
      entry.element.remove();
      list.hidden = list.children.length === 0;
    });
  };

  const arrange = (keys: string[]): void => {
    const desired = keys.map((key) => (entries.get(key) as Entry).element);
    const current = Array.from(list.children).filter((child) => !child.classList.contains('leaving'));
    if (desired.some((element, position) => element !== current[position])) {
      desired.forEach((element) => list.append(element));
    }
  };

  window.setInterval(() => {
    if (!document.hidden && !list.hidden) tick(list);
  }, TICK_INTERVAL);

  return (presence) => {
    const counts = new Map<string, number>();
    const keys: string[] = [];

    for (const activity of richActivities(presence, MAX_ACTIVITIES)) {
      const key = keyFor(activity, counts);
      keys.push(key);
      const entry = entries.get(key);
      if (entry) sync(entry, activity);
      else add(key, activity);
    }

    for (const [key, entry] of entries) {
      if (!keys.includes(key)) remove(key, entry);
    }

    arrange(keys);
    tick(list);
  };
}
