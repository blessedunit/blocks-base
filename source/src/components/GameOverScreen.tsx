import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import {
  useSmartTransaction,
  readLocalBestScore,
  readLocalBestTime,
} from '../hooks/useSmartTransaction';
import { useUnlock } from '../hooks/useChainStatus';
import { USE_CONTRACT } from '../config/contract';
import { drawSprite, QUEEN, PLAYER_S_IDLE } from '../game/sprites';

interface Props {
  score: number;
  reachedLevel: number;
  runTimeMs: number;
  completed?: boolean;     // true if reached the end (axe trigger)
  onReplay: () => void;
  onMenu: () => void;
  onLeaderboard: () => void;
}

function formatTime(ms: number): string {
  const totalCs = Math.floor(ms / 10); // centiseconds
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export default function GameOverScreen({ score, reachedLevel, runTimeMs, completed, onReplay, onMenu, onLeaderboard }: Props) {
  const { isConnected } = useAccount();
  const { status, recordRun } = useSmartTransaction();
  const { refresh: refreshUnlock } = useUnlock();
  const [bestScore, setBestScore] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const autoFiredRef = useRef(false);
  const queenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const levelsCleared = completed ? 16 : reachedLevel;

  useEffect(() => {
    setBestScore(readLocalBestScore());
    setBestTime(readLocalBestTime());
  }, [score, status]);

  // Queen rescue scene — only when completed (won the game)
  useEffect(() => {
    if (!completed) return;
    const c = queenCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 4;
    c.width = 40 * SCALE;
    c.height = 24 * SCALE;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      ctx.clearRect(0, 0, c.width, c.height);
      // Background glow
      ctx.fillStyle = 'rgba(0, 212, 255, 0.10)';
      ctx.fillRect(0, 0, c.width, c.height);
      // Sparkle dots animated
      for (let i = 0; i < 8; i++) {
        const x = (i * 23 + Math.sin(dt * 0.002 + i) * 6) % (c.width);
        const y = (i * 11 + Math.cos(dt * 0.003 + i) * 4) % (c.height - 8);
        ctx.fillStyle = i % 2 === 0 ? '#FFD23F' : '#00D4FF';
        ctx.globalAlpha = 0.45 + 0.45 * Math.sin(dt * 0.004 + i);
        ctx.fillRect(x, y, 2 * SCALE, 2 * SCALE);
      }
      ctx.globalAlpha = 1;
      // Player on left, Queen on right (facing each other), gently bobbing
      const bob = Math.sin(dt * 0.003) * 3;
      drawSprite(ctx, PLAYER_S_IDLE, 3 * SCALE, (8 + bob) * SCALE, SCALE);
      drawSprite(ctx, QUEEN, 22 * SCALE, (0 + bob) * SCALE, SCALE);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [completed]);

  useEffect(() => {
    if (autoFiredRef.current) return;
    if (score <= 0) return;
    if (!USE_CONTRACT || !isConnected) return;
    autoFiredRef.current = true;
    void recordRun(score, runTimeMs, levelsCleared).then((res) => {
      if (res.ok && levelsCleared >= 16) void refreshUnlock();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const onSign = () => {
    void recordRun(score, runTimeMs, levelsCleared).then((res) => {
      if (res.ok && levelsCleared >= 16) void refreshUnlock();
    });
  };
  const buttonLabel =
    status === 'pending' ? 'WRITING…' :
    status === 'success' ? 'WRITTEN' :
    status === 'simulated' ? 'SAVED' :
    status === 'error' ? 'RETRY' :
    'WRITE TO CHAIN';

  const headline = completed ? 'QUEEN FOUND' : 'GAME OVER';
  const headlineColor = completed ? 'var(--gold)' : 'var(--warn)';
  const shadowColor = completed ? '#7a5a00' : '#6b0d24';
  const worldNum = Math.floor(reachedLevel / 4) + 1;
  const stageNum = (reachedLevel % 4) + 1;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div
        className="font-pix"
        style={{
          fontSize: 'clamp(30px, 9vw, 64px)',
          color: headlineColor,
          letterSpacing: '0.04em',
          textShadow: `4px 4px 0 ${shadowColor}`,
          lineHeight: 1,
        }}
      >
        {headline}
      </div>

      {completed && (
        <canvas
          ref={queenCanvasRef}
          className="mt-3"
          style={{
            width: 'min(280px, 70vw)',
            height: 'min(168px, 42vw)',
            imageRendering: 'pixelated',
          }}
        />
      )}

      <div
        className="font-pix mt-3"
        style={{ color: 'var(--base-cyan)', fontSize: 10, letterSpacing: '0.22em' }}
      >
        {completed
          ? 'KEEP STORMED · QUEEN OF BASE SAVED'
          : `REACHED LEVEL ${worldNum}-${stageNum}`}
      </div>

      <div className="mt-6 flex flex-col items-center gap-1">
        <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 10, letterSpacing: '0.22em' }}>
          SCORE
        </div>
        <div className="font-pix" style={{ color: 'var(--gold)', fontSize: 'min(11vw, 9vh)', lineHeight: 1, marginTop: 4 }}>
          {String(score).padStart(6, '0')}
        </div>
        <div className="font-pix mt-1" style={{ color: 'var(--base-mute)', fontSize: 9, letterSpacing: '0.22em' }}>
          BEST · <span style={{ color: 'var(--base-ivory)' }}>{String(bestScore).padStart(6, '0')}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-1">
        <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 10, letterSpacing: '0.22em' }}>
          TIME
        </div>
        <div className="font-pix" style={{ color: 'var(--base-cyan)', fontSize: 'min(9vw, 7vh)', lineHeight: 1 }}>
          {formatTime(runTimeMs)}
        </div>
        {completed && bestTime > 0 && (
          <div className="font-pix mt-1" style={{ color: 'var(--base-mute)', fontSize: 9, letterSpacing: '0.22em' }}>
            BEST · <span style={{ color: 'var(--base-ivory)' }}>{formatTime(bestTime)}</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-[280px]">
        <button onClick={onReplay} className="pixel-btn w-full" style={{ fontSize: 14 }}>
          PLAY AGAIN
        </button>

        {USE_CONTRACT && !isConnected ? (
          <ConnectKitButton.Custom>
            {({ show }) => (
              <button onClick={show} className="pixel-btn pixel-btn-secondary w-full" style={{ fontSize: 11 }}>
                CONNECT TO WRITE
              </button>
            )}
          </ConnectKitButton.Custom>
        ) : (
          <button
            onClick={onSign}
            disabled={status === 'pending' || status === 'success'}
            className="pixel-btn pixel-btn-secondary w-full"
            style={{ fontSize: 11, opacity: status === 'success' ? 0.6 : 1 }}
          >
            {buttonLabel}
          </button>
        )}

        <button onClick={onLeaderboard} className="font-pix" style={{ background: 'transparent', border: 'none', color: 'var(--base-mute)', fontSize: 9, letterSpacing: '0.22em', padding: '8px 6px', minHeight: 36 }}>
          VIEW LEADERBOARD
        </button>
        <button onClick={onMenu} className="font-pix" style={{ background: 'transparent', border: 'none', color: 'var(--base-mute)', fontSize: 9, letterSpacing: '0.22em', padding: '8px 6px', minHeight: 36 }}>
          MAIN MENU
        </button>
      </div>
    </div>
  );
}
