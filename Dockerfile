FROM node:24-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json server/
COPY web/package*.json web/
RUN cd server && npm ci && cd ../web && npm ci

COPY server server
COPY web web

RUN cd server && npx prisma generate && npm run build \
  && cd ../web && npm run build

ENV NODE_ENV=production \
    WEB_DIST=/app/web/dist \
    AUDIO_ROOT=/app/audio

WORKDIR /app/server
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/main.js"]
