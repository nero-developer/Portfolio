export type DiscordStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface Activity {
  type: number;
  name: string;
  details?: string | null;
  state?: string | null;
  application_id?: string;
  timestamps?: { start?: number; end?: number };
  assets?: { large_image?: string; large_text?: string; small_image?: string; small_text?: string };
  emoji?: { name: string; id?: string; animated?: boolean } | null;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
}

export interface Presence {
  discord_user: DiscordUser;
  discord_status: DiscordStatus;
  activities: Activity[];
}

interface Packet {
  op: number;
  t?: string;
  d?: unknown;
}

const REST_URL = 'https://api.lanyard.rest/v1/users/';
const SOCKET_URL = 'wss://api.lanyard.rest/socket';
const RECONNECT_DELAY = 5000;
export const ACTIVITY_PLAYING = 0;
export const ACTIVITY_LISTENING = 2;
const ACTIVITY_CUSTOM = 4;

export function avatarUrl(user: DiscordUser, size = 256): string {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
  }
  const index = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function customStatus(presence: Presence): Activity | undefined {
  return presence.activities.find((activity) => activity.type === ACTIVITY_CUSTOM);
}

export function richActivities(presence: Presence, limit = 4): Activity[] {
  return presence.activities
    .filter((activity) => activity.type === ACTIVITY_PLAYING || activity.type === ACTIVITY_LISTENING)
    .slice(0, limit);
}

export function activityImage(activity: Activity): string | null {
  const image = activity.assets?.large_image;
  if (!image) return null;
  if (/^https?:\/\//.test(image)) return image;
  if (image.startsWith('mp:')) return `https://media.discordapp.net/${image.slice(3)}`;
  if (image.startsWith('spotify:')) return `https://i.scdn.co/image/${image.slice(8)}`;
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
  }
  return null;
}

export function watchPresence(id: string, onUpdate: (presence: Presence) => void): () => void {
  let socket: WebSocket | null = null;
  let heartbeat: number | undefined;
  let reconnect: number | undefined;
  let closed = false;

  const load = async (): Promise<void> => {
    try {
      const response = await fetch(REST_URL + id);
      const body = (await response.json()) as { success: boolean; data?: Presence };
      if (body.success && body.data) onUpdate(body.data);
    } catch {
      return;
    }
  };

  const open = (): void => {
    if (closed) return;
    const ws = new WebSocket(SOCKET_URL);
    socket = ws;

    ws.addEventListener('message', (event: MessageEvent<string>) => {
      let packet: Packet;
      try {
        packet = JSON.parse(event.data) as Packet;
      } catch {
        return;
      }

      if (packet.op === 1) {
        const { heartbeat_interval: interval } = packet.d as { heartbeat_interval: number };
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: id } }));
        window.clearInterval(heartbeat);
        heartbeat = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
        }, interval);
        return;
      }

      const isPresence = packet.t === 'INIT_STATE' || packet.t === 'PRESENCE_UPDATE';
      if (packet.op === 0 && isPresence) onUpdate(packet.d as Presence);
    });

    ws.addEventListener('close', () => {
      window.clearInterval(heartbeat);
      if (!closed) reconnect = window.setTimeout(open, RECONNECT_DELAY);
    });
  };

  void load();
  open();

  return () => {
    closed = true;
    window.clearInterval(heartbeat);
    window.clearTimeout(reconnect);
    socket?.close();
  };
}
