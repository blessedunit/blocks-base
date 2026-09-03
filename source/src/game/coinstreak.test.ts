import { describe, it, expect } from 'vitest';
import { createState, awardCoin, coinMultiplier, type GameState } from './engine';
import {
  COIN_VALUE,
  COIN_STREAK_STEP,
  COIN_STREAK_MAX_MULT,
  COIN_STREAK_TIMEOUT,
} from './constants';

function fresh(): GameState {
  return createState(0);
}

// Grab `n` coins back to back (each refreshes the streak timer, so none lapse).
function grab(s: GameState, n: number) {
  for (let i = 0; i < n; i++) awardCoin(s, { silent: true });
}

describe('coinMultiplier', () => {
  it('is ×1 before any streak and steps up every COIN_STREAK_STEP coins', () => {
    const s = fresh();
    expect(coinMultiplier(s)).toBe(1); // streak 0
    s.coinStreak = COIN_STREAK_STEP - 1;
    expect(coinMultiplier(s)).toBe(1);
    s.coinStreak = COIN_STREAK_STEP;
    expect(coinMultiplier(s)).toBe(2);
    s.coinStreak = COIN_STREAK_STEP * 2;
    expect(coinMultiplier(s)).toBe(3);
  });

  it('is capped at COIN_STREAK_MAX_MULT no matter how long the streak', () => {
    const s = fresh();
    s.coinStreak = COIN_STREAK_STEP * 100;
    expect(coinMultiplier(s)).toBe(COIN_STREAK_MAX_MULT);
  });
});

describe('awardCoin — streak building and payout', () => {
  it('increments coins and streak, and refreshes the lapse timer', () => {
    const s = fresh();
    awardCoin(s, { silent: true });
    expect(s.coins).toBe(1);
    expect(s.coinStreak).toBe(1);
    expect(s.coinStreakT).toBe(COIN_STREAK_TIMEOUT);
  });

  it('pays base value while multiplier is ×1, then multiplied once the streak crosses a tier', () => {
    const s = fresh();
    const scoreStart = s.score;
    // First COIN_STREAK_STEP coins are all still ×1 (multiplier bumps AT the step).
    grab(s, COIN_STREAK_STEP - 1);
    expect(s.score - scoreStart).toBe(COIN_VALUE * (COIN_STREAK_STEP - 1));
    // The coin that reaches COIN_STREAK_STEP pays at ×2.
    const before = s.score;
    awardCoin(s, { silent: true }); // streak now == COIN_STREAK_STEP → mult 2
    expect(coinMultiplier(s)).toBe(2);
    expect(s.score - before).toBe(COIN_VALUE * 2);
  });
});

describe('streak reset conditions', () => {
  it('lapses to 0 after COIN_STREAK_TIMEOUT frames without a coin (decay)', () => {
    const s = fresh();
    grab(s, COIN_STREAK_STEP + 2);
    expect(s.coinStreak).toBeGreaterThan(0);
    // Simulate the per-frame decay the engine tick applies.
    for (let f = 0; f < COIN_STREAK_TIMEOUT; f++) {
      if (s.coinStreakT > 0) {
        s.coinStreakT -= 1;
        if (s.coinStreakT === 0) s.coinStreak = 0;
      }
    }
    expect(s.coinStreak).toBe(0);
    expect(coinMultiplier(s)).toBe(1);
  });

  it('a coin grabbed before the timeout keeps the streak alive', () => {
    const s = fresh();
    grab(s, COIN_STREAK_STEP);
    const streakBefore = s.coinStreak;
    // Let it decay ALMOST to zero, then grab another coin.
    for (let f = 0; f < COIN_STREAK_TIMEOUT - 1; f++) s.coinStreakT -= 1;
    expect(s.coinStreakT).toBe(1);
    awardCoin(s, { silent: true });
    expect(s.coinStreak).toBe(streakBefore + 1);
    expect(s.coinStreakT).toBe(COIN_STREAK_TIMEOUT); // refreshed
  });
});
