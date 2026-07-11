// ─────────────────────────────────────────────────────────────────────────────
// Address + use-flag wiring for all three BLOCKS contracts on Base mainnet.
// All three are independent. The game gracefully degrades to localStorage when
// VITE_USE_CONTRACT≠true or wallet is disconnected.
// ─────────────────────────────────────────────────────────────────────────────

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

function pickAddr(envValue: string | undefined): `0x${string}` {
  const v = (envValue ?? '').trim();
  if (ADDR_RE.test(v) && v.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
    return v as `0x${string}`;
  }
  return '0x0000000000000000000000000000000000000000' as `0x${string}`;
}

function pickBlock(envValue: string | undefined): bigint {
  const v = (envValue ?? '').trim();
  if (!v) return 0n;
  try { return BigInt(v); } catch { return 0n; }
}

const ENV_USE = (import.meta.env.VITE_USE_CONTRACT ?? '').toString().trim().toLowerCase() === 'true';

// BlocksRun — main per-player leaderboard (used by every run).
export const CONTRACT_ADDRESS = pickAddr(import.meta.env.VITE_CONTRACT_ADDRESS);
export const DEPLOY_BLOCK = pickBlock(import.meta.env.VITE_DEPLOY_BLOCK);

// BlocksSkin — paid skin minting at 0.0000111 ETH.
export const SKIN_ADDRESS = pickAddr(import.meta.env.VITE_SKIN_ADDRESS);
export const SKIN_DEPLOY_BLOCK = pickBlock(import.meta.env.VITE_SKIN_DEPLOY_BLOCK);

// BlocksDaily — per-day score+time per player.
export const DAILY_ADDRESS = pickAddr(import.meta.env.VITE_DAILY_ADDRESS);
export const DAILY_DEPLOY_BLOCK = pickBlock(import.meta.env.VITE_DAILY_DEPLOY_BLOCK);

const ZERO = '0x0000000000000000000000000000000000000000';
export const USE_CONTRACT = ENV_USE && CONTRACT_ADDRESS.toLowerCase() !== ZERO;
export const USE_SKIN = ENV_USE && SKIN_ADDRESS.toLowerCase() !== ZERO;
export const USE_DAILY = ENV_USE && DAILY_ADDRESS.toLowerCase() !== ZERO;

// Builder-code attribution suffix for `bc_pl8paawq` — appended to every onchain
// tx so Base attributes the activity to this app (powers base.dev analytics +
// qualifies for Base rewards). Derived via:
//   import { Attribution } from 'ox/erc8021'
//   Attribution.toDataSuffix({ codes: ['bc_pl8paawq'] })
export const BUILDER_DATA_SUFFIX =
  '0x62635f706c3870616177710b0080218021802180218021802180218021' as `0x${string}`;

// ── ABIs ────────────────────────────────────────────────────────────────────

// BlocksRun: recordRun(score, timeMs, levelsCleared) + bestScore + bestTime view.
// Event RunRecorded(player, score, timeMs, levelsCleared).
export const CONTRACT_ABI = [
  {
    type: 'function',
    name: 'recordRun',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'score', type: 'uint256' },
      { name: 'timeMs', type: 'uint256' },
      { name: 'levelsCleared', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'bestScore',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'bestTime',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'RunRecorded',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
      { name: 'timeMs', type: 'uint256', indexed: false },
      { name: 'levelsCleared', type: 'uint8', indexed: false },
    ],
  },
] as const;

// BlocksSkin: mintSkin(uint8) payable @ 0.0000111 ETH; isOwned + ownedMask views.
export const SKIN_ABI = [
  {
    type: 'function',
    name: 'PRICE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'mintSkin',
    stateMutability: 'payable',
    inputs: [{ name: 'skinId', type: 'uint8' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'isOwned',
    stateMutability: 'view',
    inputs: [
      { name: 'player', type: 'address' },
      { name: 'skinId', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'ownedMask',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: 'mask', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'SkinMinted',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'skinId', type: 'uint8', indexed: true },
      { name: 'paid', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const SKIN_PRICE_WEI = 11100000000000n; // 0.0000111 ETH in wei

// BlocksDaily: recordDailyRun(dayKey, score, timeMs, cleared) + per-day bests.
export const DAILY_ABI = [
  {
    type: 'function',
    name: 'recordDailyRun',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dayKey', type: 'uint32' },
      { name: 'score', type: 'uint256' },
      { name: 'timeMs', type: 'uint256' },
      { name: 'cleared', type: 'bool' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'bestScore',
    stateMutability: 'view',
    inputs: [
      { name: 'dayKey', type: 'uint32' },
      { name: 'player', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'bestTime',
    stateMutability: 'view',
    inputs: [
      { name: 'dayKey', type: 'uint32' },
      { name: 'player', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'DailyRunRecorded',
    inputs: [
      { name: 'dayKey', type: 'uint32', indexed: true },
      { name: 'player', type: 'address', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
      { name: 'timeMs', type: 'uint256', indexed: false },
      { name: 'cleared', type: 'bool', indexed: false },
    ],
  },
] as const;

/// Compute the YYYYMMDD day key as a uint32 for the daily contract.
export function todayDayKey(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
