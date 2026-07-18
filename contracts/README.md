# BLOCKS contracts

Three small, dependency-free Solidity contracts on Base mainnet (8453). No proxy, no admin over game data — scores are append-only events + per-player bests.

## BlocksRun — [`0xca00…86ed`](https://basescan.org/address/0xca00c5470caf234a0ad9bc495e71d680125386ed)

Global leaderboard.

- `recordRun(uint256 score, uint256 timeMs, uint8 levelsCleared)` — logs a `RunRecorded` event and updates the caller's `bestScore`; `bestTime` only counts full clears (`levelsCleared >= 16`).
- The client builds the leaderboard purely from `RunRecorded` logs — no backend.

## BlocksSkin — [`0x2bb2…843b`](https://basescan.org/address/0x2bb2ac4a4f568bb66150ee292792d14e52f8843b)

Skin shop.

- `mintSkin(uint8 skinId)` payable, fixed `PRICE = 0.0000111 ETH`.
- Ownership is a per-player bitmask (`ownedMask`) — one storage slot per player for up to 256 skins.
- `owner()` can `withdraw` accumulated ETH; it has no power over who owns which skin.

## BlocksDaily — [`0x77cd…d060`](https://basescan.org/address/0x77cd92cc91cb95abe40329ff1f285284644cd060)

Daily challenge ranking.

- `recordDailyRun(uint32 dayKey, uint256 score, uint256 timeMs, bool cleared)` — per-day, per-player bests + `DailyRunRecorded` event.
- `dayKey` is `YYYYMMDD` computed client-side; days are independent leaderboards.

## Test

```bash
npm install
npm test
```

`test.mjs` compiles each contract with solc and deploys the bytecode into an
in-memory EVM (`@ethereumjs/vm`), then drives real calls to assert the
invariants the client depends on — monotonic best score, full-clear-only best
time, per-day isolation, the skin price/id/ownership rules. No network or anvil
needed, so it runs the same locally and in CI.

`npm run check` is the faster compile-only gate (no execution) used as a
first pass.

## Deploy

```bash
npm install
PRIVATE_KEY=0x... node deploy.mjs
```

Compiles with solc (optimizer, 200 runs), deploys all three via viem, and writes `deployed.json` with addresses, ABIs, tx hashes and deploy blocks.
