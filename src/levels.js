/**
 * Level list, loaded from the MappR level config files in `./levels/*.mappr.json` (sorted by file name, so E1M1 first).
 * Edit them with MappR; this module only adapts them to the plain definitions `Level` takes.
 *
 * Under Vite the files are globbed at build time; under plain node (tests) they are read from disk.
 */
const META_KEYS = new Set(['format', 'version', 'id', 'width', 'height', 'comments']);

function toDefinition(data) {
  const def = {};
  for (const key of Object.keys(data))
    if (!META_KEYS.has(key))
      def[key] = data[key];
  return def;
}

async function loadFiles() {
  try {
    const globbed = import.meta.glob('./levels/*.mappr.json', { eager: true, import: 'default' });
    return Object.keys(globbed).sort().map((key) => globbed[key]);
  } catch {
    const fs = await import(/* @vite-ignore */ 'node:fs');
    const dir = new URL('./levels/', import.meta.url);
    return fs.readdirSync(dir)
      .filter((name) => name.endsWith('.mappr.json'))
      .sort()
      .map((name) => JSON.parse(fs.readFileSync(new URL(name, dir), 'utf8')));
  }
}

export const LEVELS = (await loadFiles()).map(toDefinition);
