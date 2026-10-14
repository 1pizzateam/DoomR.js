#!/bin/sh
# Entrypoint of the dev container: install dependencies when package.json or the lockfile
# changed since the last start, then run the Vite dev server, which watches the sources and
# reloads the page on every change.
#
# The install runs `npm i` in a temporary directory and copies the result into node_modules:
#  - `npm ci` straight into node_modules fails with EBUSY, because that directory is a mounted
#    volume and npm tries to delete the directory itself;
#  - installing in a temporary directory avoids modifying host files directly.
set -e

files="package.json"
if [ -f package-lock.json ]; then
  files="package.json package-lock.json"
fi

if command -v md5sum >/dev/null 2>&1; then
  hash=$(cat $files | md5sum | cut -d ' ' -f 1)
else
  hash=$(cat $files | md5 -q)
fi

if [ "$hash" != "$(cat node_modules/.install-hash 2>/dev/null)" ]; then
  echo "Installing dependencies..."
  tmp=$(mktemp -d)
  cp $files "$tmp"/
  (cd "$tmp" && npm i --ignore-scripts --no-fund --loglevel=error)
  find node_modules -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a "$tmp/node_modules/." node_modules/
  rm -rf "$tmp"
  echo "$hash" > node_modules/.install-hash
fi

exec npm run dev
