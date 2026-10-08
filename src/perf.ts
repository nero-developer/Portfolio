export type Tier = 'full' | 'lite';

type Listener = (tier: Tier) => void;

interface NetworkInfo {
  saveData?: boolean;
}

const SAMPLE_FRAMES = 90;
const SAMPLE_ROUNDS = 4;
const SAMPLE_DELAY = 1500;
const SLOW_FRAME_MS = 50;
const SLOW_RATIO = 0.3;

const listeners = new Set<Listener>();
let current: Tier = 'full';
let locked = false;

function apply(tier: Tier): void {
  current = tier;
  document.documentElement.dataset.tier = tier;
}

function isWeakDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: NetworkInfo };
  const cores = navigator.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const saveData = nav.connection?.saveData === true;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const lowData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
  return cores <= 2 || memory <= 2 || saveData || touch || lowData;
}

export function getTier(): Tier {
  return current;
}

export function onTierChange(listener: Listener): void {
  listeners.add(listener);
}

export function initTier(): void {
  const forced = new URLSearchParams(window.location.search).get('tier');
  if (forced === 'lite' || forced === 'full') {
    locked = true;
    apply(forced);
    return;
  }
  apply(isWeakDevice() ? 'lite' : 'full');
}

function downgrade(): void {
  if (current === 'lite') return;
  apply('lite');
  listeners.forEach((listener) => listener('lite'));
}

export function monitorFrames(): void {
  if (locked || current === 'lite') return;

  window.setTimeout(() => {
    let last = 0;
    let frames = 0;
    let slow = 0;
    let rounds = 0;

    const step = (now: number): void => {
      if (current === 'lite') return;
      if (last) {
        frames += 1;
        if (now - last > SLOW_FRAME_MS) slow += 1;
      }
      last = now;

      if (frames === SAMPLE_FRAMES) {
        if (slow / frames > SLOW_RATIO) {
          downgrade();
          return;
        }
        rounds += 1;
        if (rounds === SAMPLE_ROUNDS) return;
        frames = 0;
        slow = 0;
      }
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, SAMPLE_DELAY);
}
