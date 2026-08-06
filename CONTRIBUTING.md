# Contributing to BLOCKS

Thanks for taking a look. BLOCKS is a static site plus three small Solidity
contracts — no backend, no build secrets — so getting a dev loop running is quick.

## Repo layout

```
source/      the game: React 19 + Vite + TypeScript, wagmi/viem for the optional onchain layer
contracts/   three dependency-free contracts (BlocksRun / BlocksSkin / BlocksDaily) + solc scripts
docs/        ARCHITECTURE.md and screenshots
```

`docs/ARCHITECTURE.md` explains how the engine, renderer and onchain layer fit
together — worth a read before changing gameplay.

## Frontend (`source/`)

```bash
cd source
npm install
npm run dev        # Vite dev server
npm run typecheck  # tsc -b, no emit
npm test           # vitest (jsdom) — pure game-logic tests
npm run build      # tsc -b && vite build
```

Tests live next to the code as `*.test.ts` and run under jsdom, so anything that
touches `localStorage` or timing (skins, streaks, formatting) is testable without
a browser. Prefer adding a test for pure logic you change.

## Contracts (`contracts/`)

```bash
cd contracts
npm install
npm run check   # solc compile-only gate (fast)
npm test        # deploys each contract into an in-memory EVM and asserts invariants
```

`npm run check` is the quick pass; `npm test` actually exercises the contracts.
Both run in CI on every PR.

## Pull requests

- Branch off `main` (e.g. `test/…`, `feat/…`, `fix/…`, `docs/…`).
- Keep each PR focused; write a commit message that says *why*, not just *what*.
- CI must be green: the `build` job (typecheck + tests + build) and the
  `contracts` job (compile + tests) both have to pass.
- New gameplay tuning goes through `source/src/game/constants.ts`; new cosmetic
  skins through `source/src/game/skins.ts` (keep ids unique and add a test).

## Scope

This mirror is the open-source build of the game and its contracts. It is not the
place for deployment keys, environment values, or anything account-specific —
`.env` files and lockfiles are intentionally gitignored.
