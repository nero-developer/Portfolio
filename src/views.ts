export type PageView = 'projects' | 'more';
type View = 'home' | PageView;

interface Hooks {
  open(page: PageView): void;
  close(page: PageView): void;
  cover(covered: boolean): void;
}

interface ViewNodes {
  stage: HTMLElement;
  locked: HTMLElement[];
  pages: Record<PageView, HTMLElement>;
  pulls: Record<PageView, HTMLButtonElement>;
  hooks: Hooks;
}

interface Gesture {
  view: PageView;
  axis: 'x' | 'y';
  commitAt: number;
  distance(): number;
  render(progress: number): void;
  reset(): void;
}

const SHIFT_START = 0.3;
const BLUR_START = 0.6;
const RISE_START = 0.1;
const BOOK_BLUR_START = 0.5;
const PARALLAX = 0.28;
const DRAG_TAP = 4;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (t: number): number => t * t * (3 - 2 * t);
const easeOut = (t: number): number => 1 - (1 - t) ** 5;
const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

let tweenId = 0;

function tween(
  from: number,
  to: number,
  duration: number,
  ease: (t: number) => number,
  onFrame: (value: number) => void,
): Promise<void> {
  tweenId += 1;
  const id = tweenId;
  if (reducedMotion || duration <= 0) {
    onFrame(to);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startedAt = performance.now();
    const frame = (now: number): void => {
      if (id !== tweenId) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - startedAt) / duration);
      onFrame(from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function maxBlur(): number {
  if (coarse) return 0;
  return document.documentElement.dataset.tier === 'lite' ? 8 : 14;
}

export function createViews(nodes: ViewNodes): void {
  const { stage, pages, pulls, hooks } = nodes;
  let view: View = 'home';
  let busy = false;

  const entered = (): boolean => document.body.classList.contains('entered');

  const setStage = (x: number, y: number, scale: number, blur: number, dim: number): void => {
    stage.style.transform = x || y || scale !== 1 ? `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})` : '';
    stage.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : '';
    stage.style.opacity = dim > 0.001 ? (1 - dim).toFixed(3) : '';
  };

  const clearStage = (): void => {
    stage.style.transform = '';
    stage.style.filter = '';
    stage.style.opacity = '';
    stage.style.willChange = '';
  };

  const setText = (page: HTMLElement, amount: number): void => {
    const text = page.querySelector<HTMLElement>('p');
    if (!text) return;
    text.style.opacity = amount.toFixed(3);
    text.style.transform = `translateY(${((1 - amount) * 14).toFixed(1)}px)`;
  };

  const lock = (locked: boolean): void => {
    nodes.locked.forEach((node) => {
      node.inert = locked;
    });
  };

  const gestures: Record<PageView, Gesture> = {
    projects: {
      view: 'projects',
      axis: 'x',
      commitAt: 0.6,
      distance: () => Math.min(560, Math.max(240, window.innerWidth * 0.5)),
      render(progress) {
        const slide = smooth(clamp((progress - SHIFT_START) / (1 - SHIFT_START)));
        const blur = smooth(clamp((progress - BLUR_START) / (1 - BLUR_START)));
        const page = pages.projects;
        page.style.transform = `translate3d(${((1 - slide) * 100).toFixed(2)}%, 0, 0)`;
        page.style.boxShadow = `-40px 0 80px rgba(20, 22, 30, ${(0.3 * (1 - slide)).toFixed(3)})`;
        setText(page, clamp((slide - 0.55) / 0.45));
        setStage(-slide * window.innerWidth * PARALLAX, 0, 1 - 0.05 * slide, blur * maxBlur(), 0.4 * slide);
        pulls.projects.style.translate = progress ? `${(-progress * this.distance()).toFixed(1)}px 0` : '';
        pulls.projects.style.scale = progress ? (0.85 + progress * 0.5).toFixed(3) : '';
      },
      reset() {
        const page = pages.projects;
        page.hidden = true;
        page.style.transform = '';
        page.style.boxShadow = '';
        resetText(page);
        pulls.projects.style.translate = '';
        pulls.projects.style.scale = '';
      },
    },
    more: {
      view: 'more',
      axis: 'y',
      commitAt: 0.45,
      distance: () => Math.min(520, Math.max(220, window.innerHeight * 0.5)),
      render(progress) {
        const rise = smooth(clamp((progress - RISE_START) / (1 - RISE_START)));
        const blur = smooth(clamp((progress - BOOK_BLUR_START) / (1 - BOOK_BLUR_START)));
        const rest = 1 - rise;
        const page = pages.more;
        page.style.transform = `perspective(1400px) translate3d(0, ${(rest * 100).toFixed(2)}%, 0) rotateX(${(rest * 10).toFixed(2)}deg)`;
        page.style.borderRadius = `${(rest * 80).toFixed(1)}px ${(rest * 80).toFixed(1)}px 0 0`;
        page.style.boxShadow = `0 -24px 70px rgba(20, 22, 30, ${(rest * 0.4).toFixed(3)})`;
        setText(page, clamp((rise - 0.55) / 0.45));
        setStage(0, -rise * window.innerHeight * 0.07, 1 - 0.04 * rise, blur * maxBlur(), 0.35 * rise);
        pulls.more.style.translate = progress ? `0 ${(-progress * this.distance()).toFixed(1)}px` : '';
        pulls.more.style.scale = progress ? (0.85 + progress * 0.5).toFixed(3) : '';
      },
      reset() {
        const page = pages.more;
        page.hidden = true;
        page.style.transform = '';
        page.style.borderRadius = '';
        page.style.boxShadow = '';
        resetText(page);
        pulls.more.style.translate = '';
        pulls.more.style.scale = '';
      },
    },
  };

  function resetText(page: HTMLElement): void {
    const text = page.querySelector<HTMLElement>('p');
    if (text) {
      text.style.opacity = '';
      text.style.transform = '';
    }
  }

  const begin = (gesture: Gesture): void => {
    stage.style.willChange = 'transform, filter, opacity';
    pages[gesture.view].hidden = false;
    hooks.open(gesture.view);
  };

  const finish = (gesture: Gesture): void => {
    gesture.reset();
    clearStage();
    hooks.close(gesture.view);
  };

  const open = async (gesture: Gesture, from: number): Promise<void> => {
    busy = true;
    await tween(from, 1, 420 + 560 * (1 - from), easeOut, (value) => gesture.render(value));
    view = gesture.view;
    lock(true);
    hooks.cover(true);
    pages[gesture.view].querySelector<HTMLElement>('[data-back]')?.focus({ preventScroll: true });
    busy = false;
  };

  const settle = async (gesture: Gesture, from: number): Promise<void> => {
    busy = true;
    await tween(from, 0, 200 + 420 * from, easeOut, (value) => gesture.render(value));
    finish(gesture);
    busy = false;
  };

  const close = async (gesture: Gesture): Promise<void> => {
    busy = true;
    lock(false);
    hooks.cover(false);
    await tween(1, 0, 760, easeInOut, (value) => gesture.render(value));
    finish(gesture);
    view = 'home';
    busy = false;
  };

  const goBack = (): void => {
    if (!busy && view !== 'home') void close(gestures[view]);
  };

  const bind = (gesture: Gesture): void => {
    const handle = pulls[gesture.view];
    let dragging = false;
    let moved = false;
    let origin = 0;
    let progress = 0;

    const coordinate = (event: PointerEvent): number => (gesture.axis === 'x' ? event.clientX : event.clientY);

    handle.addEventListener('pointerdown', (event) => {
      if (busy || view !== 'home' || !entered()) return;
      dragging = true;
      moved = false;
      progress = 0;
      origin = coordinate(event);
      handle.setPointerCapture(event.pointerId);
      handle.classList.add('dragging');
      begin(gesture);
    });

    handle.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const delta = Math.max(0, origin - coordinate(event));
      if (delta > DRAG_TAP) moved = true;
      progress = clamp(delta / gesture.distance());
      gesture.render(progress);
      if (progress >= 1) {
        dragging = false;
        handle.classList.remove('dragging');
        void open(gesture, 1);
      }
    });

    const release = (): void => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      if (!moved) void open(gesture, 0);
      else if (progress >= gesture.commitAt) void open(gesture, progress);
      else void settle(gesture, progress);
    };

    handle.addEventListener('pointerup', release);
    handle.addEventListener('pointercancel', release);
    handle.addEventListener('click', (event) => {
      if (event.detail !== 0 || busy || view !== 'home' || !entered()) return;
      begin(gesture);
      void open(gesture, 0);
    });
  };

  bind(gestures.projects);
  bind(gestures.more);

  document.querySelectorAll<HTMLElement>('[data-back]').forEach((button) => {
    button.addEventListener('click', goBack);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') goBack();
  });
}
