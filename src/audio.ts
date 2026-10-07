import type { PlaylistItem } from './config';

export interface Track extends PlaylistItem {
  src: string;
}

export interface Radio {
  readonly audio: HTMLAudioElement;
  readonly tracks: Track[];
  readonly events: EventTarget;
  readonly available: boolean;
  readonly playing: boolean;
  readonly volume: number;
  readonly muted: boolean;
  current(): Track;
  start(): void;
  toggle(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
  setVolume(value: number): void;
  toggleMute(): void;
}

const MAX_TRACKS = 10;
const DEFAULT_VOLUME = 0.4;
const RESTART_THRESHOLD = 3;
const FADE_IN = 2.5;
const FADE_OUT = 3;
const GAP_MS = 900;
const FADE_TICK_MS = 50;
const STORAGE_KEY = 'portfolio:volume';

function gain(position: number, length: number): number {
  const rise = position / FADE_IN;
  const fall = Number.isFinite(length) && length > 0 ? (length - position) / FADE_OUT : 1;
  const x = Math.min(1, Math.max(0, Math.min(rise, fall)));
  return x * x * (3 - 2 * x);
}

function loadVolume(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
  } catch {
    return null;
  }
}

function saveVolume(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    return;
  }
}

export function createRadio(items: PlaylistItem[]): Radio {
  const tracks: Track[] = items
    .slice(0, MAX_TRACKS)
    .map((item, position) => ({ ...item, src: `/music-${position + 1}.mp3` }));

  const audio = new Audio();
  audio.preload = 'auto';

  const events = new EventTarget();
  const broken = new Set<number>();
  let userVolume = loadVolume() ?? DEFAULT_VOLUME;
  let index = 0;
  let wantsPlay = false;
  let transitioning = false;
  let fadeTimer: number | undefined;
  let gapTimer: number | undefined;

  const emit = (name: string): void => {
    events.dispatchEvent(new Event(name));
  };

  const applyGain = (): void => {
    audio.volume = userVolume * gain(audio.currentTime, audio.duration);
  };

  const startFade = (): void => {
    window.clearInterval(fadeTimer);
    applyGain();
    fadeTimer = window.setInterval(applyGain, FADE_TICK_MS);
  };

  const play = (): void => {
    void audio.play().catch(() => undefined);
  };

  const load = (position: number): void => {
    index = position;
    audio.src = tracks[position].src;
    applyGain();
    emit('trackchange');
    if (wantsPlay) play();
  };

  const step = (direction: 1 | -1): void => {
    for (let offset = 1; offset <= tracks.length; offset += 1) {
      const candidate = (((index + direction * offset) % tracks.length) + tracks.length) % tracks.length;
      if (broken.has(candidate)) continue;
      if (candidate === index) {
        audio.currentTime = 0;
        applyGain();
        if (wantsPlay) play();
      } else {
        load(candidate);
      }
      return;
    }
    emit('unavailable');
  };

  const skip = (direction: 1 | -1): void => {
    window.clearTimeout(gapTimer);
    transitioning = false;
    step(direction);
  };

  audio.addEventListener('play', () => {
    transitioning = false;
    startFade();
    emit('statechange');
  });

  audio.addEventListener('pause', () => {
    window.clearInterval(fadeTimer);
    if (audio.ended && wantsPlay) transitioning = true;
    emit('statechange');
  });

  audio.addEventListener('ended', () => {
    transitioning = true;
    emit('statechange');
    window.clearTimeout(gapTimer);
    gapTimer = window.setTimeout(() => step(1), GAP_MS);
  });

  audio.addEventListener('error', () => {
    broken.add(index);
    step(1);
  });

  audio.addEventListener('timeupdate', () => emit('timechange'));
  audio.addEventListener('loadedmetadata', () => emit('timechange'));

  if (tracks.length > 0) load(0);

  return {
    audio,
    tracks,
    events,
    get available() {
      return tracks.length > 0 && broken.size < tracks.length;
    },
    get playing() {
      return !audio.paused || transitioning;
    },
    get volume() {
      return userVolume;
    },
    get muted() {
      return audio.muted;
    },
    current: () => tracks[index],
    start() {
      wantsPlay = true;
      play();
    },
    toggle() {
      if (transitioning) {
        window.clearTimeout(gapTimer);
        transitioning = false;
        wantsPlay = false;
        emit('statechange');
        return;
      }
      if (audio.paused) {
        wantsPlay = true;
        if (audio.ended) step(1);
        else play();
      } else {
        wantsPlay = false;
        audio.pause();
      }
    },
    next: () => skip(1),
    previous() {
      if (audio.currentTime > RESTART_THRESHOLD) audio.currentTime = 0;
      else skip(-1);
    },
    seek(seconds) {
      audio.currentTime = seconds;
    },
    setVolume(value) {
      userVolume = value;
      audio.muted = false;
      saveVolume(value);
      applyGain();
      emit('volumechange');
    },
    toggleMute() {
      if (userVolume === 0) {
        userVolume = DEFAULT_VOLUME;
        audio.muted = false;
      } else {
        audio.muted = !audio.muted;
      }
      saveVolume(userVolume);
      applyGain();
      emit('volumechange');
    },
  };
}
