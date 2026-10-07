import { create } from './dom';
import { avatarUrl, customStatus, type Activity, type Presence } from './lanyard';
import { statusIcon, statusLabel } from './status';

interface ProfileNodes {
  name: HTMLElement;
  avatar: HTMLImageElement;
  dot: HTMLElement;
  status: HTMLElement;
}

function emojiNode(emoji: NonNullable<Activity['emoji']>): HTMLElement {
  if (emoji.id) {
    const img = create('img', 'emoji');
    const ext = emoji.animated ? 'gif' : 'png';
    img.src = `https://cdn.discordapp.com/emojis/${emoji.id}.${ext}?size=32`;
    img.alt = `:${emoji.name}:`;
    return img;
  }
  return create('span', 'emoji', emoji.name);
}

export function createProfileView(nodes: ProfileNodes): (presence: Presence) => void {
  nodes.avatar.addEventListener('load', () => nodes.avatar.classList.add('ready'));

  return (presence) => {
    const { discord_user: user, discord_status: status } = presence;
    const name = user.global_name ?? user.username;

    nodes.name.textContent = name;

    const avatar = avatarUrl(user);
    if (nodes.avatar.src !== avatar) nodes.avatar.src = avatar;
    nodes.avatar.alt = `Foto de perfil de ${name}`;

    nodes.dot.innerHTML = statusIcon[status];
    nodes.dot.dataset.status = status;
    nodes.dot.title = statusLabel[status];
    nodes.dot.setAttribute('aria-label', `Status do Discord: ${statusLabel[status]}`);

    const custom = customStatus(presence);
    const text = create('span', 'text', custom?.state?.trim() || statusLabel[status]);
    nodes.status.replaceChildren(...(custom?.emoji ? [emojiNode(custom.emoji)] : []), text);
    nodes.status.hidden = false;
  };
}
