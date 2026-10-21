import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const usePolling = process.env.VITE_WATCH_POLLING === 'true';

// ROOSTR_LOCAL=../RoostR.js npm run dev tests an unpublished RoostR build (run its `build:lib` first).
// Spock is aliased too, so the library and the game share one copy and `instanceof Vec2` keeps working.
const localRoostr = process.env.ROOSTR_LOCAL;
const alias = localRoostr
  ? {
      '@1pizzateam/roostr': fileURLToPath(new URL(`${localRoostr}/dist/roostr.js`, import.meta.url)),
      '@1pizzateam/spock': fileURLToPath(new URL('./node_modules/@1pizzateam/spock/dist/spock.js', import.meta.url)),
    }
  : {};

export default defineConfig({
  base: './',
  resolve: { alias },
  optimizeDeps: {
    exclude: ['@1pizzateam/groovr', '@1pizzateam/roostr'],
  },
  server: {
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    fs: { allow: ['..'] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
