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
const LS_CURSOR_PREFIX = 'blocks:logCursor:';
const LS_DAYKEYS_PREFIX = 'blocks:dayKeys:';

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

// Scan cursor — remembers the last block already searched for a given
// contract+wallet, so each refresh only reads blocks minted since the previous
// one instead of re-walking the whole history from the deploy block.
function cursorKey(tag: string, address: string): string {
  return `${LS_CURSOR_PREFIX}${tag}:${address.toLowerCase()}`;
}
function readCursor(tag: string, address: string): bigint | null {
  const raw = lsGet(cursorKey(tag, address));
  if (!raw) return null;
  try { return BigInt(raw); } catch { return null; }
}
function writeCursor(tag: string, address: string, block: bigint) {
  // Keep a ~1min tail (Base mints ~1 block/2s) below the scanned tip: public
  // RPCs index fresh logs with a lag, and a cursor placed exactly at `latest`
  // could permanently skip an event that was mined but not yet indexed.
  const SAFETY = 30n;
  const safe = block > SAFETY ? block - SAFETY : 0n;
  lsSet(cursorKey(tag, address), safe.toString());
}

async function fetchPlayerLogs(
  client: PublicClient,
  address: `0x${string}`,
  contractAddress: `0x${string}`,
  event: AbiEvent,
  fromBlock: bigint,
): Promise<{ logs: DecodedLog[]; scannedTo: bigint }> {
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
  return { logs: out, scannedTo: latest };
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
    // A full clear is permanent — once we've seen one, never scan again.
    if (lsGet(LS_UNLOCK_PREFIX + address.toLowerCase()) === '1') {
      setUnlocked(true);
      return;
    }
    setLoading(true);
    try {
      const cached = readCursor('run', address);
      const from = cached != null && cached >= DEPLOY_BLOCK ? cached + 1n : DEPLOY_BLOCK;
      const { logs, scannedTo } = await fetchPlayerLogs(client, address, CONTRACT_ADDRESS, RUN_EVENT, from);
      const ok = logs.some((l) => {
        const lvl = Number(l.args.levelsCleared ?? 0);
        return lvl >= LEVELS_TOTAL;
      });
      writeCursor('run', address, scannedTo);
      if (ok) {
        setUnlocked(true);
        lsSet(LS_UNLOCK_PREFIX + address.toLowerCase(), '1');
      }
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
      // Day keys already seen for this wallet — only blocks past the cursor
      // are scanned; found keys accumulate in localStorage.
      const daysKey = LS_DAYKEYS_PREFIX + address.toLowerCase();
      const days = new Set<number>();
      try {
        const arr = JSON.parse(lsGet(daysKey) ?? '[]') as number[];
        if (Array.isArray(arr)) for (const k of arr) if (Number.isFinite(k)) days.add(k);
      } catch { /* start empty */ }
      const cached = readCursor('daily', address);
      const from = cached != null && cached >= DAILY_DEPLOY_BLOCK ? cached + 1n : DAILY_DEPLOY_BLOCK;
      const { logs, scannedTo } = await fetchPlayerLogs(client, address, DAILY_ADDRESS, DAILY_EVENT, from);
      for (const l of logs) {
        const raw = l.args.dayKey;
        if (raw == null) continue;
        const k = typeof raw === 'bigint' ? Number(raw) : Number(raw);
        if (Number.isFinite(k)) days.add(k);
      }
      lsSet(daysKey, JSON.stringify(Array.from(days)));
      writeCursor('daily', address, scannedTo);
      const todayKey = todayDayKey();
      // A check-in tx lands on the RPC's event index with a lag. If we recorded
      // today optimistically (markCheckedIn) but the log isn't visible yet,
      // trust the local flag — otherwise the button re-enables and a second
      // (wasted) check-in tx becomes possible.
      const optimisticToday =
        lsGet(LS_CHECKIN_PREFIX + address.toLowerCase()) === String(todayKey);
      const hasToday = days.has(todayKey) || optimisticToday;
      if (hasToday) days.add(todayKey);
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
