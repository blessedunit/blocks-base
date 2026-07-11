import { useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SaveAppBanner — a dismissible nudge that teaches players to SAVE BLOCKS inside
// the Base App. Saving is a Base App host action (the ··· menu in the top bar):
// there is no SDK call a web app can make to trigger it after the April 2026
// migration, so this banner only points the player at the native control and
// explains the payoff (showing up in their app list + notifications about new
// daily levels). It self-hides once dismissed.
// ─────────────────────────────────────────────────────────────────────────────

const LS_DISMISSED = 'blocks:saveBannerDismissed';

// Pixel bookmark/save icon — a little ribbon that bobs.
function SaveIcon() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 2;
    const W = 14;
    const H = 16;
    c.width = W * SCALE;
    c.height = H * SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(SCALE, SCALE);
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      ctx.clearRect(0, 0, W, H);
      const bob = Math.floor(Math.sin(dt * 0.004) * 1);
      // Ribbon body
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(3, 1 + bob, 8, 12);
      ctx.fillStyle = '#FFE680';
      ctx.fillRect(3, 1 + bob, 8, 1);
      ctx.fillRect(3, 1 + bob, 1, 12);
      // Notch at the bottom
      ctx.fillStyle = '#050a16';
      ctx.fillRect(3, 13 + bob, 2, 2);
      ctx.fillRect(9, 13 + bob, 2, 2);
      ctx.fillRect(5, 12 + bob, 4, 2);
      // Tiny "+" to suggest "add"
      ctx.fillStyle = '#050a16';
      ctx.fillRect(6, 4 + bob, 2, 6);
      ctx.fillRect(4, 6 + bob, 6, 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ width: 28, height: 32, imageRendering: 'pixelated', flexShrink: 0 }}
    />
  );
}

export default function SaveAppBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(LS_DISMISSED) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const close = () => {
    try { localStorage.setItem(LS_DISMISSED, '1'); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <div
      className="w-full"
      style={{ maxWidth: 320, flexShrink: 0 }}
    >
      <div
        style={{
          position: 'relative',
          background: 'rgba(0, 212, 255, 0.10)',
          border: '2px solid var(--base-cyan)',
          boxShadow: '0 0 0 2px rgba(5,10,22,0.6)',
          padding: '8px 9px',
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={close}
          aria-label="dismiss"
          className="font-pix"
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 20,
            height: 20,
            lineHeight: '16px',
            background: 'transparent',
            color: 'var(--base-mute)',
            border: 'none',
            fontSize: 12,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          ×
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            touchAction: 'manipulation',
            textAlign: 'left',
          }}
        >
          <SaveIcon />
          <span style={{ flex: 1 }}>
            <span
              className="font-pix"
              style={{ display: 'block', fontSize: 11, letterSpacing: '0.08em', color: 'var(--base-ivory)' }}
            >
              SAVE BLOCKS
            </span>
            <span
              className="font-pix"
              style={{ display: 'block', fontSize: 8, letterSpacing: '0.06em', color: 'var(--base-cyan)', marginTop: 3 }}
            >
              GET PINGED ON NEW DAILY LEVELS
            </span>
          </span>
          <span
            className="font-pix"
            style={{ fontSize: 10, color: 'var(--base-mute)', flexShrink: 0, paddingRight: 14 }}
          >
            {open ? '▴' : '▾'}
          </span>
        </button>

        {open && (
          <div
            className="font-pix"
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid rgba(0,212,255,0.3)',
              fontSize: 8,
              lineHeight: 1.7,
              letterSpacing: '0.04em',
              color: 'var(--base-ivory)',
            }}
          >
            <div style={{ marginBottom: 4, color: 'var(--base-mute)' }}>
              IN BASE APP:
            </div>
            <div>1 · TAP THE <span style={{ color: 'var(--gold)' }}>···</span> MENU UP TOP</div>
            <div>2 · CHOOSE <span style={{ color: 'var(--gold)' }}>SAVE APP</span></div>
            <div>3 · ALLOW <span style={{ color: 'var(--gold)' }}>NOTIFICATIONS</span></div>
            <div style={{ marginTop: 6, color: 'var(--base-cyan)' }}>
              → BLOCKS LANDS IN YOUR APP LIST + YOU GET A PING EACH NEW DAILY.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
