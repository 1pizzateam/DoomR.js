FROM node:22-alpine

LABEL org.opencontainers.image.description="DoomR.js (Vite, development)"

WORKDIR /usr/src/doomr

CMD [ "node", "--run", "dev" ]
