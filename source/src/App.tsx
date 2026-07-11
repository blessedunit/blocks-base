import { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import LoreScreen from './components/LoreScreen';
import MenuScreen from './components/MenuScreen';
import GameCanvas from './components/GameCanvas';
import GameOverScreen from './components/GameOverScreen';
import LevelCompleteScreen from './components/LevelCompleteScreen';
import LevelSelectScreen, { markLevelCleared, recordLevelBest, setLevelsUnlocked } from './components/LevelSelectScreen';
import ShopScreen from './components/ShopScreen';
import DailyScreen, { dailyLevelIndex, markDailyClear } from './components/DailyScreen';
import Leaderboard from './components/Leaderboard';
import { useAutoConnect } from './hooks/useAutoConnect';
import { useDailyRecord } from './hooks/useSmartTransaction';
import { useStreak, streakMultiplier } from './hooks/useChainStatus';
import type { PlayerSize } from './game/engine';

interface PlayingScene {
  kind: 'playing';
  key: number;
  startLevel: number;
  startSize: PlayerSize;
  startScore: number;
  startLives: number;
  startCoins: number;
  startRunTimeMs: number;
}

type Scene =
  | { kind: 'splash' }
  | { kind: 'menu' }
  | { kind: 'lore' }
  | { kind: 'levelSelect' }
  | { kind: 'shop' }
  | { kind: 'daily' }
  | PlayingScene
  | { kind: 'levelClear'; score: number; coins: number; lives: number; size: PlayerSize; clearedLevel: number; runTimeMs: number; isLast: boolean; hint: string | null }
  | { kind: 'gameOver'; score: number; reachedLevel: number; runTimeMs: number; completed: boolean }
  | { kind: 'leaderboard' };

const FRESH_RUN = {
  startSize: 'small' as PlayerSize,
  startScore: 0,
  startLives: 3,
  startCoins: 0,
  startRunTimeMs: 0,
};

export default function App() {
  useAutoConnect();
  const { recordDaily } = useDailyRecord();
  const { streak, refresh: refreshStreak } = useStreak();
  const [scene, setScene] = useState<Scene>({ kind: 'splash' });

  // Portrait phones used to show a "rotate" overlay — removed. Game now adapts
  // to portrait viewports via GameCanvas's split layout. Nothing to do here.

  return (
    <div className="absolute inset-0">
      {scene.kind === 'splash' && (
        <SplashScreen onDone={() => setScene({ kind: 'menu' })} />
      )}
      {scene.kind === 'menu' && (
        <MenuScreen
          onPlay={() => setScene({ kind: 'lore' })}
          onLevelSelect={() => setScene({ kind: 'levelSelect' })}
          onLeaderboard={() => setScene({ kind: 'leaderboard' })}
          onShop={() => setScene({ kind: 'shop' })}
          onDaily={() => setScene({ kind: 'daily' })}
        />
      )}
      {scene.kind === 'levelSelect' && (
        <LevelSelectScreen
          onPick={(levelIndex) =>
            setScene({ kind: 'playing', key: Date.now(), startLevel: levelIndex, ...FRESH_RUN })
          }
          onBack={() => setScene({ kind: 'menu' })}
        />
      )}
      {scene.kind === 'shop' && (
        <ShopScreen onBack={() => setScene({ kind: 'menu' })} />
      )}
      {scene.kind === 'daily' && (
        <DailyScreen onBack={() => setScene({ kind: 'menu' })} />
      )}
      {scene.kind === 'lore' && (
        <LoreScreen
          onEnter={() => setScene({ kind: 'playing', key: Date.now(), startLevel: 0, ...FRESH_RUN })}
          onBack={() => setScene({ kind: 'menu' })}
        />
      )}
      {scene.kind === 'playing' && (
        <GameCanvas
          key={scene.key}
          startLevel={scene.startLevel}
          startSize={scene.startSize}
          startScore={scene.startScore}
          startLives={scene.startLives}
          startCoins={scene.startCoins}
          startRunTimeMs={scene.startRunTimeMs}
          onLevelClear={(score, coins, lives, size, clearedLevel, runTimeMs, isLast, hint) => {
            // Stamp local progression — unlocks the next level in LevelSelectScreen.
            markLevelCleared(clearedLevel);
            recordLevelBest(clearedLevel, score);
            // Hook daily clear if this is today's level — apply streak multiplier
            // to the recorded score so streaks pay off in the daily leaderboard.
            if (clearedLevel === dailyLevelIndex()) {
              const boosted = Math.floor(score * streakMultiplier(streak));
              markDailyClear(boosted);
              void recordDaily(boosted, runTimeMs, true).then(() => refreshStreak());
            }
            setScene({ kind: 'levelClear', score, coins, lives, size, clearedLevel, runTimeMs, isLast, hint });
          }}
          onGameOver={(score, reachedLevel, runTimeMs) =>
            setScene({ kind: 'gameOver', score, reachedLevel, runTimeMs, completed: false })
          }
          onGameComplete={(score, runTimeMs) => {
            // Full clear marks every level as locally cleared too.
            for (let i = 0; i < 16; i++) markLevelCleared(i);
            setLevelsUnlocked();
            if (dailyLevelIndex() === 15) {
              const boosted = Math.floor(score * streakMultiplier(streak));
              markDailyClear(boosted);
              void recordDaily(boosted, runTimeMs, true).then(() => refreshStreak());
            }
            setScene({ kind: 'gameOver', score, reachedLevel: 15, runTimeMs, completed: true });
          }}
          onQuit={() => setScene({ kind: 'menu' })}
        />
      )}
      {scene.kind === 'levelClear' && (
        <LevelCompleteScreen
          score={scene.score}
          coins={scene.coins}
          clearedLevel={scene.clearedLevel}
          runTimeMs={scene.runTimeMs}
          isLast={scene.isLast}
          hint={scene.hint}
          onNext={() =>
            setScene({
              kind: 'playing',
              key: Date.now(),
              startLevel: scene.clearedLevel + 1,
              startSize: scene.size,           // carry power-up forward
              startScore: scene.score,
              startLives: scene.lives,
              startCoins: scene.coins,
              startRunTimeMs: scene.runTimeMs,
            })
          }
          onMenu={() => setScene({ kind: 'menu' })}
        />
      )}
      {scene.kind === 'gameOver' && (
        <GameOverScreen
          score={scene.score}
          reachedLevel={scene.reachedLevel}
          runTimeMs={scene.runTimeMs}
          completed={scene.completed}
          onReplay={() => setScene({ kind: 'playing', key: Date.now(), startLevel: 0, ...FRESH_RUN })}
          onMenu={() => setScene({ kind: 'menu' })}
          onLeaderboard={() => setScene({ kind: 'leaderboard' })}
        />
      )}
      {scene.kind === 'leaderboard' && (
        <Leaderboard onBack={() => setScene({ kind: 'menu' })} />
      )}
    </div>
  );
}
