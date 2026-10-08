import type { WallpaperSet } from './config';

export type Prefer = 'video' | 'image';
type Media = HTMLImageElement | HTMLVideoElement;

export interface Backdrop {
  show(): void;
  hide(release?: boolean): void;
  preload(): void;
}

const VIDEO_EXTENSIONS = ['mp4', 'webm'];
const IMAGE_EXTENSIONS = ['webp', 'jpg', 'jpeg', 'png'];
const VIDEO_TIMEOUT_MS = 10000;
const PHONE_QUERY = '(max-width: 760px)';

const isVideo = (extension: string): boolean => VIDEO_EXTENSIONS.includes(extension);

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.alt = '';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(url));
    image.src = url;
  });
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const timer = window.setTimeout(() => reject(new Error(url)), VIDEO_TIMEOUT_MS);
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.onloadeddata = () => {
      window.clearTimeout(timer);
      resolve(video);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(url));
    };
    video.src = url;
  });
}

async function resolveMedia(set: WallpaperSet, prefer: Prefer): Promise<Media | null> {
  const phone = window.matchMedia(PHONE_QUERY).matches;
  const bases = phone && set.phone ? [set.phone, set.desktop] : [set.desktop];
  const extensions =
    prefer === 'video' ? [...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS] : [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];

  for (const base of bases) {
    for (const extension of extensions) {
      try {
        const url = `${base}.${extension}`;
        return await (isVideo(extension) ? loadVideo(url) : loadImage(url));
      } catch {
        continue;
      }
    }
  }
  return null;
}

export function createBackdrop(root: HTMLElement, set: WallpaperSet, prefer: Prefer): Backdrop {
  let media: Media | null = null;
  let loading = false;
  let visible = false;

  const apply = (): void => {
    if (!(media instanceof HTMLVideoElement)) return;
    if (visible && !document.hidden) void media.play().catch(() => undefined);
    else media.pause();
  };

  const load = async (): Promise<void> => {
    if (media || loading) return;
    loading = true;
    const found = await resolveMedia(set, prefer);
    loading = false;
    if (!found) return;
    media = found;
    media.className = 'wp-media';
    root.prepend(media);
    root.classList.add('has-media');
    requestAnimationFrame(() => media?.classList.add('ready'));
    apply();
  };

  document.addEventListener('visibilitychange', apply);

  return {
    preload() {
      void load();
    },
    show() {
      visible = true;
      if (media) apply();
      else void load();
    },
    hide(release = false) {
      visible = false;
      apply();
      if (release && media instanceof HTMLVideoElement) {
        media.remove();
        media = null;
        root.classList.remove('has-media');
      }
    },
  };
}
