import { useEffect, useRef, useState } from 'react';
import {
  advanceLevel,
  createState,
  respawn,
  setInput,
  step,
  type GameState,
  type Input,
  type PlayerSize,
  type SfxEvent,
} from '../game/engine';
import { render, getViewW } from '../game/renderer';
import { isMuted, sfx, setMuted, startMusic, stopMusic, unlock } from '../game/audio';
import type { MusicTheme } from '../game/audio';
import { LEVELS } from '../game/world';

// Small inline pixel-art icon helper — draws into a 14×14 canvas at 2× scale.
function PixelIcon({ paint, w = 14, h = 14, scale = 2 }: {
  paint: (ctx: CanvasRenderingContext2D, t: number) => void;
  w?: number; h?: number; scale?: number;
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
    <canvas ref={ref} style={{
      width: w * scale, height: h * scale,
      imageRendering: 'pixelated', display: 'block',
      pointerEvents: 'none',
    }} />
  );
}

// Icon paints — chunky pixel-art glyphs tuned to the game palette.
const pauseGlyph = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = '#EEF4FF';
  ctx.fillRect(3, 2, 3, 10);
  ctx.fillRect(8, 2, 3, 10);
};
const soundOnGlyph = (ctx: CanvasRenderingContext2D, t: number) => {
  ctx.fillStyle = '#EEF4FF';
  // Speaker body
  ctx.fillRect(2, 5, 3, 4);
  ctx.fillRect(5, 4, 1, 6);
  ctx.fillRect(6, 3, 1, 8);
  // Sound waves — pulse
  const pulse = Math.floor(t / 280) % 2;
  if (pulse) {
    ctx.fillRect(9, 5, 1, 4);
    ctx.fillRect(11, 3, 1, 8);
  } else {
    ctx.fillRect(9, 4, 1, 6);
    ctx.fillRect(11, 2, 1, 10);
  }
};
const soundOffGlyph = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = '#EEF4FF';
  // Speaker body (muted)
  ctx.fillRect(2, 5, 3, 4);
  ctx.fillRect(5, 4, 1, 6);
  ctx.fillRect(6, 3, 1, 8);
  // X mark across waves
  ctx.fillStyle = '#FF4D6D';
  ctx.fillRect(9, 4, 1, 1);
  ctx.fillRect(10, 5, 1, 1);
  ctx.fillRect(11, 6, 1, 1);
  ctx.fillRect(12, 7, 1, 1);
  ctx.fillRect(9, 7, 1, 1);
  ctx.fillRect(10, 6, 1, 1);
  ctx.fillRect(11, 5, 1, 1);
  ctx.fillRect(12, 4, 1, 1);
};
// FIRE — pixel fireball/flame shape
const fireGlyph = (ctx: CanvasRenderingContext2D, t: number) => {
  const flicker = Math.floor(t / 110) % 2;
  // outer flame (warm)
  ctx.fillStyle = '#A11D00';
  ctx.fillRect(4, 2, 6, 1);
  ctx.fillRect(3, 3, 8, 1);
  ctx.fillRect(2, 4, 10, 7);
  ctx.fillRect(3, 11, 8, 1);
  ctx.fillRect(4, 12, 6, 1);
  // mid flame
  ctx.fillStyle = '#FF4500';
  ctx.fillRect(5, 3, 4, 1);
  ctx.fillRect(4, 4, 6, 7);
  ctx.fillRect(5, 11, 4, 1);
  // bright core
  ctx.fillStyle = '#FFD23F';
  if (flicker) {
    ctx.fillRect(6, 5, 2, 4);
    ctx.fillRect(5, 6, 4, 2);
  } else {
    ctx.fillRect(6, 4, 2, 6);
    ctx.fillRect(5, 7, 4, 1);
  }
  // tongue tip
  ctx.fillStyle = '#FFE680';
  ctx.fillRect(6, 6, 2, 2);
};
// HOP — chunky upward arrow + motion lines, painted in vivid Base blue
const hopGlyph = (ctx: CanvasRenderingContext2D) => {
  // outer arrow + ground line — light cyan rim for definition on dark glass
  ctx.fillStyle = '#0052FF';
  // arrowhead
  ctx.fillRect(6, 1, 2, 1);
  ctx.fillRect(5, 2, 4, 1);
  ctx.fillRect(4, 3, 6, 1);
  ctx.fillRect(3, 4, 8, 1);
  // shaft
  ctx.fillRect(6, 5, 2, 6);
  // ground line
  ctx.fillRect(3, 12, 8, 1);
  // motion lines
  ctx.fillRect(1, 7, 2, 1);
  ctx.fillRect(11, 7, 2, 1);
  // brighter inner core highlight — gives a 3D pixel pop
  ctx.fillStyle = '#3D7BFF';
  ctx.fillRect(6, 2, 1, 1);
  ctx.fillRect(5, 3, 1, 1);
  ctx.fillRect(4, 4, 1, 1);
  ctx.fillRect(6, 5, 1, 6);
};

