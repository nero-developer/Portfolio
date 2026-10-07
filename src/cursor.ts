const CLICKABLE = 'a, button, input, select, textarea, label, summary, [role="button"]';

export function startCursor(node: HTMLElement): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let x = 0;
  let y = 0;
  let frame = 0;

  const place = (): void => {
    node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    frame = 0;
  };

  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX;
    y = event.clientY;
    document.documentElement.classList.add('has-cursor');
    node.classList.add('visible');
    const target = event.target instanceof Element ? event.target : null;
    node.classList.toggle('active', target?.closest(CLICKABLE) != null);
    if (!frame) frame = requestAnimationFrame(place);
  });

  document.addEventListener('pointerdown', () => node.classList.add('pressed'));
  document.addEventListener('pointerup', () => node.classList.remove('pressed'));
  document.addEventListener('pointercancel', () => node.classList.remove('pressed'));
  document.documentElement.addEventListener('mouseleave', () => node.classList.remove('visible'));
}
