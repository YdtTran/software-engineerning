FROM node:22-slim

WORKDIR /srv/app

COPY app/package.json app/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY app/db ./db
COPY app/src ./src
COPY app/prototype ./prototype

RUN mkdir -p /data && chown node:node /data

USER node

ENV NODE_ENV=production \
    DEMO_HOST=0.0.0.0 \
    DEMO_DB_PATH=/data/hub.sqlite \
    DEMO_ACCOUNTS_FILE=/data/accounts.json \
    DEMO_SEED_MODE=dashboard \
    TRUST_PROXY=1

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const port = process.env.DEMO_PORT || process.env.PORT || 3000; fetch('http://127.0.0.1:' + port + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1));"

CMD ["node", "src/cloud-start.js"]
