import type { PaletteOverride } from './sprites';

export interface Skin {
  id: number;
  name: string;
  palette: PaletteOverride;
  // Promo metadata — when set, this skin is a time-limited event reward.
  promo?: {
    requiresStreakDays: number;
    endsAt: number;
  };
}

// id 8 = STREAK MASK — limited-time, claimable from the DAILY screen only
// (not shown in the shop). Requires 10-day check-in streak and the event must
// still be open. Red-white "mask" palette: white body with bold red accents.
export const STREAK_MASK_ID = 8;
// Event window: 2026-05-23 → 2026-07-23 (2 months from launch).
export const STREAK_MASK_ENDS_AT = Date.UTC(2026, 6, 23, 0, 0, 0); // month 6 = July (0-indexed)
export const STREAK_MASK_REQUIRED = 10;

export const SKINS: Skin[] = [
  { id: 0, name: 'Base Blue',    palette: {} },
  { id: 1, name: 'Cyan Edition', palette: { B: '#00D4FF', D: '#0094B8', L: '#A5EFFF', I: '#050a16' } },
  { id: 2, name: 'Gold Edition', palette: { B: '#FFD23F', D: '#A06C00', L: '#FFE680', I: '#050a16' } },
  { id: 3, name: 'Crimson',      palette: { B: '#FF4D6D', D: '#A11D3A', L: '#FFB0BC', I: '#050a16' } },
  { id: 4, name: 'Onyx',         palette: { B: '#1a1a1a', D: '#050a16', L: '#4F5A75', I: '#00D4FF' } },
  { id: 5, name: 'Leaf',         palette: { B: '#00B040', D: '#005020', L: '#7FE0A0', I: '#050a16' } },
  { id: 6, name: 'Violet',       palette: { B: '#7B5BFF', D: '#3A1A8B', L: '#C9B5FF', I: '#050a16' } },
  { id: 7, name: 'Ember',        palette: { B: '#FF6F00', D: '#8B2D00', L: '#FFB070', I: '#050a16' } },
  {
    id: STREAK_MASK_ID,
    name: 'Streak Mask',
    // Red-white mask palette: ivory body, crimson highlights + eyes
    palette: { B: '#EEF4FF', D: '#A11D3A', L: '#FF4D6D', I: '#A11D3A' },
    promo: { requiresStreakDays: STREAK_MASK_REQUIRED, endsAt: STREAK_MASK_ENDS_AT },
  },
];

const LS_EQUIPPED = 'blocks:equippedSkin';

let _cachedId: number | null = null;

function readId(): number {
  try {
    const raw = localStorage.getItem(LS_EQUIPPED);
    const n = raw == null ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 && n < SKINS.length ? n : 0;
  } catch { return 0; }
}

export function getEquippedSkinId(): number {
  if (_cachedId == null) _cachedId = readId();
  return _cachedId;
}

export function setEquippedSkinId(id: number) {
  try {
    if (id >= 0 && id < SKINS.length) {
      localStorage.setItem(LS_EQUIPPED, String(id));
      _cachedId = id;
    }
  } catch { /* noop */ }
}

export function getEquippedPalette(): PaletteOverride {
  return SKINS[getEquippedSkinId()]?.palette ?? {};
}

export function isMaskEventOpen(now = Date.now()): boolean {
  return now < STREAK_MASK_ENDS_AT;
}

// Returns a "Nd Nh" style remaining-time string for the event.
export function formatMaskTimeLeft(now = Date.now()): string {
  const ms = STREAK_MASK_ENDS_AT - now;
  if (ms <= 0) return 'ENDED';
  const totalH = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalH / 24);
  const hours = totalH % 24;
  if (days > 0) return `${days}D ${hours}H`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}H ${mins}M`;
}
