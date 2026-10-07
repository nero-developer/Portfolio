interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

export interface Motes {
  stop(): void;
}

const MAX_MOTES = 70;
const AREA_PER_MOTE = 22000;

export function startMotes(canvas: HTMLCanvasElement): Motes {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { stop() {} };

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let motes: Mote[] = [];
  let tick = 0;
  let frameId = 0;

  const spawn = (anywhere: boolean): Mote => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + 10,
    r: 0.8 + Math.random() * 2.2,
    vx: (Math.random() - 0.5) * 0.15,
    vy: 0.12 + Math.random() * 0.35,
    alpha: 0.25 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
  });

  const resize = (): void => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(MAX_MOTES, (width * height) / AREA_PER_MOTE));
    motes = Array.from({ length: count }, () => spawn(true));
  };

  const frame = (): void => {
    tick += 1;
    ctx.clearRect(0, 0, width, height);
    for (const mote of motes) {
      mote.y -= mote.vy;
      mote.x += mote.vx + Math.sin(tick * 0.01 + mote.phase) * 0.12;
      if (mote.y < -10) Object.assign(mote, spawn(false));
      const twinkle = 0.6 + 0.4 * Math.sin(tick * 0.02 + mote.phase);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${(mote.alpha * twinkle).toFixed(3)})`;
      ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
      ctx.fill();
    }
    frameId = requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize);
  frameId = requestAnimationFrame(frame);

  return {
    stop() {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, width, height);
    },
  };
}
