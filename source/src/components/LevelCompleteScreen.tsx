interface Props {
  score: number;
  coins: number;
  clearedLevel: number;
  runTimeMs: number;
  isLast: boolean;
  hint?: string | null;
  onNext: () => void;
  onMenu: () => void;
}

function formatTime(ms: number): string {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const ss = totalSec % 60;
  const mm = Math.floor(totalSec / 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export default function LevelCompleteScreen({ score, coins, clearedLevel, runTimeMs, isLast, hint, onNext, onMenu }: Props) {
  const worldNum = Math.floor(clearedLevel / 4) + 1;
  const stageNum = (clearedLevel % 4) + 1;
  const levelLabel = `${worldNum}-${stageNum}`;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6" style={{ background: 'var(--bg-deep)' }}>
      <div
        className="font-pix"
        style={{
          fontSize: 'clamp(36px, 10vw, 72px)',
          color: 'var(--base-cyan)',
          letterSpacing: '0.04em',
          textShadow: '4px 4px 0 #007599',
          lineHeight: 1,
        }}
      >
        CLEARED
      </div>

      <div className="font-pix mt-3" style={{ color: 'var(--base-mute)', fontSize: 10, letterSpacing: '0.22em' }}>
        LEVEL {levelLabel}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="font-pix" style={{ color: 'var(--base-mute)', fontSize: 9, letterSpacing: '0.22em' }}>SCORE</div>
        <div className="font-pix" style={{ color: 'var(--gold)', fontSize: 28 }}>
          {String(score).padStart(6, '0')}
        </div>
        <div className="font-pix" style={{ color: 'var(--gold)', fontSize: 10, letterSpacing: '0.22em' }}>
          COINS · {coins}
        </div>
        <div className="font-pix mt-2" style={{ color: 'var(--base-cyan)', fontSize: 14 }}>
          {formatTime(runTimeMs)}
        </div>
      </div>

      {hint && (
        <div
          className="font-vt mt-6 text-center"
          style={{
            color: 'var(--gold)',
            fontSize: 16,
            lineHeight: 1.4,
            maxWidth: 320,
            padding: '12px 16px',
            border: '2px solid rgba(255,210,63,0.45)',
            background: 'rgba(255,210,63,0.06)',
          }}
        >
          {hint}
        </div>
      )}

      <div className="mt-10 flex flex-col items-center gap-3 w-full max-w-[280px]">
        {!isLast && (
          <button onClick={onNext} className="pixel-btn w-full" style={{ fontSize: 14 }}>
            NEXT LEVEL
          </button>
        )}
        <button onClick={onMenu} className="pixel-btn pixel-btn-secondary w-full" style={{ fontSize: 11 }}>
          {isLast ? 'BACK TO MENU' : 'QUIT'}
        </button>
      </div>
    </div>
  );
}
