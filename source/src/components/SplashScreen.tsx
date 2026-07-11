import { useEffect } from 'react';
import { drawSprite, PLAYER_S_IDLE } from '../game/sprites';

interface Props {
  onDone: () => void;
}

// Splash timing — every animation step is paced to the full duration so nothing
// finishes early and leaves a flat 'waiting' frame before the menu mounts.
const DURATION_MS = 3600;

export default function SplashScreen({ onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  // Animated cube that slides in near the end of the splash. Pure canvas so the
  // pixel art stays crisp.
  useEffect(() => {
    const c = document.getElementById('splash-cube') as HTMLCanvasElement | null;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 6;
    c.width = 14 * SCALE;
    c.height = 16 * SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(SCALE, SCALE);
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      ctx.clearRect(0, 0, 14, 16);
      // Bobbing in place
      const bob = Math.sin(dt * 0.004) * 0.6;
      drawSprite(ctx, PLAYER_S_IDLE, 1, bob, 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: '#050a16', cursor: 'pointer' }}
      onClick={onDone}
    >
      <style>{`
        /* Letters reveal one row at a time over the whole splash duration. */
        @keyframes splash-4ngel {
          0%   { opacity: 0; transform: translateY(-14px) scale(0.92); }
          18%  { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splash-games {
          0%, 18% { opacity: 0; transform: translateY(14px) scale(0.92); }
          36%     { opacity: 1; transform: translateY(0) scale(1); }
          100%    { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Underline fills progressively across the whole splash, not in a burst. */
        @keyframes splash-underline-fill {
          0%, 36% { transform: scaleX(0); }
          80%     { transform: scaleX(1); }
          100%    { transform: scaleX(1); }
        }
        /* Cube slides up from below and settles into place near the end. */
        @keyframes splash-cube-rise {
          0%, 78% { opacity: 0; transform: translateY(40px) scale(0.8); }
          90%     { opacity: 1; transform: translateY(-6px) scale(1.08); }
          100%    { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Sparkles bursting from the cube when it lands. */
        @keyframes splash-sparkle {
          0%, 84%  { opacity: 0; transform: scale(0.4); }
          90%      { opacity: 1; transform: scale(1.1); }
          100%     { opacity: 0; transform: scale(1.4); }
        }
      `}</style>

      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div
          className="font-pix"
          style={{
            fontSize: 'clamp(28px, 7vw, 64px)',
            color: '#EEF4FF',
            letterSpacing: '0.18em',
            textShadow: '4px 4px 0 #0052FF',
            lineHeight: 1,
            animation: `splash-4ngel ${DURATION_MS}ms ease-out forwards`,
          }}
        >
          4NGEL
        </div>
        <div
          className="font-pix"
          style={{
            fontSize: 'clamp(18px, 4vw, 36px)',
            color: '#00D4FF',
            letterSpacing: '0.32em',
            marginTop: 18,
            lineHeight: 1,
            animation: `splash-games ${DURATION_MS}ms ease-out forwards`,
          }}
        >
          GAMES
        </div>
        <div
          style={{
            height: 3,
            width: 220,
            margin: '22px auto 0',
            background: '#0052FF',
            transformOrigin: 'left',
            transform: 'scaleX(0)',
            animation: `splash-underline-fill ${DURATION_MS}ms ease-out forwards`,
          }}
        />

        {/* Cube character — appears near the end with a rise + sparkle */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            opacity: 0,
            animation: `splash-cube-rise ${DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
          }}
        >
          <canvas
            id="splash-cube"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Sparkle ring around cube on landing */}
          <div
            style={{
              position: 'absolute',
              inset: -20,
              pointerEvents: 'none',
              opacity: 0,
              animation: `splash-sparkle ${DURATION_MS}ms ease-out forwards`,
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const angle = (i / 8) * Math.PI * 2;
              const r = 60;
              const cx = 50 + Math.cos(angle) * r;
              const cy = 50 + Math.sin(angle) * r;
              const tones = ['#FFD23F', '#00D4FF', '#FF4D6D', '#7FE0A0'];
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${cx}%`,
                    top: `${cy}%`,
                    width: 6,
                    height: 6,
                    background: tones[i % 4],
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
