import { useCallback, useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, type AbiEvent, type PublicClient } from 'viem';
import {
  CONTRACT_ADDRESS,
  DAILY_ADDRESS,
  DAILY_DEPLOY_BLOCK,
  DEPLOY_BLOCK,
  USE_CONTRACT,
  USE_DAILY,
  todayDayKey,
} from '../config/contract';

const CHUNK = 5000n;
const PARALLEL = 6;
const LEVELS_TOTAL = 16;

const RUN_EVENT = parseAbiItem(
  'event RunRecorded(address indexed player, uint256 score, uint256 timeMs, uint8 levelsCleared)',
);
const DAILY_EVENT = parseAbiItem(
  'event DailyRunRecorded(uint32 indexed dayKey, address indexed player, uint256 score, uint256 timeMs, bool cleared)',
);

const LS_UNLOCK_PREFIX = 'blocks:unlock:';
const LS_STREAK_PREFIX = 'blocks:streakDays:';
const LS_CHECKIN_PREFIX = 'blocks:checkedIn:';

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch { /* noop */ }
}

// Decoded log row — only fields we read. The actual viem log carries `args`
// inferred from the AbiEvent, but exposing it as an opaque object keeps the
// generic plumbing minimal.
interface DecodedLog {
  args: Record<string, unknown>;
}

async function fetchPlayerLogs(
  client: PublicClient,
  address: `0x${string}`,
  contractAddress: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
): Promise<DecodedLog[]> {
  const latest = await client.getBlockNumber();
  const ranges: Array<{ from: bigint; to: bigint }> = [];
  for (let b = fromBlock; b <= latest; b += CHUNK) {
    const end = b + CHUNK - 1n > latest ? latest : b + CHUNK - 1n;
    ranges.push({ from: b, to: end });
  }
  const out: DecodedLog[] = [];
  for (let i = 0; i < ranges.length; i += PARALLEL) {
    const batch = ranges.slice(i, i + PARALLEL);
    const results = await Promise.all(
      batch.map((r) =>
        client.getLogs({
          address: contractAddress,
          event,
          args: { player: address } as never,
          fromBlock: r.from,
          toBlock: r.to,
        }),
      ),
    );
    for (const arr of results) {
      for (const item of arr) {
        const args = (item as { args?: Record<string, unknown> }).args ?? {};
        out.push({ args });
      }
    }
  }
  return out;
}

// ── Unlock — true once the wallet has any RunRecorded with levelsCleared >= 16
export function useUnlock() {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (!address) return false;
    return lsGet(LS_UNLOCK_PREFIX + address.toLowerCase()) === '1';
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!USE_CONTRACT || !client || !address || !isConnected || DEPLOY_BLOCK === 0n) {
      setUnlocked(false);
      return;
    }
    setLoading(true);
    try {
      const logs = await fetchPlayerLogs(client, address, CONTRACT_ADDRESS, RUN_EVENT, DEPLOY_BLOCK);
      const ok = logs.some((l) => {
        const lvl = Number(l.args.levelsCleared ?? 0);
        return lvl >= LEVELS_TOTAL;
      });
      setUnlocked(ok);
      lsSet(LS_UNLOCK_PREFIX + address.toLowerCase(), ok ? '1' : '0');
    } catch {
      // keep cached value on failure
    } finally {
      setLoading(false);
    }
  }, [client, address, isConnected]);

  useEffect(() => {
    if (!address || !isConnected) {
      setUnlocked(false);
      return;
    }
    // pre-fill from cache for instant render
    const cached = lsGet(LS_UNLOCK_PREFIX + address.toLowerCase()) === '1';
    setUnlocked(cached);
    void refresh();
  }, [address, isConnected, refresh]);

  return { unlocked, loading, refresh };
}

// ── Streak — consecutive days ending today (or yesterday if no checkin today yet)
// Reads DailyRunRecorded events for connected wallet, builds a Set of day keys,
// then counts back from today.
function dateToDayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function useStreak() {
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const today = todayDayKey();
  const [streak, setStreak] = useState<number>(() => {
    if (!address) return 0;
    return Number(lsGet(LS_STREAK_PREFIX + address.toLowerCase()) ?? '0') || 0;
  });
  const [checkedInToday, setCheckedInToday] = useState<boolean>(() => {
    if (!address) return false;
    return lsGet(LS_CHECKIN_PREFIX + address.toLowerCase()) === String(today);
  });
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!USE_DAILY || !client || !address || !isConnected || DAILY_DEPLOY_BLOCK === 0n) {
      setStreak(0);
      setCheckedInToday(false);
      return;
    }
    setLoading(true);
    try {
      const logs = await fetchPlayerLogs(client, address, DAILY_ADDRESS, DAILY_EVENT, DAILY_DEPLOY_BLOCK);
      const days = new Set<number>();
      for (const l of logs) {
        const raw = l.args.dayKey;
        if (raw == null) continue;
        const k = typeof raw === 'bigint' ? Number(raw) : Number(raw);
        if (Number.isFinite(k)) days.add(k);
      }
      const todayKey = todayDayKey();
      const hasToday = days.has(todayKey);
      // Count back from today (or yesterday if today missing — streak still alive)
      const start = hasToday ? new Date() : (() => {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return y;
      })();
      let count = 0;
      const cursor = new Date(start);
      while (days.has(dateToDayKey(cursor))) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
      setStreak(count);
      setCheckedInToday(hasToday);
      lsSet(LS_STREAK_PREFIX + address.toLowerCase(), String(count));
      if (hasToday) lsSet(LS_CHECKIN_PREFIX + address.toLowerCase(), String(todayKey));
    } catch {
      // keep cached values
    } finally {
      setLoading(false);
    }
  }, [client, address, isConnected]);

  useEffect(() => {
    if (!address || !isConnected) {
      setStreak(0);
      setCheckedInToday(false);
      return;
    }
    void refresh();
  }, [address, isConnected, refresh]);

  // Optimistic check-in — flips the UI to "checked in" immediately after a
  // successful tx, before the next event-log refresh has indexed the new event.
  // This is what makes the button turn green on the first press.
  const markCheckedIn = useCallback(() => {
    if (!address) return;
    setCheckedInToday(true);
    setStreak((prev) => {
      const next = prev + 1;
      lsSet(LS_STREAK_PREFIX + address.toLowerCase(), String(next));
      return next;
    });
    lsSet(LS_CHECKIN_PREFIX + address.toLowerCase(), String(today));
  }, [address, today]);

  return { streak, checkedInToday, loading, refresh, markCheckedIn };
}

// Bonus multiplier applied to daily clear scores. Capped at 2x (10+ days).
export function streakMultiplier(streak: number): number {
  return 1 + Math.min(streak, 10) * 0.1;
}

export function streakBonusPct(streak: number): number {
  return Math.round((streakMultiplier(streak) - 1) * 100);
}
