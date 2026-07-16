import { useEffect, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, type PublicClient } from 'viem';
import {
  CONTRACT_ADDRESS,
  DAILY_ADDRESS,
  DAILY_DEPLOY_BLOCK,
  DEPLOY_BLOCK,
  USE_CONTRACT,
  USE_DAILY,
  todayDayKey,
} from '../config/contract';
import { readLocalBestScore, readLocalBestTime } from '../hooks/useSmartTransaction';

const CHUNK = 9000n;   // under mainnet.base.org's 10k getLogs limit → fewer calls
const PARALLEL = 3;    // gentler on the public RPC (avoids rate-limit drops)
const TOP_N = 100;

// getLogs with retry/backoff — public RPCs drop the odd request under load.
async function getLogsRetry(
  client: PublicClient,
  params: Parameters<PublicClient['getLogs']>[0],
  tries = 3,
): Promise<Awaited<ReturnType<PublicClient['getLogs']>>> {
  let lastErr: unknown;
  for (let t = 0; t < tries; t++) {
    try {
      return await client.getLogs(params as never);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 250 * (t + 1)));
    }
  }
  throw lastErr;
}
const RUN_EVENT = parseAbiItem(
  'event RunRecorded(address indexed player, uint256 score, uint256 timeMs, uint8 levelsCleared)',
);
const DAILY_EVENT = parseAbiItem(
  'event DailyRunRecorded(uint32 indexed dayKey, address indexed player, uint256 score, uint256 timeMs, bool cleared)',
);

interface Entry {
  player: `0x${string}`;
  bestScore: number;
  bestTime: number;       // 0 = no full clear
}

interface DailyEntry {
  player: `0x${string}`;
  bestScore: number;
}

