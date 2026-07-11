import { useCallback, useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import {
  BUILDER_DATA_SUFFIX,
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  DAILY_ABI,
  DAILY_ADDRESS,
  SKIN_ABI,
  SKIN_ADDRESS,
  SKIN_PRICE_WEI,
  USE_CONTRACT,
  USE_DAILY,
  USE_SKIN,
  todayDayKey,
} from '../config/contract';

const LS_BEST_SCORE = 'blocks:bestScore';
const LS_BEST_TIME = 'blocks:bestTime';
const LS_OWNED_SKINS = 'blocks:ownedSkins';

export interface RecordResult {
  ok: boolean;
  simulated: boolean;
  txHash?: `0x${string}`;
  error?: string;
}

export type TxStatus = 'idle' | 'pending' | 'success' | 'error' | 'simulated';

// ── BlocksRun ────────────────────────────────────────────────────────────────
export function useSmartTransaction() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<TxStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const recordRun = useCallback(
    async (score: number, timeMs: number, levelsCleared: number): Promise<RecordResult> => {
      setError(null);
      try {
        const prevScore = Number(localStorage.getItem(LS_BEST_SCORE) ?? '0') || 0;
        if (score > prevScore) localStorage.setItem(LS_BEST_SCORE, String(score));
        if (levelsCleared >= 16) {
          const prevTime = Number(localStorage.getItem(LS_BEST_TIME) ?? '0') || 0;
          if (prevTime === 0 || timeMs < prevTime) localStorage.setItem(LS_BEST_TIME, String(timeMs));
        }
      } catch {
        /* noop */
      }
      if (!USE_CONTRACT || !isConnected || !address) {
        setStatus('simulated');
        await new Promise((r) => setTimeout(r, 280));
        return { ok: true, simulated: true };
      }
      try {
        setStatus('pending');
        const hash = await writeContractAsync({
          abi: CONTRACT_ABI,
          address: CONTRACT_ADDRESS,
          functionName: 'recordRun',
          args: [BigInt(score), BigInt(Math.floor(timeMs)), levelsCleared],
          chainId: 8453,
          dataSuffix: BUILDER_DATA_SUFFIX,
        });
        setStatus('success');
        return { ok: true, simulated: false, txHash: hash };
      } catch (e) {
        const msg = e instanceof Error ? (e as Error).message : 'failed';
        setError(msg);
        setStatus('error');
        return { ok: false, simulated: false, error: msg };
      }
    },
    [address, isConnected, writeContractAsync],
  );

  return { status, error, recordRun };
}

// ── BlocksSkin ───────────────────────────────────────────────────────────────
export function useSkinMint() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<TxStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const mintSkin = useCallback(
    async (skinId: number): Promise<RecordResult> => {
      setError(null);
      // Skins are PURCHASE-ONLY — no free/simulated grant. A skin can only be
      // owned after a real onchain mint tx succeeds, so unowned skins can never
      // be equipped without paying.
      if (!isConnected || !address) {
        setStatus('error');
        setError('connect wallet');
        return { ok: false, simulated: false, error: 'not connected' };
      }
      if (!USE_SKIN) {
        setStatus('error');
        setError('skin contract not live');
        return { ok: false, simulated: false, error: 'skin contract not live' };
      }
      try {
        setStatus('pending');
        const hash = await writeContractAsync({
          abi: SKIN_ABI,
          address: SKIN_ADDRESS,
          functionName: 'mintSkin',
          args: [skinId],
          value: SKIN_PRICE_WEI,
          chainId: 8453,
          dataSuffix: BUILDER_DATA_SUFFIX,
        });
        setStatus('success');
        try {
          const owned = JSON.parse(localStorage.getItem(LS_OWNED_SKINS) ?? '[]') as number[];
          if (!owned.includes(skinId)) {
            owned.push(skinId);
            localStorage.setItem(LS_OWNED_SKINS, JSON.stringify(owned));
          }
        } catch { /* noop */ }
        return { ok: true, simulated: false, txHash: hash };
      } catch (e) {
        const msg = e instanceof Error ? (e as Error).message : 'failed';
        setError(msg);
        setStatus('error');
        return { ok: false, simulated: false, error: msg };
      }
    },
    [address, isConnected, writeContractAsync],
  );

  return { status, error, mintSkin };
}

// ── BlocksDaily ──────────────────────────────────────────────────────────────
export function useDailyRecord() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<TxStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const recordDaily = useCallback(
    async (score: number, timeMs: number, cleared: boolean): Promise<RecordResult> => {
      setError(null);
      if (!USE_DAILY || !isConnected || !address) {
        setStatus('simulated');
        return { ok: true, simulated: true };
      }
      try {
        setStatus('pending');
        const hash = await writeContractAsync({
          abi: DAILY_ABI,
          address: DAILY_ADDRESS,
          functionName: 'recordDailyRun',
          args: [todayDayKey(), BigInt(score), BigInt(Math.floor(timeMs)), cleared],
          chainId: 8453,
          dataSuffix: BUILDER_DATA_SUFFIX,
        });
        setStatus('success');
        return { ok: true, simulated: false, txHash: hash };
      } catch (e) {
        const msg = e instanceof Error ? (e as Error).message : 'failed';
        setError(msg);
        setStatus('error');
        return { ok: false, simulated: false, error: msg };
      }
    },
    [address, isConnected, writeContractAsync],
  );

  return { status, error, recordDaily };
}

export function readLocalBestScore(): number {
  try { return Number(localStorage.getItem(LS_BEST_SCORE) ?? '0') || 0; } catch { return 0; }
}

export function readLocalBestTime(): number {
  try { return Number(localStorage.getItem(LS_BEST_TIME) ?? '0') || 0; } catch { return 0; }
}

export function readLocalOwnedSkins(): number[] {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_OWNED_SKINS) ?? '[]') as number[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
