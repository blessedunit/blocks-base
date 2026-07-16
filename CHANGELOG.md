# Changelog

## 0.1.1 — 2026-07-16

- Fix: daily check-in race — a not-yet-indexed tx could re-enable the button
  and allow a second wasted check-in (#3)
- Perf: incremental event-log scanning with a cached per-wallet cursor;
  unlock stops scanning entirely once earned (#4)
- Perf: leaderboard resumes from a cached snapshot instead of a full rescan;
  daily tab scans a bounded 39h block window
- Haptic tick on touch controls (#1)
- CI: contracts compile-check job (#2)
- Keyboard pause: Escape / P (music stops while paused)
- A11y: joystick labeled for assistive tech; podium and rescue scenes honor
  `prefers-reduced-motion`
- Line-ending normalization via `.gitattributes`

## 0.1.0 — 2026-07-12

- Auto-pause when the tab/app goes to background; music is silenced while paused
- Error boundary — crashes land on a pixel-styled RESTART card instead of a white screen
- Open Graph / Twitter social card + page description
- Talent Protocol project verification tag
- Web app manifest enriched (id, lang, categories); robots.txt
- Security headers (nosniff, referrer policy) + immutable caching for hashed assets
- Build: react/wallet vendor chunk split, typecheck script, Node 20 pin, `.env.example`
- CI: GitHub Actions build + typecheck
- Docs: architecture notes, contracts reference, controls table

## 0.0.1 — 2026-05-20

- Initial release: 16 stages across 4 worlds, boss fight, shop, daily challenge,
  onchain leaderboard on Base mainnet
