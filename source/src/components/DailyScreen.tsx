import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { LEVELS } from '../game/world';
import { useDailyRecord } from '../hooks/useSmartTransaction';
import { useStreak, streakBonusPct } from '../hooks/useChainStatus';
import {
  SKINS,
  STREAK_MASK_ID,
  STREAK_MASK_REQUIRED,
  formatMaskTimeLeft,
  isMaskEventOpen,
  setEquippedSkinId,
} from '../game/skins';
import { drawSprite, PLAYER_S_IDLE } from '../game/sprites';
import { readLocalOwnedSkins } from '../hooks/useSmartTransaction';

interface Props {
  onBack: () => void;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyLevelIndex(): number {
  return hashStr(todayKey()) % LEVELS.length;
}

const LS_DAILY = 'blocks:daily';
const LS_OWNED_SKINS = 'blocks:ownedSkins';

interface DailyState {
  date: string;
  claimedRun: boolean;
  bestScore: number;
}

function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(LS_DAILY);
    if (raw) {
      const obj = JSON.parse(raw) as DailyState;
      if (obj.date === todayKey()) return obj;
    }
  } catch { /* noop */ }
  return { date: todayKey(), claimedRun: false, bestScore: 0 };
}

// Animated red-white mask cube preview for the promo banner.
function MaskPreview({ size = 96 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const palette = SKINS.find((s) => s.id === STREAK_MASK_ID)?.palette ?? {};
    const SCALE = Math.floor(size / 14);
    c.width = 12 * SCALE;
    c.height = 14 * SCALE;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      const bob = Math.sin(dt * 0.003) * 2;
      ctx.clearRect(0, 0, c.width, c.height);
      // Glow halo
      ctx.globalAlpha = 0.18 + 0.10 * Math.sin(dt * 0.005);
      ctx.fillStyle = '#FF4D6D';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalAlpha = 1;
      drawSprite(ctx, PLAYER_S_IDLE, 0, bob * SCALE, SCALE, false, palette);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return (
    <canvas
      ref={ref}
      style={{
        width: size, height: Math.floor(size * 14 / 12),
        imageRendering: 'pixelated',
      }}
    />
  );
}

export default function DailyScreen({ onBack }: Props) {
  const { isConnected } = useAccount();
  const { streak, checkedInToday, loading: streakLoading, refresh: refreshStreak, markCheckedIn } = useStreak();
  const { recordDaily, status: dailyStatus } = useDailyRecord();
  const [checkingIn, setCheckingIn] = useState(false);
  const [owned, setOwned] = useState<Set<number>>(() => new Set(readLocalOwnedSkins()));
  // Re-tick every 60s so the mask-event countdown updates without flooding renders.
  const [, setNowTick] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const onCheckIn = async () => {
    if (!isConnected || checkedInToday || checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await recordDaily(0, 0, false);
      if (res.ok) {
        markCheckedIn();
        void refreshStreak();
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const claimMask = () => {
    setOwned((prev) => {
      const next = new Set(prev);
      next.add(STREAK_MASK_ID);
      try { localStorage.setItem(LS_OWNED_SKINS, JSON.stringify(Array.from(next))); } catch { /* noop */ }
      return next;
    });
    setEquippedSkinId(STREAK_MASK_ID);
  };

  const projectedStreak = checkedInToday ? streak : streak + 1;
  const bonusPct = streakBonusPct(projectedStreak);

  const maskOpen = isMaskEventOpen();
  const maskTimeLeft = formatMaskTimeLeft();
  const ownsMask = owned.has(STREAK_MASK_ID);
  const maskEligible = streak >= STREAK_MASK_REQUIRED;
  const daysToMask = Math.max(0, STREAK_MASK_REQUIRED - streak);

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: 'var(--bg-deep)' }}>
      <div className="flex items-center justify-between px-4 pt-4 safe-pad-top">
        <button
          onClick={onBack}
          className="font-pix"
          style={{
            background: 'transparent',
            border: '2px solid var(--base-ivory)',
            color: 'var(--base-ivory)',
            fontSize: 10,
            padding: '8px 12px',
            minHeight: 38,
          }}
        >
          ← BACK
        </button>
        <div className="font-pix" style={{ color: 'var(--base-cyan)', fontSize: 16, letterSpacing: '0.18em' }}>
          DAILY
        </div>
        <div style={{ width: 78 }}>
          {!isConnected && (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  onClick={show}
                  className="font-pix"
                  style={{
                    background: 'transparent',
                    border: '2px solid var(--base-cyan)',
                    color: 'var(--base-cyan)',
                    fontSize: 8,
                    padding: '6px 8px',
                    minHeight: 30,
                    width: '100%',
                  }}
                >
                  CONNECT
                </button>
              )}
            </ConnectKitButton.Custom>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 safe-pad-bot flex flex-col items-center" style={{ touchAction: 'pan-y' }}>
        {/* ── Streak Mask promo banner — bright top block ──────────────── */}
        {(maskOpen || ownsMask) && (
          <div
            style={{
              maxWidth: 380,
              width: '100%',
              padding: '14px 16px',
              background:
                'linear-gradient(135deg, rgba(255,77,109,0.30) 0%, rgba(238,244,255,0.10) 50%, rgba(255,77,109,0.30) 100%)',
              border: '3px solid #FF4D6D',
              boxShadow: '0 0 24px rgba(255,77,109,0.45), inset 0 -5px 0 rgba(161,29,58,0.50)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
              position: 'relative',
            }}
          >
            <div
              className="font-pix"
              style={{
                color: '#FFFFFF',
                fontSize: 11,
                letterSpacing: '0.28em',
                textShadow: '2px 2px 0 #A11D3A',
              }}
            >
              ★ LIMITED EVENT ★
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <MaskPreview size={86} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
                <div
                  className="font-pix"
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    letterSpacing: '0.10em',
                    textShadow: '2px 2px 0 #A11D3A',
                  }}
                >
                  STREAK MASK
                </div>
                <div className="font-pix" style={{ color: '#FFB0BC', fontSize: 8, letterSpacing: '0.16em' }}>
                  UNLOCK · {STREAK_MASK_REQUIRED}-DAY STREAK
                </div>
                <div className="font-pix" style={{ color: '#FFD23F', fontSize: 11, letterSpacing: '0.08em', marginTop: 2 }}>
                  ENDS IN {maskTimeLeft}
                </div>
              </div>
            </div>

            {/* Progress bar — current streak vs required */}
            <div
              style={{
                width: '100%',
                height: 8,
                background: 'rgba(5,10,22,0.55)',
                border: '1px solid rgba(238,244,255,0.40)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, (streak / STREAK_MASK_REQUIRED) * 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #FF4D6D, #FFFFFF, #FF4D6D)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>

            {ownsMask ? (
              <button
                type="button"
                onClick={claimMask}
                className="font-pix"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '2px solid #FFFFFF',
                  color: '#FFFFFF',
                  padding: '12px 10px',
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  touchAction: 'manipulation',
                }}
              >
                ✓ EQUIP STREAK MASK
              </button>
            ) : maskEligible && maskOpen ? (
              <button
                type="button"
                onClick={claimMask}
                className="font-pix"
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: '3px solid #A11D3A',
                  color: '#A11D3A',
                  padding: '14px 10px',
                  fontSize: 12,
                  letterSpacing: '0.18em',
                  boxShadow: 'inset 0 -4px 0 rgba(161,29,58,0.40)',
                  touchAction: 'manipulation',
                }}
              >
                CLAIM MASK NOW
              </button>
            ) : maskOpen ? (
              <div
                className="font-pix"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  background: 'rgba(5,10,22,0.55)',
                  border: '2px dashed rgba(255,176,188,0.55)',
                  color: '#FFB0BC',
                  padding: '12px 10px',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                }}
              >
                {daysToMask} MORE DAY{daysToMask === 1 ? '' : 'S'} · {streak}/{STREAK_MASK_REQUIRED}
              </div>
            ) : (
              <div className="font-pix" style={{ color: '#FFB0BC', fontSize: 10, letterSpacing: '0.18em' }}>
                EVENT CLOSED
              </div>
            )}
          </div>
        )}

        {/* ── Streak strip ───────────────────────────────────────────── */}
        <div
          style={{
            background: '#0a1428',
            border: '3px solid #FF7A00',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            maxWidth: 380,
            width: '100%',
            boxShadow: 'inset 0 -4px 0 0 rgba(0,0,0,0.4)',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>🔥</div>
            <div>
              <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 7, letterSpacing: '0.20em' }}>
                STREAK
              </div>
              <div className="font-pix" style={{ color: '#FF7A00', fontSize: 24, lineHeight: 1.1, letterSpacing: '0.04em' }}>
                {streakLoading && !streak ? '…' : `${streak} DAY${streak === 1 ? '' : 'S'}`}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 7, letterSpacing: '0.20em' }}>
              NEXT RUN
            </div>
            <div className="font-pix" style={{ color: '#FFD23F', fontSize: 15, letterSpacing: '0.06em' }}>
              +{bonusPct}% SCORE
            </div>
          </div>
        </div>

        {/* ── Check-in button ──────────────────────────────────────── */}
        <div style={{ maxWidth: 380, width: '100%' }}>
          {!isConnected ? (
            <ConnectKitButton.Custom>
              {({ show }) => (
                <button
                  type="button"
                  onClick={show}
                  className="font-pix"
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '3px solid var(--base-cyan)',
                    color: 'var(--base-cyan)',
                    padding: '18px 12px',
                    fontSize: 12,
                    letterSpacing: '0.16em',
                    touchAction: 'manipulation',
                  }}
                >
                  CONNECT WALLET TO CLAIM
                </button>
              )}
            </ConnectKitButton.Custom>
          ) : checkedInToday ? (
            <button
              type="button"
              disabled
              className="font-pix"
              style={{
                width: '100%',
                background: '#28B850',
                border: '3px solid #7FE0A0',
                color: '#050a16',
                padding: '18px 12px',
                fontSize: 12,
                letterSpacing: '0.16em',
                boxShadow: '0 0 18px rgba(61,214,104,0.65), inset 0 -4px 0 rgba(0,0,0,0.25)',
                cursor: 'not-allowed',
              }}
            >
              ✓ CHECKED IN TODAY
            </button>
          ) : (
            <button
              type="button"
              onClick={onCheckIn}
              disabled={checkingIn || dailyStatus === 'pending'}
              className="font-pix"
              style={{
                width: '100%',
                background: '#FF7A00',
                border: '3px solid #FFD23F',
                color: '#050a16',
                padding: '18px 12px',
                fontSize: 12,
                letterSpacing: '0.16em',
                boxShadow: 'inset 0 -4px 0 0 rgba(0,0,0,0.3)',
                cursor: checkingIn ? 'wait' : 'pointer',
                opacity: checkingIn ? 0.7 : 1,
                touchAction: 'manipulation',
              }}
            >
              {checkingIn || dailyStatus === 'pending' ? 'SIGNING…' : 'CHECK IN'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function markDailyClear(score: number) {
  try {
    const cur = loadDaily();
    const next: DailyState = {
      date: todayKey(),
      claimedRun: true,
      bestScore: Math.max(cur.bestScore, score),
    };
    localStorage.setItem(LS_DAILY, JSON.stringify(next));
  } catch { /* noop */ }
}
