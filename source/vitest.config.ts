import { defineConfig } from 'vitest/config';

// jsdom gives the pure game-logic modules a localStorage + document to run
// against without a real browser. Tests live next to the code as *.test.ts.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
