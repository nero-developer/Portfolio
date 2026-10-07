import type { Radio } from './audio';

interface VolumeNodes {
  root: HTMLElement;
  mute: HTMLButtonElement;
  slider: HTMLInputElement;
}

export function createVolumeView(radio: Radio, nodes: VolumeNodes): void {
  const { audio } = radio;

  const render = (): void => {
    const silent = audio.muted || audio.volume === 0;
    nodes.mute.dataset.state = silent ? 'muted' : 'on';
    nodes.mute.setAttribute('aria-label', silent ? 'Ativar som' : 'Silenciar');
    nodes.slider.value = String(Math.round(audio.volume * 100));
    nodes.slider.style.setProperty('--fill', `${silent ? 0 : nodes.slider.value}%`);
  };

  const markUnavailable = (): void => {
    nodes.root.classList.add('unavailable');
    nodes.mute.disabled = true;
    nodes.slider.disabled = true;
    nodes.mute.title = 'Música não encontrada';
  };

  nodes.mute.addEventListener('click', () => radio.toggleMute());
  nodes.slider.addEventListener('input', () => radio.setVolume(Number(nodes.slider.value) / 100));
  radio.events.addEventListener('volumechange', render);
  radio.events.addEventListener('unavailable', markUnavailable);

  render();
  if (!radio.available) markUnavailable();
}
