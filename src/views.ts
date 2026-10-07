type View = 'home' | 'projects' | 'more';

interface ViewNodes {
  locked: HTMLElement[];
  shifting: HTMLElement[];
  veil: HTMLElement;
  projects: HTMLElement;
  more: HTMLElement;
  pull: HTMLButtonElement;
}

const SHIFT_START = 0.3;
const BLUR_START = 0.6;
const COMMIT_AT = 0.6;
const MAX_BLUR = 14;
const PARALLAX = 0.3;
const WHEEL_THRESHOLD = 20;
const SWIPE_DISTANCE = 80;
const DRAG_TAP = 4;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const easeOut = (t: number): number => 1 - (1 - t) ** 3;
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

export function createViews(nodes: ViewNodes): void {
  let view: View = 'home';
  let busy = false;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let pulled = 0;
  let touchStartY = 0;

  const dragDistance = (): number => Math.min(560, Math.max(240, window.innerWidth * 0.5));
  const entered = (): boolean => document.body.classList.contains('entered');
  const atBottom = (): boolean =>
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

  const setShift = (x: number, y: number): void => {
    const value = x || y ? `${x.toFixed(1)}px ${y.toFixed(1)}px` : '';
    nodes.shifting.forEach((node) => {
      node.style.translate = value;
    });
  };

  const setVeil = (blur: number, alpha: number): void => {
    nodes.veil.hidden = blur === 0 && alpha === 0;
    nodes.veil.style.setProperty('--veil-blur', `${blur.toFixed(1)}px`);
    nodes.veil.style.setProperty('--veil-alpha', alpha.toFixed(3));
  };

  const lock = (locked: boolean): void => {
    nodes.locked.forEach((node) => {
      node.inert = locked;
    });
  };

  const renderPull = (progress: number): void => {
    const slide = clamp((progress - SHIFT_START) / (1 - SHIFT_START));
    const blur = clamp((progress - BLUR_START) / (1 - BLUR_START));
    nodes.projects.style.transform = `translate3d(${((1 - slide) * 100).toFixed(2)}%, 0, 0)`;
    setShift(-slide * window.innerWidth * PARALLAX, 0);
    setVeil(blur * MAX_BLUR, blur * 0.6);
    nodes.pull.style.translate = progress ? `${(-progress * dragDistance()).toFixed(1)}px 0` : '';
    nodes.pull.style.scale = progress ? String((0.85 + progress * 0.5).toFixed(3)) : '';
  };

  const renderBook = (progress: number): void => {
    const rest = 1 - progress;
    nodes.more.style.transform = `perspective(1400px) translate3d(0, ${(rest * 100).toFixed(2)}%, 0) rotateX(${(rest * 12).toFixed(2)}deg)`;
    nodes.more.style.borderRadius = `${(rest * 90).toFixed(1)}px ${(rest * 90).toFixed(1)}px 0 0`;
    nodes.more.style.boxShadow = `0 -24px 70px rgba(20, 22, 30, ${(rest * 0.4).toFixed(3)})`;
    setShift(0, -progress * window.innerHeight * 0.08);
    setVeil(progress * 4, progress * 0.5);
  };

  const resetPull = (): void => {
    nodes.projects.hidden = true;
    nodes.projects.style.transform = '';
    nodes.pull.style.translate = '';
    nodes.pull.style.scale = '';
    setShift(0, 0);
    setVeil(0, 0);
  };

  const resetBook = (): void => {
    nodes.more.hidden = true;
    nodes.more.style.transform = '';
    nodes.more.style.borderRadius = '';
    nodes.more.style.boxShadow = '';
    setShift(0, 0);
    setVeil(0, 0);
  };

  const focusBack = (page: HTMLElement): void => {
    page.querySelector<HTMLElement>('[data-back]')?.focus({ preventScroll: true });
  };

  const openProjects = async (from: number): Promise<void> => {
    busy = true;
    nodes.projects.hidden = false;
    await tween(from, 1, 200 + 420 * (1 - from), easeOut, renderPull);
    view = 'projects';
    lock(true);
    focusBack(nodes.projects);
    busy = false;
  };

  const settlePull = async (from: number): Promise<void> => {
    busy = true;
    await tween(from, 0, 150 + 300 * from, easeOut, renderPull);
    resetPull();
    busy = false;
  };

  const closeProjects = async (): Promise<void> => {
    busy = true;
    lock(false);
    await tween(1, 0, 620, easeInOut, renderPull);
    resetPull();
    view = 'home';
    busy = false;
  };

  const openMore = async (): Promise<void> => {
    busy = true;
    nodes.more.hidden = false;
    renderBook(0);
    await tween(0, 1, 950, easeInOut, renderBook);
    view = 'more';
    lock(true);
    focusBack(nodes.more);
    busy = false;
  };

  const closeMore = async (): Promise<void> => {
    busy = true;
    lock(false);
    await tween(1, 0, 800, easeInOut, renderBook);
    resetBook();
    view = 'home';
    busy = false;
  };

  const goBack = (): void => {
    if (busy) return;
    if (view === 'projects') void closeProjects();
    else if (view === 'more') void closeMore();
  };

  nodes.pull.addEventListener('pointerdown', (event) => {
    if (busy || view !== 'home' || !entered()) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    pulled = 0;
    nodes.pull.setPointerCapture(event.pointerId);
    nodes.pull.classList.add('dragging');
    nodes.projects.hidden = false;
  });

  nodes.pull.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const distance = Math.max(0, startX - event.clientX);
    if (distance > DRAG_TAP) moved = true;
    pulled = clamp(distance / dragDistance());
    renderPull(pulled);
    if (pulled >= 1) {
      dragging = false;
      nodes.pull.classList.remove('dragging');
      void openProjects(1);
    }
  });

  const release = (): void => {
    if (!dragging) return;
    dragging = false;
    nodes.pull.classList.remove('dragging');
    if (!moved) void openProjects(0);
    else if (pulled >= COMMIT_AT) void openProjects(pulled);
    else void settlePull(pulled);
  };

  nodes.pull.addEventListener('pointerup', release);
  nodes.pull.addEventListener('pointercancel', release);
  nodes.pull.addEventListener('click', (event) => {
    if (event.detail === 0 && !busy && view === 'home' && entered()) void openProjects(0);
  });

  document.querySelectorAll<HTMLElement>('[data-back]').forEach((button) => {
    button.addEventListener('click', goBack);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') goBack();
  });

  window.addEventListener(
    'wheel',
    (event) => {
      if (busy || !entered()) return;
      if (view === 'home' && event.deltaY > WHEEL_THRESHOLD && atBottom()) void openMore();
      else if (view === 'more' && event.deltaY < -WHEEL_THRESHOLD) void closeMore();
    },
    { passive: true },
  );

  window.addEventListener(
    'touchstart',
    (event) => {
      touchStartY = event.touches[0].clientY;
    },
    { passive: true },
  );

  window.addEventListener(
    'touchend',
    (event) => {
      if (busy || !entered()) return;
      const delta = touchStartY - event.changedTouches[0].clientY;
      if (view === 'home' && delta > SWIPE_DISTANCE && atBottom()) void openMore();
      else if (view === 'more' && delta < -SWIPE_DISTANCE) void closeMore();
    },
    { passive: true },
  );
}
