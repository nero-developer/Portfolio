import type { IconId } from './icons';

export interface SiteLink {
  id: IconId;
  label: string;
  href: string;
}

export interface StackItem {
  icon: string;
  label: string;
}

export interface PlaylistItem {
  title: string;
  artist?: string;
  cover?: string;
}

export interface SiteConfig {
  discordId: string;
  wallpaper: string;
  playlist: PlaylistItem[];
  links: SiteLink[];
  stack: StackItem[];
}

export const config: SiteConfig = {
  discordId: '1070475108742877294',
  wallpaper: 'wallpaper.mp4',
  playlist: [
    { title: 'Nostalgic Tape Lofi Piano', artist: 'None', cover: '/cover-1.webp' },
    { title: 'Window Side Lofi Swing', artist: 'None', cover: '/cover-2.webp' },
    { title: 'Calm Focus Lofi', artist: 'None', cover: '/cover-3.webp' },
    { title: 'Fireside Blanket Lofi', artist: 'None', cover: '/cover-4.webp' },
  ],
  links: [
    { id: 'github', label: 'GitHub', href: 'https://github.com/nero-developer' },
    { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/SEU_USUARIO' },
    { id: 'email', label: 'E-mail', href: 'mailto:two.developer.ofc@gmail.com' },
    { id: 'patreon', label: 'Patreon', href: 'https://www.patreon.com/SEU_USUARIO' },
    { id: 'discord', label: 'Discord', href: 'https://discord.com/users/913959527060226079' },
  ],
  stack: [
    { icon: 'devicon-python-plain', label: 'Python' },
    { icon: 'devicon-javascript-plain', label: 'JavaScript' },
    { icon: 'devicon-typescript-plain', label: 'TypeScript' },
    { icon: 'devicon-nodejs-plain', label: 'Node.js' },
    { icon: 'devicon-csharp-plain', label: 'C#' },
    { icon: 'devicon-dotnetcore-plain', label: '.NET' },
    { icon: 'devicon-dart-plain', label: 'Dart' },
    { icon: 'devicon-flutter-plain', label: 'Flutter' },
    { icon: 'devicon-html5-plain', label: 'HTML5' },
    { icon: 'devicon-css3-plain', label: 'CSS3' },
  ],
};
