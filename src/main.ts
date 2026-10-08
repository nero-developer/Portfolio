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
import { createViews, type PageView } from './views';
import { createVolumeView } from './volume';
import { createBackdrop } from './wallpaper';

initTier();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compact = window.matchMedia('(max-width: 760px), (max-height: 560px)');
const idleDelay = 1200;

const gate = byId<HTMLButtonElement>('gate');
const stage = byId('stage');
const stack = byId('stack');
const profile = byId('home').querySelector<HTMLElement>('.profile') as HTMLElement;

const backdrops = {
  home: createBackdrop(byId('wallpaper'), config.wallpapers.home, 'video'),
  projects: createBackdrop(byId('projects'), config.wallpapers.projects, 'image'),
  more: createBackdrop(byId('more'), config.wallpapers.more, 'image'),
};

const motes = !reducedMotion && getTier() === 'full' ? startMotes(byId<HTMLCanvasElement>('motes')) : null;
onTierChange(() => motes?.stop());

renderLinks(byId('links'));
renderStack(stack);

const placeStack = (): void => {
  (compact.matches ? profile : stage).append(stack);
};
compact.addEventListener('change', placeStack);
placeStack();

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

const pages: Record<PageView, HTMLElement> = { projects: byId('projects'), more: byId('more') };
const pulls: Record<PageView, HTMLButtonElement> = {
  projects: byId<HTMLButtonElement>('pull-left'),
  more: byId<HTMLButtonElement>('pull-up'),
};

createViews({
  stage,
  locked: [stage, pulls.projects, pulls.more],
  pages,
  pulls,
  hooks: {
    open: (page) => backdrops[page].show(),
    close: (page) => backdrops[page].hide(true),
    cover: (covered) => (covered ? backdrops.home.hide() : backdrops.home.show()),
  },
});

startCursor(byId('cursor'));
backdrops.home.show();

gate.addEventListener('click', () => {
  document.body.classList.add('entered');
  gate.classList.add('gone');
  radio.start();
  monitorFrames();
  window.setTimeout(() => {
    backdrops.projects.preload();
    backdrops.more.preload();
  }, idleDelay);
});

watchPresence(config.discordId, (presence: Presence) => {
  renderProfile(presence);
  renderActivities(presence);
});
