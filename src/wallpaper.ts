import { config } from './config';

export interface Wallpaper {
  play(): void;
}

export function createWallpaper(root: HTMLElement): Wallpaper {
  let video: HTMLVideoElement | null = null;

  const unmount = (): void => {
    video?.remove();
    video = null;
    root.classList.remove('has-video');
  };

  const mount = (src: string): void => {
    const element = document.createElement('video');
    element.className = 'wp-video';
    element.muted = true;
    element.loop = true;
    element.playsInline = true;
    element.preload = 'auto';
    element.disablePictureInPicture = true;
    element.addEventListener(
      'playing',
      () => {
        element.classList.add('ready');
        root.classList.add('has-video');
      },
      { once: true },
    );
    element.addEventListener('error', unmount);
    element.src = src;
    root.prepend(element);
    video = element;
    void element.play().catch(unmount);
  };

  document.addEventListener('visibilitychange', () => {
    if (!video) return;
    if (document.hidden) video.pause();
    else void video.play().catch(() => undefined);
  });

  return {
    play() {
      if (video || !config.wallpaper) return;
      mount(config.wallpaper);
    },
  };
}
