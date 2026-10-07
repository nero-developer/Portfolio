import type { Radio, Track } from './audio';
import { create } from './dom';
import { icons } from './icons';

interface PlayerNodes {
  root: HTMLElement;
  cover: HTMLElement;
  title: HTMLElement;
  artist: HTMLElement;
  seek: HTMLInputElement;
  now: HTMLElement;
  total: HTMLElement;
  previous: HTMLButtonElement;
  toggle: HTMLButtonElement;
  next: HTMLButtonElement;
}

const SEEK_STEPS = 1000;
const SWAP_MS = 260;

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function renderCover(node: HTMLElement, track: Track): void {
  const fallback = (): void => {
    node.innerHTML = icons.note;
  };

  if (!track.cover) {
    fallback();
    return;
  }

  const img = create('img');
  img.alt = '';
  img.src = track.cover;
  img.addEventListener('error', fallback);
  node.replaceChildren(img);
}

function bindMediaSession(radio: Radio): void {
  if (!('mediaSession' in navigator)) return;
  const { mediaSession } = navigator;

  const sync = (): void => {
    const track = radio.current();
    mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? '',
      artwork: track.cover ? [{ src: track.cover }] : [],
    });
  };

  radio.events.addEventListener('trackchange', sync);
  sync();

  mediaSession.setActionHandler('play', () => radio.start());
  mediaSession.setActionHandler('pause', () => radio.toggle());
  mediaSession.setActionHandler('previoustrack', () => radio.previous());
  mediaSession.setActionHandler('nexttrack', () => radio.next());
}

export function createPlayerView(radio: Radio, nodes: PlayerNodes): void {
  const { audio, tracks } = radio;

  const renderTrack = (): void => {
    const track = radio.current();
    const position = tracks.indexOf(track) + 1;
    nodes.title.textContent = track.title;
    nodes.artist.textContent = track.artist ?? `Faixa ${position} de ${tracks.length}`;
    renderCover(nodes.cover, track);
    renderTime();
  };

  const renderTime = (): void => {
    const { currentTime, duration } = audio;
    const ready = Number.isFinite(duration) && duration > 0;
    nodes.now.textContent = clock(currentTime);
    nodes.total.textContent = clock(duration);
    nodes.seek.disabled = !ready;
    const ratio = ready ? currentTime / duration : 0;
    nodes.seek.value = String(Math.round(ratio * SEEK_STEPS));
    nodes.seek.style.setProperty('--fill', `${(ratio * 100).toFixed(1)}%`);
  };

  const renderState = (): void => {
    const playing = radio.playing;
    nodes.root.classList.toggle('playing', playing);
    nodes.toggle.dataset.state = playing ? 'playing' : 'paused';
    nodes.toggle.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
  };

  const renderUnavailable = (): void => {
    nodes.root.classList.add('unavailable');
    nodes.title.textContent = 'Música não encontrada';
    nodes.artist.textContent = 'Coloque music-1.mp3 em public/';
    nodes.cover.innerHTML = icons.note;
    [nodes.previous, nodes.toggle, nodes.next, nodes.seek].forEach((node) => {
      node.disabled = true;
    });
  };

  nodes.previous.addEventListener('click', () => radio.previous());
  nodes.next.addEventListener('click', () => radio.next());
  nodes.toggle.addEventListener('click', () => radio.toggle());
  nodes.seek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) radio.seek((Number(nodes.seek.value) / SEEK_STEPS) * audio.duration);
  });

  const single = tracks.length < 2;
  nodes.previous.hidden = single;
  nodes.next.hidden = single;

  let swapTimer: number | undefined;
  radio.events.addEventListener('trackchange', () => {
    nodes.root.classList.add('swapping');
    window.clearTimeout(swapTimer);
    swapTimer = window.setTimeout(() => {
      renderTrack();
      nodes.root.classList.remove('swapping');
    }, SWAP_MS);
  });
  radio.events.addEventListener('timechange', renderTime);
  radio.events.addEventListener('statechange', renderState);
  radio.events.addEventListener('unavailable', renderUnavailable);

  if (!radio.available) {
    renderUnavailable();
    return;
  }

  renderTrack();
  renderState();
  bindMediaSession(radio);
}
