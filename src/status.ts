import type { DiscordStatus } from './lanyard';

export const statusLabel: Record<DiscordStatus, string> = {
  online: 'online',
  idle: 'ausente',
  dnd: 'não perturbe',
  offline: 'offline',
};

export const statusIcon: Record<DiscordStatus, string> = {
  online: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#23a55a"/></svg>`,
  idle: `<svg viewBox="0 0 24 24" aria-hidden="true"><mask id="idle-cut"><rect width="24" height="24" fill="#fff"/><circle cx="18" cy="6" r="7" fill="#000"/></mask><circle cx="12" cy="12" r="10" fill="#f0b232" mask="url(#idle-cut)"/></svg>`,
  dnd: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f23f43"/><rect x="6" y="10.2" width="12" height="3.6" rx="1.8" fill="#fff"/></svg>`,
  offline: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="#80848e" stroke-width="4"/></svg>`,
};
