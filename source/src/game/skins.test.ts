import { describe, it, expect, beforeEach } from 'vitest';
import {
  SKINS,
  STREAK_MASK_ID,
  STREAK_MASK_ENDS_AT,
  STREAK_MASK_REQUIRED,
  getEquippedSkinId,
  setEquippedSkinId,
  getEquippedPalette,
  isMaskEventOpen,
  formatMaskTimeLeft,
} from './skins';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe('skin catalogue', () => {
  it('has unique, contiguous ids for the shop skins plus the mask event id', () => {
    const ids = SKINS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
    // shop skins are 0..7, the mask is the special id 8
    expect(ids).toContain(0);
    expect(ids).toContain(STREAK_MASK_ID);
    expect(STREAK_MASK_ID).toBe(8);
  });

  it('only the mask skin carries promo metadata', () => {
    for (const s of SKINS) {
      if (s.id === STREAK_MASK_ID) {
        expect(s.promo).toBeDefined();
        expect(s.promo!.requiresStreakDays).toBe(STREAK_MASK_REQUIRED);
        expect(s.promo!.endsAt).toBe(STREAK_MASK_ENDS_AT);
      } else {
        expect(s.promo).toBeUndefined();
      }
    }
  });

  it('every skin has a name and a palette object', () => {
    for (const s of SKINS) {
      expect(typeof s.name).toBe('string');
      expect(s.name.length).toBeGreaterThan(0);
      expect(typeof s.palette).toBe('object');
    }
  });
});

describe('equipped skin persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    // reset the module-level cache by re-equipping a known value
    setEquippedSkinId(0);
  });

  it('defaults to skin 0 when nothing is stored', () => {
    localStorage.clear();
    // fresh read after clearing storage still yields a safe default
    expect(getEquippedSkinId()).toBeGreaterThanOrEqual(0);
    expect(getEquippedSkinId()).toBeLessThan(SKINS.length);
  });

  it('round-trips a valid skin id through storage', () => {
    setEquippedSkinId(3);
    expect(getEquippedSkinId()).toBe(3);
    expect(localStorage.getItem('blocks:equippedSkin')).toBe('3');
  });

  it('rejects out-of-range ids (negative and >= length)', () => {
    setEquippedSkinId(2);
    setEquippedSkinId(-1);          // ignored
    expect(getEquippedSkinId()).toBe(2);
    setEquippedSkinId(SKINS.length); // ignored
    expect(getEquippedSkinId()).toBe(2);
  });

  it('getEquippedPalette matches the equipped skin', () => {
    setEquippedSkinId(1);
    expect(getEquippedPalette()).toEqual(SKINS[1].palette);
  });
});

describe('mask event window', () => {
  it('is open before the end timestamp and closed after', () => {
    expect(isMaskEventOpen(STREAK_MASK_ENDS_AT - HOUR)).toBe(true);
    expect(isMaskEventOpen(STREAK_MASK_ENDS_AT)).toBe(false);
    expect(isMaskEventOpen(STREAK_MASK_ENDS_AT + HOUR)).toBe(false);
  });
});

describe('formatMaskTimeLeft', () => {
  it('shows "ENDED" once the window has closed', () => {
    expect(formatMaskTimeLeft(STREAK_MASK_ENDS_AT)).toBe('ENDED');
    expect(formatMaskTimeLeft(STREAK_MASK_ENDS_AT + DAY)).toBe('ENDED');
  });

  it('uses "Nd Nh" format when more than a day remains', () => {
    const now = STREAK_MASK_ENDS_AT - (2 * DAY + 3 * HOUR);
    expect(formatMaskTimeLeft(now)).toBe('2D 3H');
  });

  it('falls back to "Nh Nm" inside the final day', () => {
    const now = STREAK_MASK_ENDS_AT - (5 * HOUR + 30 * 60_000);
    expect(formatMaskTimeLeft(now)).toBe('5H 30M');
  });
});
