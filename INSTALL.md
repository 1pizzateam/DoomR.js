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

### Development container (the default)

```sh
docker compose up
```

Open <http://localhost:5177>. The `doomr` service mounts the repository into a
`node:22-alpine` container and runs the Vite dev server, so the page reloads
by itself whenever you change a file. This is the default service, like the
dev servers of the other projects' websites. Stop it with `docker compose down`.

`scripts/dev-container.sh` is its entrypoint. It installs the dependencies into the
`node_modules` volume (which keeps the host `node_modules` out of the container)
on the first start and again whenever `package.json` or `package-lock.json`
change, then starts Vite. A restart without changes skips the install. The
install runs `npm i` in a temporary directory and copies the result over, because
`npm ci` straight into a mounted volume fails with `EBUSY`, and installing in a
temporary directory avoids modifying host files directly.

Bind mounts do not forward file system events reliably, so the service sets
`VITE_WATCH_POLLING=true` and `vite.config.js` turns on polling for the file
watcher. Polling stays off when you run `npm run dev` on the host. To also drop
the `node_modules` volume, use `docker compose down -v`.

The host port is 5177, so DoomR.js can run next to the other projects, which use
5173 and 5176.

### Production image

```sh
docker compose --profile prod up --build
```

Open <http://localhost:8081>. The Dockerfile uses two stages:

1. Node.js installs locked dependencies and runs the Vite build.
2. nginx receives only the generated `dist/` files and serves them on port 80.

The image contains a static snapshot of the build, so the container never picks
up source changes on its own. Rerun `docker compose --profile prod up --build`
after editing; without `--build` it reuses the previous image. The service
belongs to a Compose profile, so stop it with `docker compose --profile prod down`
(a plain `docker compose down` ignores profile services).

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