function short(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function formatTime(ms: number): string {
  if (ms <= 0) return '—';
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

async function fetchAllLogs(client: PublicClient, latest: bigint, fromBlock: bigint) {
  const ranges: Array<{ from: bigint; to: bigint }> = [];
  for (let b = fromBlock; b <= latest; b += CHUNK) {
    const end = b + CHUNK - 1n > latest ? latest : b + CHUNK - 1n;
    ranges.push({ from: b, to: end });
  }
  const out: Awaited<ReturnType<PublicClient['getLogs']>> = [];
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < ranges.length; i += PARALLEL) {
    const batch = ranges.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(
      batch.map((r) =>
        getLogsRetry(client, { address: CONTRACT_ADDRESS, event: RUN_EVENT, fromBlock: r.from, toBlock: r.to }),
      ),
    );
    for (const res of results) {
      if (res.status === 'fulfilled') { ok += 1; out.push(...res.value); }
      else fail += 1;
    }
  }
  // Only treat as unreachable if EVERY chunk failed; partial success still shows.
  if (ok === 0 && fail > 0) throw new Error('chain unreachable');
  // `complete` gates snapshot persistence — a partially-scanned range must not
  // advance the cursor or events in the failed chunks would be lost for good.
  return { logs: out, complete: fail === 0 };
}

// Cached leaderboard snapshot — aggregated bests + the block the scan stopped
// at. Next open only walks blocks minted since then. Cursor parks ~30 blocks
// below the tip because public RPCs index fresh logs with a lag.
const LS_LB_CACHE = 'blocks:lbCache:v1';
const CURSOR_SAFETY = 30n;

interface LbCache { cursor: string; entries: Entry[] }

function readLbCache(): { fromBlock: bigint; entries: Map<string, Entry> } | null {
  try {
    const raw = localStorage.getItem(LS_LB_CACHE);
    if (!raw) return null;
    const c = JSON.parse(raw) as LbCache;
    const cursor = BigInt(c.cursor);
    if (cursor < DEPLOY_BLOCK || !Array.isArray(c.entries)) return null;
    const entries = new Map<string, Entry>();
    for (const e of c.entries) {
      if (typeof e?.player === 'string') entries.set(e.player.toLowerCase(), { ...e });
    }
    return { fromBlock: cursor + 1n, entries };
  } catch { return null; }
}

function writeLbCache(latest: bigint, entries: Entry[]) {
  try {
    const cursor = latest > CURSOR_SAFETY ? latest - CURSOR_SAFETY : 0n;
    localStorage.setItem(LS_LB_CACHE, JSON.stringify({ cursor: cursor.toString(), entries }));
  } catch { /* noop */ }
}

// Today's day-key can only appear in recent blocks: Base mints ~1 block/2s and
// "today" started at most ~26h ago in the poster's own timezone (UTC+14 edge),
// so a ~39h window (70k blocks) safely bounds the scan instead of walking the
// whole contract history for a single day's ranking.
const DAILY_WINDOW_BLOCKS = 70_000n;

async function fetchDailyLogs(client: PublicClient, latest: bigint, dayKey: number) {
  const windowStart = latest > DAILY_WINDOW_BLOCKS ? latest - DAILY_WINDOW_BLOCKS : 0n;
  const fromBlock = windowStart > DAILY_DEPLOY_BLOCK ? windowStart : DAILY_DEPLOY_BLOCK;
  const ranges: Array<{ from: bigint; to: bigint }> = [];
  for (let b = fromBlock; b <= latest; b += CHUNK) {
    const end = b + CHUNK - 1n > latest ? latest : b + CHUNK - 1n;
    ranges.push({ from: b, to: end });
  }
  const out: Awaited<ReturnType<PublicClient['getLogs']>> = [];
  for (let i = 0; i < ranges.length; i += PARALLEL) {
    const batch = ranges.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(
      batch.map((r) =>
        getLogsRetry(client, {
          address: DAILY_ADDRESS,
          event: DAILY_EVENT,
          args: { dayKey } as never,
          fromBlock: r.from,
          toBlock: r.to,
        }),
      ),
    );
    for (const res of results) {
      if (res.status === 'fulfilled') out.push(...res.value);
    }
  }
  return out;
}

interface Props { onBack: () => void }

type Tab = 'score' | 'time' | 'daily';

// Pixel podium with three cubes — gold/silver/bronze, crown bobbing on gold,
// confetti pixels rising from below. Sits at the bottom of the ranking.
function Podium() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 4;
    const W = 80;
    const H = 48;
    c.width = W * SCALE;
    c.height = H * SCALE;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const start = performance.now();
    // Draw a single static frame for users who asked the OS to reduce motion.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    // Confetti pre-seeded paths
    const confetti = Array.from({ length: 18 }, () => ({
      x: Math.random() * W,
      seed: Math.random() * Math.PI * 2,
      tone: Math.floor(Math.random() * 4),
      speed: 0.6 + Math.random() * 0.5,
      baseY: H + Math.random() * 20,
    }));
    const tones = ['#FFD23F', '#00D4FF', '#FF4D6D', '#7FE0A0'];

    const loop = (t: number) => {
      const dt = t - start;
      ctx.clearRect(0, 0, c.width, c.height);

      // Rising confetti
      for (const p of confetti) {
        const yLife = (dt * 0.03 * p.speed) % (H + 30);
        const py = p.baseY - yLife;
        const px = p.x + Math.sin(dt * 0.005 + p.seed) * 4;
        if (py < 0) continue;
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(dt * 0.008 + p.seed);
        ctx.fillStyle = tones[p.tone];
        ctx.fillRect(Math.floor(px) * SCALE, Math.floor(py) * SCALE, 2 * SCALE, 2 * SCALE);
      }
      ctx.globalAlpha = 1;

      // Floor line
      ctx.fillStyle = '#1A2D4F';
      ctx.fillRect(0, (H - 4) * SCALE, W * SCALE, 1 * SCALE);

      // Podium boxes — left silver(2), center gold(1), right bronze(3)
      const draw3DBox = (px: number, py: number, w: number, h: number, body: string, dark: string, light: string) => {
        ctx.fillStyle = body;
        ctx.fillRect(px * SCALE, py * SCALE, w * SCALE, h * SCALE);
        ctx.fillStyle = dark;
        ctx.fillRect(px * SCALE, (py + h - 1) * SCALE, w * SCALE, 1 * SCALE);
        ctx.fillRect((px + w - 1) * SCALE, py * SCALE, 1 * SCALE, h * SCALE);
        ctx.fillStyle = light;
        ctx.fillRect(px * SCALE, py * SCALE, w * SCALE, 1 * SCALE);
        ctx.fillRect(px * SCALE, py * SCALE, 1 * SCALE, h * SCALE);
        // Number nudge — engraved dot
        ctx.fillStyle = dark;
        ctx.fillRect((px + Math.floor(w / 2)) * SCALE, (py + Math.floor(h / 2)) * SCALE, 1 * SCALE, 1 * SCALE);
      };

      // Silver — rank 2, left
      draw3DBox(12, 30, 14, 14, '#C8D2E8', '#7E8AA8', '#EEF4FF');
      // Gold — rank 1, center, taller
      draw3DBox(33, 22, 14, 22, '#FFD23F', '#A06C00', '#FFE680');
      // Bronze — rank 3, right
      draw3DBox(54, 34, 14, 10, '#C8762E', '#6B3F12', '#F0A86A');

      // Tiny cube characters on each box (1st has bobbing crown)
      const drawCube = (cx: number, cy: number, b: string, d: string, h: string) => {
        ctx.fillStyle = b;
        ctx.fillRect(cx * SCALE, cy * SCALE, 6 * SCALE, 6 * SCALE);
        ctx.fillStyle = d;
        ctx.fillRect(cx * SCALE, (cy + 5) * SCALE, 6 * SCALE, 1 * SCALE);
        ctx.fillRect((cx + 5) * SCALE, cy * SCALE, 1 * SCALE, 6 * SCALE);
        ctx.fillStyle = h;
        ctx.fillRect(cx * SCALE, cy * SCALE, 6 * SCALE, 1 * SCALE);
        ctx.fillRect(cx * SCALE, cy * SCALE, 1 * SCALE, 6 * SCALE);
        // Eyes
        ctx.fillStyle = '#050a16';
        ctx.fillRect((cx + 2) * SCALE, (cy + 2) * SCALE, 1 * SCALE, 1 * SCALE);
        ctx.fillRect((cx + 4) * SCALE, (cy + 2) * SCALE, 1 * SCALE, 1 * SCALE);
      };

      const bob1 = Math.floor(Math.sin(dt * 0.005) * 1);
      drawCube(36, 15 + bob1, '#FFD23F', '#A06C00', '#FFE680');
      // Crown on gold
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(36 * SCALE, (12 + bob1) * SCALE, 6 * SCALE, 2 * SCALE);
      ctx.fillRect(36 * SCALE, (10 + bob1) * SCALE, 1 * SCALE, 2 * SCALE);
      ctx.fillRect(39 * SCALE, (10 + bob1) * SCALE, 1 * SCALE, 2 * SCALE);
      ctx.fillRect(41 * SCALE, (10 + bob1) * SCALE, 1 * SCALE, 2 * SCALE);
      // Gem on crown
      ctx.fillStyle = '#FF4D6D';
      ctx.fillRect(38 * SCALE, (11 + bob1) * SCALE, 2 * SCALE, 1 * SCALE);

      const bob2 = Math.floor(Math.sin(dt * 0.004 + 1) * 1);
      drawCube(16, 23 + bob2, '#0052FF', '#001F70', '#3D7BFF');

      const bob3 = Math.floor(Math.sin(dt * 0.0045 + 2) * 1);
      drawCube(58, 27 + bob3, '#00B040', '#005020', '#7FE0A0');

      // Spotlight cones — subtle vertical fades behind cubes
      const spotlight = (cx: number, color: string) => {
        ctx.globalAlpha = 0.10 + 0.04 * Math.sin(dt * 0.003);
        ctx.fillStyle = color;
        ctx.fillRect((cx - 4) * SCALE, 0, 12 * SCALE, H * SCALE);
        ctx.globalAlpha = 1;
      };
      spotlight(39, '#FFD23F');

      if (!reducedMotion) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        width: '100%',
        maxWidth: 320,
        imageRendering: 'pixelated',
      }}
    />
  );
}

