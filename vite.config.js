import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usePolling = process.env.VITE_WATCH_POLLING === 'true';

// ROOSTR_LOCAL=../RoostR.js npm run dev tests an unpublished RoostR build (run its `build:lib` first).
// Spock is aliased too, so the library and the game share one copy and `instanceof Vec2` keeps working.
const localRoostr = process.env.ROOSTR_LOCAL;
const localFacerDist = path.resolve(__dirname, '../FaceR.js/dist/facer.js');
const localGroovrDist = path.resolve(__dirname, '../GroovR.js/dist/groovr.js');
const alias = {
  ...(fsSync.existsSync(localFacerDist) ? { '@1pizzateam/facer': localFacerDist } : {}),
  ...(fsSync.existsSync(localGroovrDist) ? { '@1pizzateam/groovr': localGroovrDist } : {}),
  ...(localRoostr
    ? {
        '@1pizzateam/roostr': fileURLToPath(new URL(`${localRoostr}/dist/roostr.js`, import.meta.url)),
        '@1pizzateam/spock': fileURLToPath(new URL('./node_modules/@1pizzateam/spock/dist/spock.js', import.meta.url)),
      }
    : {}),
};

function facerLiveReloadPlugin() {
  return {
    name: 'doomr-facer-live-reload',
    handleHotUpdate({ file, server }) {
      const resolved = path.resolve(file);
      if (/\.(facer|facerhead|facerhair|facerprofile)\.json$/i.test(file) || resolved === localFacerDist || resolved === localGroovrDist) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
    configureServer(server) {
      if (fsSync.existsSync(localFacerDist)) {
        server.watcher.add(localFacerDist);
      }
      if (fsSync.existsSync(localGroovrDist)) {
        server.watcher.add(localGroovrDist);
      }
      server.middlewares.use((req, res, next) => {
        if (req.url && /\.(facer|facerhead|facerhair|facerprofile)\.json(\?|$)/i.test(req.url)) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [facerLiveReloadPlugin()],
  // FaceR ships beside the game; one copy of Spock and RoostR keeps `instanceof Vec3` working across them
  resolve: { alias, dedupe: ['@1pizzateam/spock', '@1pizzateam/roostr', '@1pizzateam/facer', '@1pizzateam/groovr'] },
  optimizeDeps: {
    exclude: ['@1pizzateam/groovr', '@1pizzateam/roostr', '@1pizzateam/facer'],
  },
  server: {
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
    fs: { allow: ['..'] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
