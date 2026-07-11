import { useEffect, useRef, useState } from 'react';
import { drawSprite, PLAYER_S_IDLE, GOOMBA_A, COIN_A } from '../game/sprites';

interface Props {
  onEnter: () => void;
  onBack: () => void;
}

interface Page {
  title: string;
  body: string;
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
}

const PAGES: Page[] = [
  {
    title: 'BORN ON 8453',
    body:
      'On chain 8453 a block ships every two seconds.\nMost stay still — square, signed, content.\n\nOne of them woke up.',
    paint: (ctx, w, h, t) => {
      ctx.fillStyle = '#050a16';
      ctx.fillRect(0, 0, w, h);
      // stars
      for (let i = 0; i < 60; i++) {
        const x = (i * 73) % w;
        const y = (i * 137) % (h - 60);
        const a = 0.35 + 0.45 * Math.sin(t * 0.002 + i);
        ctx.globalAlpha = Math.max(0.15, Math.min(1, a));
        ctx.fillStyle = i % 3 === 0 ? '#00D4FF' : '#EEF4FF';
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
      // Row of sleeping cubes along the bottom
      const cubeSize = Math.max(14, h * 0.06);
      const yBase = h * 0.72;
      const cubes = [
        { x: w * 0.12 },
        { x: w * 0.26 },
        { x: w * 0.42 },
        { x: w * 0.58 },
        { x: w * 0.74 },
        { x: w * 0.88 },
      ];
      for (const c of cubes) {
        const y = yBase + Math.sin(c.x * 0.013) * 4;
        ctx.fillStyle = '#0052FF';
        ctx.fillRect(c.x - cubeSize / 2, y - cubeSize / 2, cubeSize, cubeSize);
        ctx.fillStyle = '#0040C0';
        ctx.fillRect(c.x - cubeSize / 2, y + cubeSize / 2 - 3, cubeSize, 3);
        ctx.strokeStyle = '#050a16';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x - cubeSize / 2, y - cubeSize / 2, cubeSize, cubeSize);
      }
      // The awake cube, larger, floating
      const heroX = w * 0.5;
      const heroY = h * 0.4 + Math.sin(t * 0.003) * 8;
      const heroScale = Math.max(4, Math.floor(h / 38));
      // soft halo
      ctx.fillStyle = 'rgba(0, 212, 255, 0.12)';
      const haloR = heroScale * 12 + Math.sin(t * 0.004) * 4;
      ctx.beginPath();
      ctx.arc(heroX, heroY, haloR, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, PLAYER_S_IDLE, heroX - 6 * heroScale, heroY - 7 * heroScale, heroScale);
    },
  },
  {
    title: 'ROLLED UP',
    body:
      'It was a rollup of dreams,\ncompressed and posted home.\nL1 sat far above.\nMainnet was a rumor.\n\nThe builders said:\nstomp the doubt, hop the bugs.',
    paint: (ctx, w, h, t) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#050a16');
      g.addColorStop(1, '#0a1428');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // distant towers parallax
      ctx.fillStyle = '#0e1a36';
      for (let i = 0; i < 10; i++) {
        const tx = ((i * 80 - t * 0.02) % (w + 80) + w + 80) % (w + 80) - 40;
        const th = 24 + (i % 3) * 12;
        ctx.fillRect(tx, h * 0.62 - th, 40, th);
      }

      // ground band
      const groundY = h * 0.78;
      ctx.fillStyle = '#1A2D4F';
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#2C4880';
      ctx.fillRect(0, groundY, w, 4);

      const baseScale = Math.max(3, Math.floor(h / 50));

      // Coins
      for (let i = 0; i < 4; i++) {
        const sx = w * (0.18 + i * 0.14);
        const sy = h * 0.45 + Math.sin(t * 0.003 + i * 1.7) * 8;
        const ss = baseScale;
        drawSprite(ctx, COIN_A, sx - 4 * ss, sy - 6 * ss, ss);
      }

      // Goomba walking right side
      const bugX = w * 0.66 + Math.sin(t * 0.001) * 18;
      const bugY = groundY - 6 * baseScale * 2;
      drawSprite(ctx, GOOMBA_A, bugX, bugY, baseScale);

      // Flag far right
      const ps = Math.max(3, baseScale);
      const fx = w - 14 * ps - 14;
      const fy = groundY - 24 * ps - 4;
      ctx.fillStyle = '#A8B8E0';
      ctx.fillRect(fx, fy, 2 * ps, 24 * ps);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(fx - 2 * ps, fy, 6 * ps, 4 * ps);
      ctx.fillStyle = '#00D4FF';
      ctx.fillRect(fx - 9 * ps, fy + 4 * ps, 9 * ps, 8 * ps);

      // Hero mid-jump on the left
      const heroScale = baseScale * 2;
      const heroX = w * 0.28;
      const heroY = groundY - 14 * heroScale - Math.abs(Math.sin(t * 0.0035)) * 60;
      // Trail dots
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = 0.3 - i * 0.07;
        ctx.fillStyle = '#00D4FF';
        ctx.fillRect(heroX + 6 * heroScale + i * 4, heroY + 8 * heroScale + i * 2, 3, 3);
      }
      ctx.globalAlpha = 1;
      drawSprite(ctx, PLAYER_S_IDLE, heroX, heroY, heroScale);
    },
  },
  {
    title: 'BUILT FOR BUILDERS',
    body:
      'Every coin is a transaction.\nEvery jump, signed.\n\nThe flag at the end\nis a builder code\nwaiting for someone\nbrave enough to reach it.',
    paint: (ctx, w, h, t) => {
      ctx.fillStyle = '#050a16';
      ctx.fillRect(0, 0, w, h);

      // Stacked block towers — Base-blue and cyan
      const baseScale = Math.max(3, Math.floor(h / 60));
      const towerCount = 7;
      for (let i = 0; i < towerCount; i++) {
        const tx = w * (0.08 + i * 0.13);
        const tall = (i % 3) + 2;
        for (let r = 0; r < tall; r++) {
          const blockY = h * 0.78 - (r + 1) * 8 * baseScale;
          ctx.fillStyle = r === tall - 1 ? '#00D4FF' : '#0052FF';
          ctx.fillRect(tx - 4 * baseScale, blockY, 8 * baseScale, 8 * baseScale);
          ctx.fillStyle = '#0040C0';
          ctx.fillRect(tx - 4 * baseScale, blockY + 6 * baseScale, 8 * baseScale, 2 * baseScale);
          ctx.strokeStyle = '#050a16';
          ctx.lineWidth = 2;
          ctx.strokeRect(tx - 4 * baseScale, blockY, 8 * baseScale, 8 * baseScale);
        }
      }

      // Floating cube being assembled (with sparkles)
      const heroX = w * 0.5;
      const heroY = h * 0.32 + Math.sin(t * 0.003) * 6;
      const heroScale = Math.max(4, Math.floor(h / 38));
      for (let i = 0; i < 6; i++) {
        const angle = (t * 0.002 + i * Math.PI / 3) % (Math.PI * 2);
        const r = 50 + Math.sin(t * 0.004 + i) * 6;
        const sx = heroX + Math.cos(angle) * r;
        const sy = heroY + Math.sin(angle) * r * 0.5;
        ctx.fillStyle = '#FFD23F';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
      ctx.fillStyle = 'rgba(0, 212, 255, 0.18)';
      ctx.beginPath();
      ctx.arc(heroX, heroY, heroScale * 14, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, PLAYER_S_IDLE, heroX - 6 * heroScale, heroY - 7 * heroScale, heroScale);
    },
  },
  {
    title: 'ONCHAIN OR NOTHING',
    body:
      'There is no off-switch.\nThe sequencer keeps moving.\n\nOnly mainnet ahead.\nOnly this run.',
    paint: (ctx, w, h, t) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#16080a');
      g.addColorStop(1, '#0a0306');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Distant glowing mainnet skyline
      const groundY = h * 0.78;
      ctx.fillStyle = '#1a0814';
      for (let i = 0; i < 12; i++) {
        const tx = ((i * 70 - t * 0.03) % (w + 70) + w + 70) % (w + 70) - 35;
        const th = 30 + (i % 4) * 18;
        ctx.fillRect(tx, groundY - th, 36, th);
        // glowing windows
        ctx.fillStyle = '#FF4D6D';
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 0.004 + i);
        ctx.fillRect(tx + 8, groundY - th + 8, 4, 4);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1a0814';
      }

      // Lava floor band
      ctx.fillStyle = '#A11D00';
      ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#FF4500';
      const wob = Math.sin(t * 0.005) * 2;
      ctx.fillRect(0, groundY + 2, w, h - groundY - 6 + wob);

      // Castle gate silhouette right
      const baseScale = Math.max(3, Math.floor(h / 50));
      const gateX = w * 0.78;
      ctx.fillStyle = '#3f3f3f';
      ctx.fillRect(gateX, groundY - 16 * baseScale, 22 * baseScale, 16 * baseScale);
      ctx.fillStyle = '#888888';
      ctx.fillRect(gateX + 2, groundY - 14 * baseScale, 18 * baseScale, 14 * baseScale);
      ctx.fillStyle = '#3f3f3f';
      // Crenellations
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(gateX + i * 5 * baseScale, groundY - 18 * baseScale, 3 * baseScale, 4 * baseScale);
      }
      // Gate opening
      ctx.fillStyle = '#050a16';
      ctx.fillRect(gateX + 8 * baseScale, groundY - 9 * baseScale, 6 * baseScale, 9 * baseScale);

      // Hero running right
      const heroScale = baseScale * 2;
      const heroX = w * 0.18 + (Math.sin(t * 0.001) * 0.5 + 0.5) * w * 0.3;
      const heroY = groundY - 14 * heroScale;
      drawSprite(ctx, PLAYER_S_IDLE, heroX, heroY, heroScale);
    },
  },
];