export default function Leaderboard({ onBack }: Props) {
  const client = usePublicClient();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('score');
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const localBestScore = readLocalBestScore();
  const localBestTime = readLocalBestTime();

  useEffect(() => {
    if (!USE_CONTRACT || !client || DEPLOY_BLOCK === 0n) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const latest = await client.getBlockNumber();
        const cached = readLbCache();
        const from = cached ? cached.fromBlock : DEPLOY_BLOCK;
        const { logs, complete } = await fetchAllLogs(client as PublicClient, latest, from);
        const best = cached ? cached.entries : new Map<string, Entry>();
        for (const l of logs) {
          const a = (l as { args?: { player?: string; score?: bigint; timeMs?: bigint; levelsCleared?: number } }).args;
          if (!a || typeof a.player !== 'string' || typeof a.score !== 'bigint' || typeof a.timeMs !== 'bigint') continue;
          const key = a.player.toLowerCase();
          const s = Number(a.score);
          const t = Number(a.timeMs);
          const lvl = Number(a.levelsCleared ?? 0);
          const cur = best.get(key);
          const isFullClear = lvl >= 16;
          const newEntry: Entry = cur ?? { player: a.player as `0x${string}`, bestScore: 0, bestTime: 0 };
          if (s > newEntry.bestScore) newEntry.bestScore = s;
          if (isFullClear && (newEntry.bestTime === 0 || t < newEntry.bestTime)) newEntry.bestTime = t;
          best.set(key, newEntry);
        }
        const list = Array.from(best.values());
        if (complete) writeLbCache(latest, list);
        if (!cancelled) setEntries(list);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'rpc failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [client]);

  // Lazy-load daily leaderboard the first time the user opens that tab.
  useEffect(() => {
    if (tab !== 'daily') return;
    if (!USE_DAILY || !client || DAILY_DEPLOY_BLOCK === 0n) return;
    if (dailyEntries.length > 0) return;   // already loaded this session
    let cancelled = false;
    (async () => {
      setDailyLoading(true);
      try {
        const latest = await client.getBlockNumber();
        const logs = await fetchDailyLogs(client as PublicClient, latest, todayDayKey());
        const best = new Map<string, DailyEntry>();
        for (const l of logs) {
          const a = (l as { args?: { player?: string; score?: bigint } }).args;
          if (!a || typeof a.player !== 'string' || typeof a.score !== 'bigint') continue;
          const s = Number(a.score);
          if (s <= 1) continue;            // skip check-in stamps (score=0 or 1)
          const key = a.player.toLowerCase();
          const cur = best.get(key);
          if (!cur || s > cur.bestScore) best.set(key, { player: a.player as `0x${string}`, bestScore: s });
        }
        if (!cancelled) setDailyEntries(Array.from(best.values()));
      } catch {
        // silently fail — show empty list
      } finally {
        if (!cancelled) setDailyLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, client, dailyEntries.length]);

  const onchainReady = USE_CONTRACT && DEPLOY_BLOCK > 0n;
  const dailyReady = USE_DAILY && DAILY_DEPLOY_BLOCK > 0n;

  const sorted = tab === 'score'
    ? [...entries].sort((a, b) => b.bestScore - a.bestScore).slice(0, TOP_N)
    : tab === 'time'
      ? [...entries].filter((e) => e.bestTime > 0).sort((a, b) => a.bestTime - b.bestTime).slice(0, TOP_N)
      : [];
  const sortedDaily = [...dailyEntries].sort((a, b) => b.bestScore - a.bestScore).slice(0, TOP_N);

  const tabBtn = (active: boolean): React.CSSProperties => ({
    background: active ? 'var(--base-blue)' : 'transparent',
    border: '2px solid var(--base-ivory)',
    color: active ? 'var(--base-ivory)' : 'var(--base-mute)',
    fontSize: 10,
    letterSpacing: '0.22em',
    padding: '8px 14px',
    minHeight: 36,
    flex: 1,
  });

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--bg-deep)' }}>
      <div className="flex items-center justify-between px-4 pt-4 safe-pad-top">
        <button onClick={onBack} className="font-pix" style={{ background: 'transparent', border: '2px solid var(--base-ivory)', color: 'var(--base-ivory)', fontSize: 10, padding: '8px 12px', minHeight: 38 }}>
          ← BACK
        </button>
        <div className="font-pix" style={{ color: 'var(--base-cyan)', fontSize: 18, letterSpacing: '0.18em' }}>
          LEADERBOARD
        </div>
        <div style={{ width: 78 }} />
      </div>

      <div className="px-4 mt-3 flex gap-2">
        <button onClick={() => setTab('score')} className="font-pix" style={tabBtn(tab === 'score')}>SCORE</button>
        <button onClick={() => setTab('time')} className="font-pix" style={tabBtn(tab === 'time')}>TIME</button>
        <button onClick={() => setTab('daily')} className="font-pix" style={tabBtn(tab === 'daily')}>DAILY</button>
      </div>

      <div className="px-4 mt-3">
        <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 9, letterSpacing: '0.22em' }}>
          {tab === 'score' ? (
            <>YOUR BEST · <span style={{ color: 'var(--gold)' }}>{String(localBestScore).padStart(6, '0')}</span></>
          ) : tab === 'time' ? (
            <>YOUR BEST · <span style={{ color: 'var(--base-cyan)' }}>{formatTime(localBestTime)}</span></>
          ) : (
            <>TODAY ONCHAIN · <span style={{ color: 'var(--gold)' }}>RESETS AT 00:00 UTC</span></>
          )}
        </div>
        <div style={{ borderTop: '2px solid var(--base-blue)', marginTop: 8 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 safe-pad-bot" style={{ touchAction: 'pan-y' }}>
        <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 8, letterSpacing: '0.22em', display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={{ width: 28 }}>RK</span>
          <span style={{ flex: 1 }}>ADDRESS</span>
          <span style={{ width: 80, textAlign: 'right' }}>{tab === 'time' ? 'TIME' : 'SCORE'}</span>
        </div>

        {tab === 'daily' ? (
          // ─── DAILY LEADERBOARD ────────────────────────────────────────────
          !dailyReady ? (
            <div className="font-pix text-center mt-12" style={{ color: 'var(--base-mute)', fontSize: 11 }}>
              DAILY CHAIN NOT WIRED
            </div>
          ) : dailyLoading ? (
            <div className="font-pix text-center mt-12" style={{ color: 'var(--base-mute)', fontSize: 11 }}>READING CHAIN…</div>
          ) : sortedDaily.length === 0 ? (
            <div className="font-pix text-center mt-12" style={{ color: 'var(--base-mute)', fontSize: 11, letterSpacing: '0.18em', lineHeight: 1.8 }}>
              NOBODY POSTED A DAILY YET<br />
              <span style={{ color: 'var(--base-mute)', fontSize: 9 }}>be the first today</span>
            </div>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {sortedDaily.map((it, i) => {
                const isTop3 = i < 3;
                return (
                  <li key={it.player} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(79,90,117,0.35)' }}>
                    <span className="font-pix" style={{ color: isTop3 ? 'var(--base-cyan)' : 'var(--base-mute)', fontSize: 10, width: 28 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-pix" style={{ color: 'var(--base-ivory)', fontSize: 9, flex: 1, opacity: 0.85, letterSpacing: '0.04em' }}>
                      {short(it.player)}
                    </span>
                    <span className="font-pix" style={{ color: isTop3 ? 'var(--gold)' : 'var(--base-ivory)', fontSize: 11, width: 80, textAlign: 'right' }}>
                      {String(it.bestScore).padStart(6, '0')}
                    </span>
                  </li>
                );
              })}
            </ol>
          )
        ) : !onchainReady ? (
          <div className="font-pix text-center mt-12" style={{ color: 'var(--base-mute)', fontSize: 11, letterSpacing: '0.18em', lineHeight: 1.8 }}>
            CHAIN NOT WIRED YET<br />
            <span style={{ color: 'var(--base-mute)', fontSize: 9 }}>local best shown above</span>
          </div>
        ) : loading ? (
          <div className="font-pix text-center mt-12" style={{ color: 'var(--base-mute)', fontSize: 11 }}>READING CHAIN…</div>
        ) : err ? (
          <div className="font-pix text-center mt-12" style={{ color: 'var(--warn)', fontSize: 11 }}>CHAIN UNREACHABLE</div>
        ) : sorted.length === 0 ? (
          <div className="font-pix text-center mt-12" style={{ color: 'var(--base-mute)', fontSize: 11, letterSpacing: '0.16em', lineHeight: 1.9 }}>
            BE THE FIRST 🔵<br />
            <span style={{ fontSize: 9 }}>
              {tab === 'time' ? 'clear the game, sign your time onchain' : 'beat a level, connect wallet, sign onchain'}
            </span>
          </div>
        ) : (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {sorted.map((it, i) => {
              const isTop3 = i < 3;
              return (
                <li key={it.player} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(79,90,117,0.35)' }}>
                  <span className="font-pix" style={{ color: isTop3 ? 'var(--base-cyan)' : 'var(--base-mute)', fontSize: 10, width: 28 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-pix" style={{ color: 'var(--base-ivory)', fontSize: 9, flex: 1, opacity: 0.85, letterSpacing: '0.04em' }}>
                    {short(it.player)}
                  </span>
                  <span className="font-pix" style={{ color: isTop3 ? 'var(--gold)' : 'var(--base-ivory)', fontSize: 11, width: 80, textAlign: 'right' }}>
                    {tab === 'score'
                      ? String(it.bestScore).padStart(6, '0')
                      : formatTime(it.bestTime)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {/* Podium banner — visible at the bottom regardless of list state */}
        <div className="flex flex-col items-center mt-6 mb-2 gap-2">
          <Podium />
          <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 8, letterSpacing: '0.22em', textAlign: 'center', lineHeight: 1.7 }}>
            TOP 3 EACH WEEK · ON BASE MAINNET<br />
            BEAT THE GAME · CLAIM YOUR CUBE
          </div>
        </div>
      </div>
    </div>
  );
}
