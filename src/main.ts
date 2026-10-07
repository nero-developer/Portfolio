import 'devicon/devicon.min.css';
import './style.css';
import './activities.css';
import './player.css';
import './views.css';
import './cursor.css';
import { createActivitiesView } from './activities';
import { createRadio } from './audio';
import { config } from './config';
import { startCursor } from './cursor';
import { byId } from './dom';
import { watchPresence, type Presence } from './lanyard';
import { renderLinks, renderStack } from './links';
import { startMotes } from './motes';
import { getTier, initTier, monitorFrames, onTierChange } from './perf';
import { createPlayerView } from './player';
import { createProfileView } from './profile';
import { createVolumeView } from './volume';
import { createViews } from './views';
import { createWallpaper } from './wallpaper';

initTier();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const gate = byId<HTMLButtonElement>('gate');

const wallpaper = createWallpaper(byId('wallpaper'));
const motes = !reducedMotion && getTier() === 'full' ? startMotes(byId<HTMLCanvasElement>('motes')) : null;
onTierChange(() => motes?.stop());

renderLinks(byId('links'));
renderStack(byId('stack'));

const radio = createRadio(config.playlist);

createVolumeView(radio, {
  root: byId('volume'),
  mute: byId<HTMLButtonElement>('mute'),
  slider: byId<HTMLInputElement>('vol'),
});

createPlayerView(radio, {
  root: byId('player'),
  cover: byId('cover'),
  title: byId('track-title'),
  artist: byId('track-artist'),
  seek: byId<HTMLInputElement>('seek'),
  now: byId('time-now'),
  total: byId('time-total'),
  previous: byId<HTMLButtonElement>('prev'),
  toggle: byId<HTMLButtonElement>('toggle'),
  next: byId<HTMLButtonElement>('next'),
});

const renderProfile = createProfileView({
  name: byId('name'),
  avatar: byId<HTMLImageElement>('avatar'),
  dot: byId('dot'),
  status: byId('status'),
});
const renderActivities = createActivitiesView(byId('activities'));

createViews({
  locked: [byId('home'), byId('volume')],
  shifting: [...Array.from(document.querySelectorAll<HTMLElement>('.profile > :not(.pull)')), byId('volume')],
  veil: byId('veil'),
  projects: byId('projects'),
  more: byId('more'),
  pull: byId<HTMLButtonElement>('pull'),
});

startCursor(byId('cursor'));

gate.addEventListener('click', () => {
  document.body.classList.add('entered');
  gate.classList.add('gone');
  radio.start();
  wallpaper.play();
  monitorFrames();
});

watchPresence(config.discordId, (presence: Presence) => {
  renderProfile(presence);
  renderActivities(presence);
});
