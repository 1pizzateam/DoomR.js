# DoomR development guide

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer
- Docker with Compose support, if you want to run the containers

No global tools are needed.

## Install

```sh
git clone https://github.com/1pizzateam/DoomR.js.git
cd DoomR.js
npm i
```

## Development

Start the Vite development server:

```sh
npm run dev
```

Open <http://localhost:5173>. Vite reloads the page when JavaScript or HTML
changes.

The game rules in `src/game.js` have no DOM dependency, so they are tested in
Node without a browser:

```sh
npm test
```

## Production build

```sh
npm run build
```

Vite writes the static site to `dist/`. To test that output locally:

```sh
npm run preview
```

Open <http://localhost:4173>.

## Docker

```sh
docker compose up
```

Open <http://localhost:5177>. The `doomr` service mounts the repository and
binds `node_modules` into a `node:22-alpine` container running the Vite
dev server (`npm run dev`), so the page reloads automatically whenever you
change a file. Stop it with `docker compose down`.

Bind mounts do not forward file system events reliably, so the service sets
`VITE_WATCH_POLLING=true` and `vite.config.js` turns on polling for the file
watcher. Polling stays off when you run `npm run dev` on the host.

The host port is 5177, so DoomR.js can run next to the other projects, which use
5173 and 5176.

## Dependencies

The libraries are the published `@1pizzateam/*` packages. BumpR and LoopR depend
on older Spock versions, so `overrides` in `package.json` pins a single Spock
copy. Two copies would break `instanceof Vec2` checks between the libraries.

## Available scripts

- `npm run dev` starts Vite with hot reload.
- `npm run build` creates the production site.
- `npm run preview` serves the production build locally.
- `npm start` is an alias for the preview server.
- `npm test` runs the headless level and simulation tests.
