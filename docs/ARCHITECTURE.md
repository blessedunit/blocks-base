# Architecture

BLOCKS is a static site plus three contracts. There is no server: the game runs entirely in the browser, and the leaderboard is reconstructed from onchain event logs.

```
source/src/
├── game/          pure TypeScript, no React
│   ├── engine.ts     game state + fixed-timestep physics (60 logical Hz)
│   ├── world.ts      16 level definitions as tilemaps + entity spawns
│   ├── renderer.ts   canvas 2D drawing, camera, HUD
│   ├── sprites.ts    all pixel art, drawn in code (no image assets)
│   ├── audio.ts      procedural chiptune sequencer via Web Audio
│   ├── skins.ts      player skin palette swaps
│   └── constants.ts  physics tuning, scoring table
├── components/    React shell — menus, overlays, wallet screens
├── hooks/         wallet glue (auto-connect, tx submission, streaks)
└── config/        contract addresses/ABIs, wagmi config
```

## Game loop

`GameCanvas` owns a `requestAnimationFrame` loop. Frame delta is clamped at 100 ms, then drained into fixed 16.6 ms physics substeps (max 8 per frame) — game speed is identical at 30 fps and 144 fps. Rendering is done once per frame at a logical 320×224, integer-scaled to the viewport with `image-rendering: pixelated`.

React never touches per-frame state: the engine mutates a single `GameState` object held in a ref, and React only re-renders on scene changes (menu → playing → game over).

## Physics

Tilemap AABB with axis-separated sweeps: horizontal movement resolves before vertical, one tile at a time, which makes corner clipping impossible at any speed. Player feel comes from variable-height jumps, coyote time and a jump buffer.

## Audio

No audio files. `audio.ts` is a step sequencer over Web Audio oscillators — four themes (overworld / underground / sky / castle) defined as note tables, plus one-shot SFX envelopes. The whole soundtrack costs zero bytes of network.

## Onchain layer

The wallet stack (wagmi + viem + ConnectKit) is isolated in `hooks/` and `config/`. Every write is optional: if `VITE_USE_CONTRACT` is off or the wallet is disconnected, the same code paths fall back to `localStorage`. The leaderboard reads `RunRecorded` events in 5000-block chunks from the deploy block — the contract is the database.
