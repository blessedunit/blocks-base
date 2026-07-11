import { useEffect, useState } from 'react';
import { LEVELS } from '../game/world';
import { useUnlock } from '../hooks/useChainStatus';

// Legacy localStorage flag kept for compat — full onchain-verified unlock now
// lives in useUnlock() (RunRecorded event with levelsCleared >= 16).
const LS_UNLOCKED = 'blocks:unlocked';
export function setLevelsUnlocked() {
  try { localStorage.setItem(LS_UNLOCKED, '1'); } catch { /* noop */ }
}

// Per-level progressive unlocks. Clearing level N marks N as cleared and
// implicitly unlocks N+1, so the player can re-enter any stage they've beaten
// without needing the full-game onchain proof.
const LS_CLEARED_LEVELS = 'blocks:clearedLevels';

function loadClearedLevels(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_CLEARED_LEVELS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch { return new Set(); }
}

export function markLevelCleared(idx: number) {
  try {
    const cur = loadClearedLevels();
    cur.add(idx);
    localStorage.setItem(LS_CLEARED_LEVELS, JSON.stringify(Array.from(cur)));
  } catch { /* noop */ }
}

export function isLevelUnlockedLocal(idx: number): boolean {
  if (idx === 0) return true;
  return loadClearedLevels().has(idx - 1);
}

// Per-level personal best — keyed by level index. Highest score posted while
// clearing that level (we capture the live score at clear time).
const LS_LEVEL_BEST = 'blocks:levelBest';

function loadLevelBests(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LS_LEVEL_BEST);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function recordLevelBest(idx: number, score: number) {
  try {
    const all = loadLevelBests();
    if (!all[idx] || score > all[idx]) {
      all[idx] = score;
      localStorage.setItem(LS_LEVEL_BEST, JSON.stringify(all));
    }
  } catch { /* noop */ }
}

export function getLevelBest(idx: number): number {
  return loadLevelBests()[idx] ?? 0;
}

interface Props {
  onPick: (levelIndex: number) => void;
  onBack: () => void;
}

function themeColors(theme: string): { bg: string; border: string; accent: string } {
  if (theme === 'overworld') return { bg: '#0040C0', border: '#00D4FF', accent: '#FFD23F' };
  if (theme === 'underground') return { bg: '#0A2A70', border: '#00D4FF', accent: '#FFB300' };
  if (theme === 'sky') return { bg: '#3D7BFF', border: '#EEF4FF', accent: '#00D4FF' };
  return { bg: '#3F0F1A', border: '#FF4500', accent: '#FFD23F' };
}

export default function LevelSelectScreen({ onPick, onBack }: Props) {
  const { unlocked: unlockedAll } = useUnlock();
  // Read cleared-set + per-level bests into state so re-renders pick up updates.
  const [cleared, setCleared] = useState<Set<number>>(() => loadClearedLevels());
  const [bests, setBests] = useState<Record<string, number>>(() => loadLevelBests());
  useEffect(() => {
    setCleared(loadClearedLevels());
    setBests(loadLevelBests());
  }, []);

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
          LEVELS
        </div>
        <div style={{ width: 78 }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 safe-pad-bot" style={{ touchAction: 'pan-y' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          {LEVELS.map((lv, i) => {
            const colors = themeColors(lv.theme);
            const world = Math.floor(i / 4) + 1;
            const num = (i % 4) + 1;
            const isCleared = cleared.has(i);
            // Unlocked if: full onchain proof done, OR it's the very first level,
            // OR the previous level has been cleared.
            const isUnlocked = unlockedAll || i === 0 || cleared.has(i - 1);
            const locked = !isUnlocked;
            return (
              <button
                key={i}
                onClick={() => { if (!locked) onPick(i); }}
                disabled={locked}
                className="font-pix"
                style={{
                  background: locked ? '#1A2D4F' : colors.bg,
                  border: `3px solid ${locked ? '#4F5A75' : isCleared ? '#28B850' : colors.border}`,
                  color: 'var(--base-ivory)',
                  padding: '14px 10px',
                  minHeight: 96,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  touchAction: 'manipulation',
                  textAlign: 'center',
                  boxShadow: `inset 0 -4px 0 0 rgba(0,0,0,0.35)`,
                  opacity: locked ? 0.55 : 1,
                  position: 'relative',
                }}
              >
                {locked ? (
                  <>
                    <div style={{ fontSize: 26, color: '#4F5A75' }}>🔒</div>
                    <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#4F5A75' }}>
                      {world}-{num}
                    </div>
                  </>
                ) : (
                  <>
                    {isCleared && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 6,
                          color: '#28B850',
                          fontSize: 10,
                          letterSpacing: '0.06em',
                        }}
                      >
                        ✓
                      </div>
                    )}
                    <div style={{ fontSize: 22, letterSpacing: '0.06em', color: colors.accent }}>
                      {world}-{num}
                    </div>
                    <div style={{ fontSize: 9, letterSpacing: '0.10em', opacity: 0.92 }}>
                      {lv.name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 7, opacity: 0.6, letterSpacing: '0.12em' }}>
                      {lv.theme.toUpperCase()}
                    </div>
                    {bests[i] > 0 && (
                      <div
                        style={{
                          fontSize: 8,
                          letterSpacing: '0.14em',
                          color: 'var(--gold)',
                          marginTop: 2,
                        }}
                      >
                        BEST · {String(bests[i]).padStart(6, '0')}
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