export default function LoreScreen({ onEnter, onBack }: Props) {
  const [page, setPage] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const r = canvas.getBoundingClientRect();
      PAGES[page].paint(ctx, r.width, r.height, performance.now() - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [page]);

  const next = () => {
    if (page < PAGES.length - 1) setPage(page + 1);
    else onEnter();
  };
  const isLast = page === PAGES.length - 1;

  return (
    <div className="absolute inset-0 flex flex-col" style={{ background: '#050a16' }}>
      {/* Top bar — back + skip */}
      <div className="flex justify-between items-center px-4 pt-4 safe-pad-top">
        <button
          onClick={onBack}
          className="font-pix"
          style={{
            background: 'transparent',
            color: '#EEF4FF',
            border: '2px solid #EEF4FF',
            padding: '8px 14px',
            fontSize: 11,
            letterSpacing: '0.18em',
            minHeight: 40,
          }}
        >
          ← BACK
        </button>
        <button
          onClick={onEnter}
          className="font-pix"
          style={{
            background: 'transparent',
            color: '#4F5A75',
            border: '2px solid #4F5A75',
            padding: '8px 14px',
            fontSize: 11,
            letterSpacing: '0.22em',
            minHeight: 40,
          }}
        >
          SKIP →
        </button>
      </div>

      {/* Body — vertically centered as one block (scene + text + dots + CTA).
          On phones this puts the lore in the visual middle of the screen. */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-4 safe-pad-bot"
        style={{ gap: 18, minHeight: 0 }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: 'min(560px, 86vw)',
            height: 'min(30vh, 240px)',
            imageRendering: 'pixelated',
            border: '2px solid #0052FF',
            background: '#050a16',
            boxShadow: '0 0 0 4px #050a16, 0 0 0 6px #00D4FF44',
          }}
        />

        <div
          className="flex flex-col items-center text-center"
          style={{ maxWidth: 560, gap: 8 }}
        >
          <div
            className="font-pix"
            style={{
              color: '#00D4FF',
              fontSize: 'clamp(11px, 2.4vw, 16px)',
              letterSpacing: '0.18em',
              textShadow: '2px 2px 0 #050a16',
            }}
          >
            {PAGES[page].title}
          </div>
          <div
            className="font-vt"
            style={{
              color: '#EEF4FF',
              fontSize: 'clamp(14px, 2.4vw, 18px)',
              lineHeight: 1.35,
              whiteSpace: 'pre-line',
              opacity: 0.96,
              textShadow: '1px 1px 0 #050a16',
            }}
          >
            {PAGES[page].body}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            {PAGES.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === page ? 18 : 8,
                  height: 8,
                  background: i === page ? '#00D4FF' : '#1A2D4F',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>
          <button onClick={next} className="pixel-btn" style={{ fontSize: 13, minWidth: 180, padding: '10px 18px' }}>
            {isLast ? 'START →' : 'NEXT →'}
          </button>
        </div>
      </div>
    </div>
  );
}
