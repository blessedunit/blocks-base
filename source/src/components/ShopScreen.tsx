import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import { drawSprite, COIN_A, COIN_B, PLAYER_S_IDLE } from '../game/sprites';
import { SKINS, getEquippedSkinId, setEquippedSkinId, type Skin } from '../game/skins';
import { useSkinMint, readLocalOwnedSkins } from '../hooks/useSmartTransaction';

interface Props {
  onBack: () => void;
}

// Spinning coin row — three coins, all offset, bouncing & flipping. Sits at
// the bottom of the shop as a "vault" visual.
function CoinRow() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 4;
    c.width = 90 * SCALE;
    c.height = 18 * SCALE;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      ctx.clearRect(0, 0, c.width, c.height);
      // Glow base
      for (let i = 0; i < 3; i++) {
        const cx = 15 + i * 30;
        const bob = Math.sin(dt * 0.005 + i * 0.9) * 2;
        // Halo
        ctx.globalAlpha = 0.18 + 0.10 * Math.sin(dt * 0.006 + i);
        ctx.fillStyle = '#FFD23F';
        ctx.fillRect((cx - 5) * SCALE, (5 + bob) * SCALE, 10 * SCALE, 10 * SCALE);
        ctx.globalAlpha = 1;
        // Coin frame
        const flipPhase = Math.floor((dt + i * 200) / 180) % 4;
        const useA = flipPhase === 0 || flipPhase === 2;
        drawSprite(ctx, useA ? COIN_A : COIN_B, (cx - 4) * SCALE, (4 + bob) * SCALE, SCALE);
      }
    raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{
        width: 90 * 4,
        height: 18 * 4,
        imageRendering: 'pixelated',
        maxWidth: '100%',
      }}
    />
  );
}

function SkinCard({ skin, owned, equipped, onBuy, onEquip, status, isConnected }: {
  skin: Skin;
  owned: boolean;
  equipped: boolean;
  onBuy: () => void;
  onEquip: () => void;
  status: ReturnType<typeof useSkinMint>['status'];
  isConnected: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const SCALE = 5;
    c.width = 12 * SCALE;
    c.height = 14 * SCALE;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const dt = t - start;
      const bob = Math.sin(dt * 0.003) * 2;
      ctx.clearRect(0, 0, c.width, c.height);
      drawSprite(ctx, PLAYER_S_IDLE, 0, bob * SCALE, SCALE, false, skin.palette);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skin]);

  const isFree = skin.id === 0;
  const isPending = status === 'pending';

  let primaryLabel = '0.0000111 ETH';
  let primaryAction = onBuy;
  let primaryDisabled = false;
  let primaryBg: string = 'var(--base-blue)';
  let primaryColor: string = 'var(--base-ivory)';

  if (equipped) {
    primaryLabel = '✓ EQUIPPED';
    primaryAction = () => {};
    primaryDisabled = true;
    primaryBg = 'transparent';
    primaryColor = 'var(--base-cyan)';
  } else if (owned) {
    primaryLabel = 'EQUIP';
    primaryAction = onEquip;
    primaryBg = 'var(--base-cyan)';
    primaryColor = '#050a16';
  } else if (isFree) {
    primaryLabel = 'EQUIP';
    primaryAction = onEquip;
    primaryBg = 'var(--base-cyan)';
    primaryColor = '#050a16';
  } else if (isPending) {
    primaryLabel = 'MINTING…';
    primaryDisabled = true;
  } else if (!isConnected) {
    primaryLabel = 'CONNECT TO BUY';
    primaryBg = 'transparent';
    primaryColor = 'var(--base-ivory)';
  }

  return (
    <div
      style={{
        background: '#0a1428',
        border: `3px solid ${equipped ? 'var(--base-cyan)' : owned ? '#3D7BFF' : 'var(--base-mute)'}`,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        boxShadow: 'inset 0 -4px 0 0 rgba(0,0,0,0.4)',
        position: 'relative',
      }}
    >
      {equipped && (
        <div
          className="font-pix"
          style={{
            position: 'absolute',
            top: -10,
            background: 'var(--base-cyan)',
            color: '#050a16',
            fontSize: 7,
            padding: '3px 8px',
            letterSpacing: '0.16em',
          }}
        >
          IN USE
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: 60, height: 70, imageRendering: 'pixelated' }}
      />
      <div className="font-pix" style={{ color: 'var(--base-ivory)', fontSize: 10, letterSpacing: '0.12em', textAlign: 'center' }}>
        {skin.name.toUpperCase()}
      </div>
      <button
        type="button"
        disabled={primaryDisabled}
        onClick={primaryAction}
        className="font-pix"
        style={{
          background: primaryBg,
          border: '2px solid ' + (equipped ? 'var(--base-cyan)' : 'var(--base-ivory)'),
          color: primaryColor,
          padding: '8px 10px',
          fontSize: 8,
          letterSpacing: '0.12em',
          width: '100%',
          minHeight: 34,
          opacity: primaryDisabled ? 0.7 : 1,
          cursor: primaryDisabled ? 'not-allowed' : 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

export default function ShopScreen({ onBack }: Props) {
  const { isConnected } = useAccount();
  const { mintSkin, status } = useSkinMint();
  const [owned, setOwned] = useState<Set<number>>(() => new Set(readLocalOwnedSkins()));
  const [equippedId, setEquippedId] = useState<number>(() => getEquippedSkinId());

  useEffect(() => {
    setOwned((prev) => {
      const next = new Set(prev);
      next.add(0);
      return next;
    });
  }, []);

  const onBuy = async (id: number) => {
    const res = await mintSkin(id);
    if (res.ok) {
      setOwned((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      // Auto-equip the freshly minted skin so the user immediately sees it on next run.
      setEquippedSkinId(id);
      setEquippedId(id);
    }
  };

  const onEquip = (id: number) => {
    setEquippedSkinId(id);
    setEquippedId(id);
  };

  // Promo skins (e.g. Streak Mask) are claimed from the Daily screen, not here.
  const visibleSkins = SKINS.filter((s) => !s.promo || owned.has(s.id));

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
        <div className="font-pix" style={{ color: 'var(--gold)', fontSize: 16, letterSpacing: '0.18em' }}>
          SHOP
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

      <div className="flex-1 overflow-y-auto px-4 py-4 safe-pad-bot" style={{ touchAction: 'pan-y' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            maxWidth: 560,
            margin: '0 auto',
          }}
        >
          {visibleSkins.map((s) => (
            <SkinCard
              key={s.id}
              skin={s}
              owned={owned.has(s.id)}
              equipped={equippedId === s.id}
              onBuy={() => onBuy(s.id)}
              onEquip={() => onEquip(s.id)}
              status={status}
              isConnected={isConnected}
            />
          ))}
        </div>

        <div className="flex justify-center mt-7">
          <CoinRow />
        </div>
      </div>
    </div>
  );
}
