import { createConfig, http } from 'wagmi';
import { base } from 'viem/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID || '786baff7abaeeeb5461f28683e5e23a6';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: 'BLOCKS', preference: 'all' }),
    injected({ target: 'metaMask' }),
    injected(),
    walletConnect({ projectId: WC_PROJECT_ID, showQrModal: false }),
  ],
  transports: { [base.id]: http('https://mainnet.base.org') },
});
