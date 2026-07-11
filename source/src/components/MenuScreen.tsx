import { useEffect, useRef, useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { useAccount } from 'wagmi';
import { drawHero } from '../game/renderer';
import {
  drawSprite,
  BOWSER_A,
  BOWSER_B,
  BOWSER_FIRE,
  FIREBALL,
} from '../game/sprites';
import { readLocalBestScore } from '../hooks/useSmartTransaction';
import { useUnlock } from '../hooks/useChainStatus';
import { dailyLevelIndex } from './DailyScreen';
import { sfx, startMusic, unlock } from '../game/audio';
import SaveAppBanner from './SaveAppBanner';

interface Props {
  onPlay: () => void;
  onLevelSelect: () => void;
  onLeaderboard: () => void;
  onShop: () => void;
  onDaily: () => void;
}

// Small pixel-art icon canvas
function PixelIcon({ paint, w, h, scale = 2 }: {
  paint: (ctx: CanvasRenderingContext2D, t: number) => void;
  w: number; h: number; scale?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = w * scale;
    c.height = h * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      paint(ctx, t - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paint, w, h, scale]);
  return (
    <canvas
      ref={ref}
      style={{ width: w * scale, height: h * scale, imageRendering: 'pixelated', flexShrink: 0 }}
    />
  );
}

export default function MenuScreen({ onPlay, onLevelSelect, onLeaderboard, onShop, onDaily }: Props) {
  const { isConnected } = useAccount();
  const [bestScore, setBestScore] = useState(0);
  const heroRef = useRef<HTMLCanvasElement | null>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const fightRef = useRef<HTMLCanvasElement | null>(null);
  const { unlocked } = useUnlock();
  const dailyIdx = dailyLevelIndex();

  useEffect(() => {
    setBestScore(readLocalBestScore());
  }, []);

  // Animated background — falling pixel cubes
  useEffect(() => {
    const c = bgRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    type Cube = { x: number; y: number; v: number; s: number; col: string };
    const cubes: Cube[] = Array.from({ length: 30 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      v: 0.15 + Math.random() * 0.5,
      s: 4 + Math.floor(Math.random() * 6),
      col: Math.random() < 0.5 ? '#00D4FF' : '#0052FF',
    }));

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const cu of cubes) {
        cu.y += cu.v;
        if (cu.y > c.height + cu.s) { cu.y = -cu.s; cu.x = Math.random() * c.width; }
        ctx.fillStyle = cu.col;
        ctx.globalAlpha = 0.10 + (cu.s / 10) * 0.15;
        ctx.fillRect(Math.floor(cu.x), Math.floor(cu.y), cu.s, cu.s);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  // Hero cube with sparkles (smaller)
  useEffect(() => {
    const c = heroRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 4;
    const W = 26 * SCALE;
    const H = 16 * SCALE;
    c.width = W;
    c.height = H;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      ctx.clearRect(0, 0, W, H);
      // Sparkles
      for (let i = 0; i < 4; i++) {
        const ang = (dt * 0.0015 + i * Math.PI / 2) % (Math.PI * 2);
        const r = 32 + Math.sin(dt * 0.003 + i) * 3;
        const sx = W / 2 + Math.cos(ang) * r;
        const sy = H / 2 + Math.sin(ang) * 0.35 * r;
        ctx.fillStyle = i % 2 === 0 ? '#FFD23F' : '#00D4FF';
        ctx.globalAlpha = 0.4 + 0.6 * Math.sin(dt * 0.005 + i);
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
      const bob = Math.sin(dt * 0.0025) * 3;
      drawHero(ctx, W / 2 - 6 * SCALE, H / 2 - 7 * SCALE + bob, SCALE, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Fight scene: player vs bowser, exchanging fire
  useEffect(() => {
    const c = fightRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 2;
    const W = 200;
    const H = 40;
    c.width = W * SCALE;
    c.height = H * SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(SCALE, SCALE);

    // Animation state
    const state = {
      playerX: 20,
      playerJumpT: 0,
      fireballs: [] as { x: number; y: number; vx: number; life: number }[],
      bowserFires: [] as { x: number; y: number; vx: number; life: number }[],
      bowserShake: 0,
      bowserHit: 0,
      bowserFlash: 0,
      lastJump: 0,
      lastShoot: 0,
      lastBowserFire: 0,
    };

    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      ctx.clearRect(0, 0, W, H);

      // Ground line
      ctx.fillStyle = '#C84C0C';
      ctx.fillRect(0, 32, W, 1);
      ctx.fillStyle = '#7A2F08';
      ctx.fillRect(0, 33, W, 7);

      // Bowser on right — shakes when "hit"
      const bowserBaseX = W - 32;
      const shake = state.bowserShake > 0 ? Math.sin(dt * 0.06) * 1.5 : 0;
      const bowserFrame = Math.floor(t / 220) % 2;
      const bowserY = 8;
      if (state.bowserFlash > 0) {
        // Flash white outline by drawing tinted square
        ctx.fillStyle = '#FFD23F';
        ctx.fillRect(bowserBaseX - 1 + shake, bowserY - 1, 26, 26);
      }
      drawSprite(ctx, bowserFrame === 0 ? BOWSER_A : BOWSER_B, bowserBaseX + shake, bowserY, 1, true);
      if (state.bowserShake > 0) state.bowserShake -= 1;
      if (state.bowserFlash > 0) state.bowserFlash -= 1;
      if (state.bowserHit > 0) state.bowserHit -= 1;

      // Player on left — occasional jumps, occasional fireballs
      // Trigger jump
      if (dt - state.lastJump > 1800) {
        state.playerJumpT = 1;
        state.lastJump = dt;
      }
      // Trigger fireball shot
      if (dt - state.lastShoot > 1100) {
        state.fireballs.push({ x: state.playerX + 12, y: 18, vx: 1.6, life: 80 });
        state.lastShoot = dt;
      }
      // Trigger bowser fire
      if (dt - state.lastBowserFire > 1500) {
        state.bowserFires.push({ x: bowserBaseX - 4, y: bowserY + 8, vx: -1.2, life: 100 });
        state.lastBowserFire = dt;
      }

      // Player jump animation
      let playerJumpY = 0;
      if (state.playerJumpT > 0) {
        // arc: rises, falls
        const phase = state.playerJumpT / 30;
        playerJumpY = Math.sin(phase * Math.PI) * 8;
        state.playerJumpT += 1;
        if (state.playerJumpT > 30) state.playerJumpT = 0;
      }
      // Player frame: idle if not jumping, jump if jumping
      const px = state.playerX;
      const py = 18 - playerJumpY;
      drawHero(ctx, px, py, 1, t);

      // Update fireballs (player → bowser)
      for (const fb of state.fireballs) {
        fb.x += fb.vx;
        fb.life -= 1;
        const spinFrame = Math.floor(t / 60) % 4;
        ctx.save();
        ctx.translate(fb.x + 3, fb.y + 3);
        ctx.rotate((spinFrame * Math.PI) / 2);
        drawSprite(ctx, FIREBALL, -3, -3, 1);
        ctx.restore();
        // Check hit on bowser
        if (fb.x > bowserBaseX - 4 && fb.x < bowserBaseX + 24 && fb.life > 0) {
          state.bowserShake = 12;
          state.bowserFlash = 6;
          state.bowserHit += 1;
          fb.life = 0;
          // Spark particles drawn at hit
          ctx.fillStyle = '#FFD23F';
          for (let i = 0; i < 5; i++) {
            ctx.fillRect(bowserBaseX - 2 + i * 3, 12 + (i % 2) * 4, 2, 2);
          }
        }
      }
      state.fireballs = state.fireballs.filter((fb) => fb.life > 0);

      // Update bowser fires (bowser → player)
      for (const bf of state.bowserFires) {
        bf.x += bf.vx;
        bf.life -= 1;
        drawSprite(ctx, BOWSER_FIRE, bf.x, bf.y, 1, true);
      }
      state.bowserFires = state.bowserFires.filter((bf) => bf.x > -10 && bf.life > 0);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePlay = () => {
    unlock();
    startMusic('overworld');
    sfx.start();
    onPlay();
  };

  const dailyWorld = Math.floor(dailyIdx / 4) + 1;
  const dailyStage = (dailyIdx % 4) + 1;

  // Pixel icon paints
  const playIcon = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#050a16';
    for (let r = 0; r < 14; r++) {
      const w = r < 7 ? r + 1 : 14 - r;
      if (w <= 0) continue;
      ctx.fillRect(3, r, w, 1);
    }
  };
  const dailyIcon = (ctx: CanvasRenderingContext2D, t: number) => {
    const pulse = Math.sin(t * 0.005) > 0;
    ctx.fillStyle = pulse ? '#050a16' : '#7a4d00';
    const pts = [[6,1],[7,1],[6,2],[7,2],[8,2],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],
                 [3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],
                 [4,5],[5,5],[6,5],[7,5],[8,5],[9,5],
                 [5,6],[6,6],[7,6],[8,6],[4,7],[5,7],[8,7],[9,7],[3,8],[4,8],[9,8],[10,8]];
    for (const [x, y] of pts) ctx.fillRect(x, y, 1, 1);
  };
  // Left icon for LEVELS — 4×4 grid of mini stage tiles (the padlock state
  // moved to the right side as endIcon).
  const levelsIcon = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#050a16';
    for (let gy = 0; gy < 3; gy++) {
      for (let gx = 0; gx < 3; gx++) {
        ctx.fillRect(2 + gx * 4, 2 + gy * 4, 3, 3);
      }
    }
  };
  const shopIcon = (ctx: CanvasRenderingContext2D, t: number) => {
    const phase = Math.floor(t / 200) % 2;
    ctx.fillStyle = '#050a16';
    if (phase === 0) {
      ctx.fillRect(3, 2, 8, 1);
      ctx.fillRect(2, 3, 10, 8);
      ctx.fillRect(3, 11, 8, 1);
    } else {
      ctx.fillRect(5, 1, 4, 1);
      ctx.fillRect(4, 2, 6, 10);
      ctx.fillRect(5, 12, 4, 1);
    }
  };
  const trophyIcon = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#050a16';
    ctx.fillRect(3, 2, 8, 2);
    ctx.fillRect(3, 4, 8, 5);
    ctx.fillRect(5, 9, 4, 2);
    ctx.fillRect(3, 11, 8, 2);
    ctx.fillRect(1, 4, 2, 2);
    ctx.fillRect(11, 4, 2, 2);
  };

  // ─ Pixel badge icons rendered on the right side of menu buttons ─────────────
  const coinBadgeIcon = (ctx: CanvasRenderingContext2D, t: number) => {
    // 14x12 viewport — small spinning coin
    const phase = Math.floor(t / 130) % 4;
    ctx.fillStyle = '#7A4D00';
    if (phase === 0) {
      ctx.fillRect(2, 2, 8, 8);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(3, 3, 6, 6);
      ctx.fillStyle = '#FFE680';
      ctx.fillRect(4, 4, 2, 4);
    } else if (phase === 1) {
      ctx.fillRect(4, 2, 4, 8);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(4, 3, 4, 6);
      ctx.fillStyle = '#FFE680';
      ctx.fillRect(5, 4, 1, 4);
    } else if (phase === 2) {
      ctx.fillRect(5, 2, 2, 8);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(5, 3, 2, 6);
    } else {
      ctx.fillRect(4, 2, 4, 8);
      ctx.fillStyle = '#FFE680';
      ctx.fillRect(4, 3, 4, 6);
    }
  };

  const podiumBadgeIcon = (ctx: CanvasRenderingContext2D, t: number) => {
    // 14x12 viewport — mini podium 3 bars + bobbing gold cube
    const bob = Math.floor(Math.sin(t * 0.005) * 1);
    // Silver bar (left, mid height)
    ctx.fillStyle = '#7E8AA8';
    ctx.fillRect(1, 7, 4, 5);
    ctx.fillStyle = '#C8D2E8';
    ctx.fillRect(1, 7, 4, 1);
    // Gold bar (center, tallest)
    ctx.fillStyle = '#A06C00';
    ctx.fillRect(5, 5, 4, 7);
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(5, 5, 4, 1);
    ctx.fillRect(5, 5, 1, 7);
    // Bronze bar (right, shortest)
    ctx.fillStyle = '#6B3F12';
    ctx.fillRect(9, 9, 4, 3);
    ctx.fillStyle = '#C8762E';
    ctx.fillRect(9, 9, 4, 1);
    // Tiny crown on gold bar
    ctx.fillStyle = '#FFD23F';
    ctx.fillRect(5, 2 + bob, 4, 1);
    ctx.fillRect(5, 1 + bob, 1, 1);
    ctx.fillRect(7, 1 + bob, 1, 1);
  };

  const lockEndIcon = (ctx: CanvasRenderingContext2D) => {
    // 14x12 viewport — closed grey padlock for LEVELS row
    ctx.fillStyle = '#4F5A75';
    ctx.fillRect(3, 1, 6, 1);
    ctx.fillRect(2, 2, 1, 4);
    ctx.fillRect(9, 2, 1, 4);
    ctx.fillStyle = '#7E8AA8';
    ctx.fillRect(1, 6, 10, 6);
    ctx.fillStyle = '#B8C2DA';
    ctx.fillRect(1, 6, 10, 1);
    ctx.fillRect(1, 6, 1, 6);
    ctx.fillStyle = '#050a16';
    ctx.fillRect(5, 8, 2, 2);
    ctx.fillRect(5, 10, 2, 1);
  };

  const lockOpenEndIcon = (ctx: CanvasRenderingContext2D, t: number) => {
    // 14x12 viewport — open green padlock when unlocked
    const pulse = Math.floor(t / 280) % 2;
    ctx.fillStyle = '#1f7a3a';
    ctx.fillRect(7, 1, 2, 2);
    ctx.fillRect(9, 2, 2, 2);
    ctx.fillRect(10, 4, 1, 2);
    ctx.fillRect(7, 3, 1, 3);
    ctx.fillStyle = pulse ? '#3DD668' : '#28B850';
    ctx.fillRect(1, 6, 10, 6);
    ctx.fillStyle = '#7FE0A0';
    ctx.fillRect(1, 6, 10, 1);
    ctx.fillRect(1, 6, 1, 6);
    ctx.fillStyle = '#050a16';
    ctx.fillRect(5, 8, 2, 2);
    ctx.fillRect(5, 10, 2, 1);
  };

  interface BtnConfig {
    label: string;
    color: string;
    bg: string;
    badge?: string;
    badgeColor?: string;
    icon: (ctx: CanvasRenderingContext2D, t: number) => void;
    endIcon?: (ctx: CanvasRenderingContext2D, t: number) => void;
    endIconBg?: string;
    onClick: () => void;
    primary?: boolean;
  }
  const buttons: BtnConfig[] = [
    { label: 'PLAY',     color: '#050a16', bg: '#00D4FF', icon: playIcon,  onClick: handlePlay,  primary: true },
    { label: 'DAILY',    color: '#050a16', bg: '#FFD23F', badge: `${dailyWorld}-${dailyStage}`, badgeColor: '#FF4D6D', icon: dailyIcon, onClick: onDaily },
    { label: 'LEVELS',
      color: '#050a16',
      bg: unlocked ? '#28B850' : '#7E8AA8',
      icon: levelsIcon,
      endIcon: unlocked ? lockOpenEndIcon : lockEndIcon,
      endIconBg: unlocked ? '#1f7a3a' : '#4F5A75',
      onClick: onLevelSelect },
    { label: 'SHOP',     color: '#050a16', bg: '#FF4D6D', icon: shopIcon,   endIcon: coinBadgeIcon,   endIconBg: '#FFD23F', onClick: onShop },
    { label: 'RANKING',  color: '#050a16', bg: '#FFB300', icon: trophyIcon, endIcon: podiumBadgeIcon, endIconBg: '#050a16', onClick: onLeaderboard },
  ];

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: 'var(--bg-deep)', overflow: 'hidden' }}
    >
      <canvas
        ref={bgRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', pointerEvents: 'none' }}
      />

      {/* Top bar — wallet only (no chain-id pill) */}
      <div
        className="flex items-center justify-end px-3 pt-2 safe-pad-top"
        style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}
      >
        <ConnectKitButton.Custom>
          {({ show, truncatedAddress }) => (
            <button
              type="button"
              onClick={show}
              className="font-pix text-[9px] px-2 py-1"
              style={{
                background: isConnected ? 'rgba(0,212,255,0.15)' : 'transparent',
                color: 'var(--base-ivory)',
                border: '2px solid var(--base-ivory)',
                minHeight: 30,
                minWidth: 80,
              }}
            >
              {isConnected ? truncatedAddress : 'CONNECT'}
            </button>
          )}
        </ConnectKitButton.Custom>
      </div>

      {/* Main body — one-screen layout, no scroll */}
      <div
        className="flex-1 flex flex-col items-center justify-around px-3 py-2"
        style={{ position: 'relative', zIndex: 1, minHeight: 0 }}
      >
        {/* Hero + Title row */}
        <div className="flex items-center justify-center gap-3" style={{ flexShrink: 0 }}>
          <canvas
            ref={heroRef}
            style={{ width: 'min(120px, 22vw)', height: 'min(74px, 14vw)', imageRendering: 'pixelated' }}
          />
          <h1
            className="font-pix"
            style={{
              fontSize: 'clamp(34px, 9vw, 64px)',
              color: 'var(--base-ivory)',
              letterSpacing: '0.06em',
              textShadow: '3px 3px 0 #00D4FF, 5px 5px 0 var(--base-blue), 7px 7px 0 #0040C0, 0 0 14px rgba(0, 212, 255, 0.5)',
              lineHeight: 1,
            }}
          >
            BLOCKS
          </h1>
        </div>

        {/* Static tagline */}
        <div
          className="font-pix text-center"
          style={{ color: 'var(--base-cyan)', fontSize: 'clamp(9px, 1.7vw, 11px)', letterSpacing: '0.22em', flexShrink: 0 }}
        >
          A PIXEL RUN ON BASE
        </div>

        {/* Fight scene canvas */}
        <canvas
          ref={fightRef}
          style={{ width: 'min(420px, 90vw)', height: 'min(80px, 14vw)', imageRendering: 'pixelated', flexShrink: 0 }}
        />

        {/* Buttons */}
        <div className="flex flex-col items-stretch gap-2 w-full" style={{ maxWidth: 320, flexShrink: 0 }}>
          {buttons.map((b) => (
            <button
              key={b.label}
              onClick={b.onClick}
              className="font-pix"
              style={{
                position: 'relative',
                background: b.bg,
                color: b.color,
                border: `2px solid #050a16`,
                padding: '8px 10px',
                fontSize: b.primary ? 15 : 12,
                letterSpacing: '0.08em',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                touchAction: 'manipulation',
                boxShadow: `0 0 0 2px var(--base-ivory), 0 4px 0 0 rgba(0,0,0,0.5)`,
                minHeight: b.primary ? 42 : 36,
              }}
              onPointerDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; }}
              onPointerUp={(e) => { e.currentTarget.style.transform = ''; }}
              onPointerLeave={(e) => { e.currentTarget.style.transform = ''; }}
            >
              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <PixelIcon paint={b.icon} w={14} h={14} scale={2} />
              </span>
              <span style={{ flex: 1, textAlign: 'left' }}>{b.label}</span>
              {b.badge && (
                <span
                  style={{
                    background: b.badgeColor ?? '#FFD23F',
                    color: '#050a16',
                    border: '2px solid #050a16',
                    padding: '2px 5px',
                    fontSize: 8,
                    letterSpacing: '0.08em',
                  }}
                >
                  {b.badge}
                </span>
              )}
              {b.endIcon && (
                <span
                  style={{
                    background: b.endIconBg ?? '#FFD23F',
                    border: '2px solid #050a16',
                    padding: '2px 3px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PixelIcon paint={b.endIcon} w={14} h={12} scale={2} />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Save-app nudge — points at the Base App host save control */}
        <SaveAppBanner />

        {/* HI score + socials — game account first, then dev */}
        <div className="flex flex-col items-center gap-2" style={{ flexShrink: 0 }}>
          <div className="font-pix" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--base-mute)' }}>
            HI · <span style={{ color: 'var(--gold)' }}>{String(bestScore).padStart(6, '0')}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://x.com/theblocksgame"
              target="_blank"
              rel="noopener noreferrer"
              className="font-pix"
              style={{
                fontSize: 9,
                letterSpacing: '0.16em',
                color: '#050a16',
                textDecoration: 'none',
                padding: '8px 12px',
                border: '2px solid var(--base-cyan)',
                background: 'var(--base-cyan)',
                touchAction: 'manipulation',
                minHeight: 32,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              FOLLOW · @THEBLOCKSGAME
            </a>
            <a
              href="https://x.com/angel2cult"
              target="_blank"
              rel="noopener noreferrer"
              className="font-pix"
              style={{
                fontSize: 9,
                letterSpacing: '0.16em',
                color: 'var(--base-cyan)',
                textDecoration: 'none',
                padding: '8px 12px',
                border: '2px solid rgba(0, 212, 255, 0.45)',
                background: 'rgba(0, 212, 255, 0.08)',
                touchAction: 'manipulation',
                minHeight: 32,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              DEV · @ANGEL2CULT
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
