FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm i --ignore-scripts --no-fund

COPY index.html vite.config.js ./
COPY src ./src

RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --output-document=- http://127.0.0.1/ >/dev/null || exit 1
