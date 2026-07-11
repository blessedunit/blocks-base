import { useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';

export function useAutoConnect() {
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  useEffect(() => {
    if (isConnected) return;
    const inFrame = typeof window !== 'undefined' && window.parent !== window;
    if (!inFrame) return;
    const cb = connectors.find(
      (c) => c.id === 'coinbaseWalletSDK' || c.name?.toLowerCase().includes('coinbase'),
    );
    const candidate = cb ?? connectors[0];
    if (candidate) {
      try {
        connect({ connector: candidate });
      } catch {
        /* noop */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, connectors]);
}