interface Props {
  startLevel: number;
  startSize?: PlayerSize;
  startScore?: number;
  startLives?: number;
  startCoins?: number;
  startRunTimeMs?: number;
  onLevelClear: (score: number, coins: number, lives: number, size: PlayerSize, clearedLevel: number, runTimeMs: number, isLast: boolean, hint: string | null) => void;
  onGameOver: (score: number, reachedLevel: number, runTimeMs: number) => void;
  onGameComplete: (score: number, runTimeMs: number) => void;
  onQuit: () => void;
}

export default function GameCanvas({ startLevel, startSize, startScore, startLives, startCoins, startRunTimeMs, onLevelClear, onGameOver, onGameComplete, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<Input>({
    left: false, right: false,
    jumpHeld: false, jumpPressed: false,
    runHeld: false, firePressed: false,
    crouchHeld: false,
  });
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(performance.now());
  const physicsAccRef = useRef<number>(0);
  const lastDeathRef = useRef<number | null>(null);
  const [hasTouch, setHasTouch] = useState(false);
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  const pausedRef = useRef(false);
  const lastThemeRef = useRef<MusicTheme>('overworld');

  useEffect(() => {
    // Restore muted preference from localStorage and apply to audio module
    try {
      const stored = localStorage.getItem('blocks:muted') === '1';
      if (stored !== isMuted()) {
        setMuted(stored);
        setMutedState(stored);
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    setHasTouch(typeof window !== 'undefined' && 'ontouchstart' in window);
    const applyOrient = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const small = Math.min(window.innerWidth, window.innerHeight) <= 900;
      setIsPortraitPhone(portrait && small);
    };
    applyOrient();
    window.addEventListener('resize', applyOrient);
    window.addEventListener('orientationchange', applyOrient);
    return () => {
      window.removeEventListener('resize', applyOrient);
      window.removeEventListener('orientationchange', applyOrient);
    };
  }, []);

  // Auto-pause when the app is backgrounded — rAF freezes in hidden tabs but
  // the Web Audio sequencer keeps playing, so the music would drift on without
  // the game. Pause the run and silence the music; the player resumes manually.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && !pausedRef.current) {
        pausedRef.current = true;
        setPaused(true);
        stopMusic();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Block native gestures (edge-back swipes, pull-to-refresh, pinch-zoom,
  // iOS magnifier on long-press, context menu, text selection) on the game area.
  // Buttons keep their own touch-action: manipulation for taps.
  useEffect(() => {
    const blockTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) { e.preventDefault(); return; }
      const target = e.target as HTMLElement | null;
      if (target && target.tagName !== 'BUTTON') {
        e.preventDefault();
      }
    };
    const blockGesture = (e: Event) => e.preventDefault();
    const blockContext = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName !== 'BUTTON') e.preventDefault();
    };
    const blockSelect = (e: Event) => e.preventDefault();
    document.addEventListener('touchstart', blockTouch, { passive: false });
    document.addEventListener('touchmove', blockTouch, { passive: false });
    document.addEventListener('gesturestart', blockGesture);
    document.addEventListener('gesturechange', blockGesture);
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('selectstart', blockSelect);
    return () => {
      document.removeEventListener('touchstart', blockTouch);
      document.removeEventListener('touchmove', blockTouch);
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('selectstart', blockSelect);
    };
  }, []);

  useEffect(() => {
    unlock();

    let s = createState(performance.now(), {
      size: startSize,
      score: startScore,
      lives: startLives,
      coins: startCoins,
      runTimeMs: startRunTimeMs,
    });
    while (s.levelIndex < startLevel) {
      s = advanceLevel(s, performance.now());
      if (s.status === 'gameOver' || s.status === 'gameComplete') break;
    }
    stateRef.current = s;
    lastThemeRef.current = s.level.music;
    startMusic(s.level.music);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      // Pixel-art game — render at 1× CSS pixels and rely on `image-rendering:
      // pixelated` for the final blit. On a Retina phone this is ~4× less GPU
      // work per frame vs dpr=2 with no visual penalty.
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = Math.floor(w);
      canvas.height = Math.floor(h);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Disable AA on the upscale blit — crisper pixels + faster.
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    // Keyboard
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if ([
        'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
        'KeyA','KeyD','KeyW','KeyS','Space','ShiftLeft','ShiftRight','KeyX','KeyZ',
      ].includes(e.code)) {
        e.preventDefault();
      }
      if (keysDown.has(e.code)) return;
      keysDown.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP') {
        const next = !pausedRef.current;
        pausedRef.current = next;
        setPaused(next);
        if (next) stopMusic();
        else startMusic(lastThemeRef.current);
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.jumpPressed = true;
        inputRef.current.jumpHeld = true;
      }
      if (e.code === 'KeyX' || e.code === 'KeyZ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        inputRef.current.firePressed = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        inputRef.current.jumpHeld = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loop = () => {
      const now = performance.now();
      // Cap dt at 100ms to prevent "spiral of death" after pauses/tab-switches.
      const dt = Math.min(100, now - lastFrameRef.current);
      lastFrameRef.current = now;

      const cur = stateRef.current;
      if (!cur) return;

      // Aggregate inputs
      inputRef.current.left = keysDown.has('ArrowLeft') || keysDown.has('KeyA') || touchRef.current.left;
      inputRef.current.right = keysDown.has('ArrowRight') || keysDown.has('KeyD') || touchRef.current.right;
      inputRef.current.crouchHeld = keysDown.has('ArrowDown') || keysDown.has('KeyS') || touchRef.current.crouch;
      inputRef.current.runHeld =
        keysDown.has('ShiftLeft') || keysDown.has('ShiftRight') ||
        keysDown.has('KeyX') || keysDown.has('KeyZ') || touchRef.current.fire;
      if (touchRef.current.jumpPressed) {
        inputRef.current.jumpPressed = true;
        touchRef.current.jumpPressed = false;
      }
      if (touchRef.current.firePressed) {
        inputRef.current.firePressed = true;
        touchRef.current.firePressed = false;
      }

      setInput(cur, inputRef.current);
      inputRef.current.jumpPressed = false;
      inputRef.current.firePressed = false;

      // Fixed-timestep physics: 60 logical updates per second regardless of FPS.
      // On a 30fps mobile this runs step() twice per frame so speed matches desktop.
      const PHYSICS_STEP_MS = 1000 / 60;
      if (pausedRef.current) {
        // Drop accumulated time so resume feels instant (no fast-forward burst).
        physicsAccRef.current = 0;
      } else {
        physicsAccRef.current += dt;
      }
      // Cap to 8 substeps — drains up to ~133ms per frame, fully covering the
      // 100ms dt clamp so accumulated time never bleeds out.
      let substeps = 0;
      const viewW = getViewW();
      while (physicsAccRef.current >= PHYSICS_STEP_MS && substeps < 8) {
        step(cur, PHYSICS_STEP_MS, viewW);
        physicsAccRef.current -= PHYSICS_STEP_MS;
        substeps += 1;
      }
      if (substeps === 0) {
        // Render-only frame — still need to clear any old SFX events.
        cur.sfxEvents.length = 0;
      }

      // SFX
      for (const ev of cur.sfxEvents as SfxEvent[]) {
        const fn = (sfx as unknown as Record<string, () => void>)[ev];
        if (typeof fn === 'function') fn();
      }

      // Music swap on level change
      if (cur.level.music !== lastThemeRef.current) {
        lastThemeRef.current = cur.level.music;
        startMusic(cur.level.music);
      }

      // Death animation → respawn or game over
      if (cur.status === 'dying') {
        if (lastDeathRef.current == null) lastDeathRef.current = now;
        if (now - lastDeathRef.current > 900) {
          lastDeathRef.current = null;
          const next = respawn(cur, now);
          stateRef.current = next;
          if (next.status === 'gameOver') {
            onGameOver(next.score, next.levelIndex, next.runTimeMs);
            return;
          }
        }
      } else {
        lastDeathRef.current = null;
      }

      // Level clear (flag or castle bridge)
      if (cur.status === 'levelClear') {
        const isLast = cur.levelIndex >= LEVELS.length - 1;
        onLevelClear(cur.score, cur.coins, cur.lives, cur.pSize, cur.levelIndex, cur.runTimeMs, isLast, cur.hintText);
        return;
      }

      // Game complete (axe / bowser defeated)
      if (cur.status === 'gameComplete') {
        onGameComplete(cur.score, cur.runTimeMs);
        return;
      }

      const container = containerRef.current;
      const cw = container ? container.clientWidth : window.innerWidth;
      const ch = container ? container.clientHeight : window.innerHeight;
      render(ctx, cur, now, cw, ch);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      ro.disconnect();
      stopMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Touch state
  const touchRef = useRef({
    left: false, right: false, crouch: false, fire: false,
    jumpPressed: false, firePressed: false,
  });

  // Analog joystick state (replaces left/right/down D-pad)
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyKnobRef = useRef<HTMLDivElement | null>(null);
  const joyActiveRef = useRef<{ id: number; cx: number; cy: number } | null>(null);

  const onJumpDown = () => {
    touchRef.current.jumpPressed = true;
    inputRef.current.jumpHeld = true;
  };
  const onJumpUp = () => {
    inputRef.current.jumpHeld = false;
  };
  const onFireDown = () => {
    touchRef.current.firePressed = true;
    touchRef.current.fire = true;
  };
  const onFireUp = () => {
    touchRef.current.fire = false;
  };

  // Uniform control size — joystick base = FIRE = HOP, all equal diameter.
  // Minimalist modern style: clean circles, soft glassy fills, subtle borders.
  const ctrlSize = isPortraitPhone ? 76 : 92;
  const fireSize = ctrlSize;
  const hopSize  = ctrlSize;
  const joySize  = ctrlSize;
  const knobSize = Math.floor(ctrlSize * 0.42);
  const joyRadius = (joySize - knobSize) / 2 - 4;

  const updateKnob = (clientX: number, clientY: number) => {
    const a = joyActiveRef.current;
    if (!a) return;
    const dx = clientX - a.cx;
    const dy = clientY - a.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const limited = Math.min(dist, joyRadius);
    const angle = Math.atan2(dy, dx);
    const lx = Math.cos(angle) * limited;
    const ly = Math.sin(angle) * limited;
    const knob = joyKnobRef.current;
    if (knob) knob.style.transform = `translate(${lx}px, ${ly}px)`;
    const DEAD = joyRadius * 0.18;
    touchRef.current.left = lx < -DEAD;
    touchRef.current.right = lx > DEAD;
    touchRef.current.crouch = ly > DEAD;
  };

  const onJoyDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    joyActiveRef.current = {
      id: e.pointerId,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    };
    try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
    updateKnob(e.clientX, e.clientY);
  };
  const onJoyMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyActiveRef.current || e.pointerId !== joyActiveRef.current.id) return;
    e.preventDefault();
    updateKnob(e.clientX, e.clientY);
  };
  const onJoyUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyActiveRef.current || e.pointerId !== joyActiveRef.current.id) return;
    e.preventDefault();
    joyActiveRef.current = null;
    const knob = joyKnobRef.current;
    if (knob) knob.style.transform = 'translate(0px, 0px)';
    touchRef.current.left = false;
    touchRef.current.right = false;
    touchRef.current.crouch = false;
  };

  const joystick = (
    <div
      ref={joyBaseRef}
      role="application"
      aria-label="Movement joystick"
      onPointerDown={onJoyDown}
      onPointerMove={onJoyMove}
      onPointerUp={onJoyUp}
      onPointerCancel={onJoyUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'relative',
        width: joySize,
        height: joySize,
        borderRadius: '50%',
        background: 'rgba(5, 10, 22, 0.32)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1.5px solid rgba(238, 244, 255, 0.55)',
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.30)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Slow rotating accent ring — thin minimal arcs */}
      <div
        style={{
          position: 'absolute',
          inset: 6,
          borderRadius: '50%',
          pointerEvents: 'none',
          background:
            'conic-gradient(from 0deg, ' +
            'rgba(0,212,255,0) 0deg, rgba(0,212,255,0.55) 18deg, rgba(0,212,255,0) 36deg, ' +
            'rgba(0,212,255,0) 162deg, rgba(0,212,255,0.55) 180deg, rgba(0,212,255,0) 198deg, ' +
            'rgba(0,212,255,0) 360deg)',
          maskImage:
            'radial-gradient(circle, transparent 0%, transparent 86%, black 88%, black 96%, transparent 98%)',
          WebkitMaskImage:
            'radial-gradient(circle, transparent 0%, transparent 86%, black 88%, black 96%, transparent 98%)',
          animation: 'joy-spin 6s linear infinite',
          opacity: 0.85,
        }}
      />
      {/* Subtle dot center marker */}
      <div
        style={{
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'rgba(238, 244, 255, 0.30)',
          pointerEvents: 'none',
        }}
      />
      {/* Knob — clean circle with soft glow, snaps back on release */}
      <div
        ref={joyKnobRef}
        style={{
          position: 'absolute',
          width: knobSize,
          height: knobSize,
          borderRadius: '50%',
          background: 'rgba(0, 212, 255, 0.90)',
          border: '1.5px solid rgba(238, 244, 255, 0.85)',
          boxShadow:
            '0 0 14px rgba(0, 212, 255, 0.45), inset 0 -3px 8px rgba(0, 0, 0, 0.20)',
          pointerEvents: 'none',
          transform: 'translate(0px, 0px)',
        }}
      />
    </div>
  );

  // Modern minimalist round button — glassy translucent fill, accent border on
  // the active state. Same diameter as the joystick base for visual harmony.
  const roundActionBtn = (size: number, accent: string): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'rgba(5, 10, 22, 0.32)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: `1.5px solid ${accent}`,
    boxShadow: `0 6px 18px rgba(0, 0, 0, 0.30), inset 0 0 14px ${accent}33`,
    color: '#EEF4FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'manipulation',
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
    WebkitTouchCallout: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer',
    padding: 0,
  });

  const actionButtons = (
    <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
      <button
        type="button"
        aria-label="Fire"
        onPointerDown={(e) => { e.preventDefault(); onFireDown(); }}
        onPointerUp={(e) => { e.preventDefault(); onFireUp(); }}
        onPointerCancel={onFireUp}
        onPointerLeave={onFireUp}
        style={roundActionBtn(fireSize, '#FFD23F')}
      >
        <PixelIcon paint={fireGlyph} w={14} h={14} scale={Math.max(2, Math.floor(fireSize / 20))} />
      </button>
      <button
        type="button"
        aria-label="Jump"
        onPointerDown={(e) => { e.preventDefault(); onJumpDown(); }}
        onPointerUp={(e) => { e.preventDefault(); onJumpUp(); }}
        onPointerCancel={onJumpUp}
        onPointerLeave={onJumpUp}
        style={roundActionBtn(hopSize, '#00D4FF')}
      >
        <PixelIcon paint={hopGlyph} w={14} h={14} scale={Math.max(2, Math.floor(hopSize / 20))} />
      </button>
    </div>
  );

  // Unified layout — canvas always full-screen. Renderer letterboxes the game
  // inside (preserving aspect), so portrait phones get black bars above/below
  // where the touch buttons overlay sits. Buttons sit close to the bottom edge
  // — just enough clearance for the Base App URL chrome.
  const bottomOffset = isPortraitPhone
    ? 'calc(env(safe-area-inset-bottom, 0px) + 22px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + 8px)';
  return (
    <div
      ref={containerRef}
      className="fixed inset-0"
      style={{
        background: 'var(--bg-deep)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'none',
        overscrollBehavior: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="BLOCKS gameplay"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'none',
          pointerEvents: 'none',
        }}
      />

      {/* Top-right HUD — PAUSE + SOUND TOGGLE (icon-only pixel buttons) */}
      <div
        className="absolute"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
          display: 'flex',
          gap: 8,
          zIndex: 5,
        }}
      >
        <button
          type="button"
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
            try { localStorage.setItem('blocks:muted', next ? '1' : '0'); } catch { /* noop */ }
          }}
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            background: 'rgba(5, 10, 22, 0.32)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1.5px solid rgba(238, 244, 255, 0.55)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation',
            padding: 0,
          }}
        >
          <PixelIcon paint={muted ? soundOffGlyph : soundOnGlyph} w={14} h={14} scale={2} />
        </button>
        <button
          type="button"
          aria-label="Pause"
          onClick={() => {
            const next = !pausedRef.current;
            pausedRef.current = next;
            setPaused(next);
            if (next) stopMusic();
            else startMusic(lastThemeRef.current);
          }}
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            background: 'rgba(5, 10, 22, 0.32)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1.5px solid rgba(255, 210, 63, 0.65)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'manipulation',
            padding: 0,
          }}
        >
          <PixelIcon paint={pauseGlyph} w={14} h={14} scale={2} />
        </button>
      </div>

      {hasTouch && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              left: 'calc(env(safe-area-inset-left, 0px) + 24px)',
              bottom: bottomOffset,
            }}
          >
            <div className="pointer-events-auto">{joystick}</div>
          </div>
          <div
            className="absolute pointer-events-none"
            style={{
              right: 'calc(env(safe-area-inset-right, 0px) + 14px)',
              bottom: bottomOffset,
            }}
          >
            <div className="pointer-events-auto">{actionButtons}</div>
          </div>
        </>
      )}

      {/* Pause overlay — game stops, dim background, RESUME + EXIT pixel buttons */}
      {paused && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'rgba(5,10,22,0.78)',
            zIndex: 10,
            touchAction: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-5">
            <div
              className="font-pix"
              style={{
                color: '#FFD23F',
                fontSize: 28,
                letterSpacing: '0.20em',
                textShadow: '3px 3px 0 #050a16, 5px 5px 0 #0052FF',
              }}
            >
              PAUSED
            </div>
            <button
              type="button"
              className="font-pix"
              onClick={() => { pausedRef.current = false; setPaused(false); startMusic(lastThemeRef.current); }}
              style={{
                background: '#00D4FF',
                color: '#050a16',
                border: '3px solid #EEF4FF',
                padding: '12px 28px',
                fontSize: 14,
                letterSpacing: '0.14em',
                boxShadow: '0 4px 0 0 #007EAA',
                touchAction: 'manipulation',
                minWidth: 200,
              }}
            >
              RESUME
            </button>
            <button
              type="button"
              className="font-pix"
              onClick={onQuit}
              style={{
                background: 'transparent',
                color: '#EEF4FF',
                border: '3px solid #EEF4FF',
                padding: '12px 28px',
                fontSize: 12,
                letterSpacing: '0.18em',
                touchAction: 'manipulation',
                minWidth: 200,
              }}
            >
              EXIT TO MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
