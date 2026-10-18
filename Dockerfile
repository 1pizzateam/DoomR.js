FROM node:22-alpine

LABEL org.opencontainers.image.description="DoomR.js (Vite, development)"

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm i --loglevel=error --ignore-scripts --no-fund

CMD [ "node", "--run", "dev" ]
