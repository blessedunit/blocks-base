import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: { include: ['@walletconnect/ethereum-provider'] },
  build: {
    rollupOptions: {
      output: {
        // Split the heavy wallet stack away from the game code so the canvas
        // engine loads and boots without waiting on wagmi/connectkit.
        manualChunks: {
          react: ['react', 'react-dom'],
          wallet: ['wagmi', 'viem', 'connectkit', '@tanstack/react-query'],
        },
      },
    },
  },
});
