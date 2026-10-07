import type { PlaylistItem } from './config';

export interface Track extends PlaylistItem {
  src: string;
}

export interface Radio {
  readonly audio: HTMLAudioElement;
  readonly tracks: Track[];
  readonly events: EventTarget;
  readonly available: boolean;
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
const STORAGE_KEY = 'portfolio:volume';

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
  audio.volume = loadVolume() ?? DEFAULT_VOLUME;

  const events = new EventTarget();
  const broken = new Set<number>();
  let index = 0;
  let wantsPlay = false;

  const emit = (name: string): void => {
    events.dispatchEvent(new Event(name));
  };

  const play = (): void => {
    void audio.play().catch(() => undefined);
  };

  const load = (position: number): void => {
    index = position;
    audio.src = tracks[position].src;
    emit('trackchange');
    if (wantsPlay) play();
  };

  const step = (direction: 1 | -1): void => {
    for (let offset = 1; offset <= tracks.length; offset += 1) {
      const candidate = (((index + direction * offset) % tracks.length) + tracks.length) % tracks.length;
      if (broken.has(candidate)) continue;
      if (candidate === index) {
        audio.currentTime = 0;
        if (wantsPlay) play();
      } else {
        load(candidate);
      }
      return;
    }
    emit('unavailable');
  };

  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('error', () => {
    broken.add(index);
    step(1);
  });
  audio.addEventListener('play', () => emit('statechange'));
  audio.addEventListener('pause', () => emit('statechange'));
  audio.addEventListener('timeupdate', () => emit('timechange'));
  audio.addEventListener('loadedmetadata', () => emit('timechange'));
  audio.addEventListener('volumechange', () => emit('volumechange'));

  if (tracks.length > 0) load(0);

  return {
    audio,
    tracks,
    events,
    get available() {
      return tracks.length > 0 && broken.size < tracks.length;
    },
    current: () => tracks[index],
    start() {
      wantsPlay = true;
      play();
    },
    toggle() {
      if (audio.paused) {
        wantsPlay = true;
        play();
      } else {
        wantsPlay = false;
        audio.pause();
      }
    },
    next: () => step(1),
    previous() {
      if (audio.currentTime > RESTART_THRESHOLD) audio.currentTime = 0;
      else step(-1);
    },
    seek(seconds) {
      audio.currentTime = seconds;
    },
    setVolume(value) {
      audio.volume = value;
      audio.muted = false;
      saveVolume(value);
    },
    toggleMute() {
      if (audio.volume === 0) {
        audio.volume = DEFAULT_VOLUME;
        audio.muted = false;
      } else {
        audio.muted = !audio.muted;
      }
      saveVolume(audio.volume);
    },
  };
}
