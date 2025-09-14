# syntax=docker/dockerfile:1.5

# ---------- Base ----------
FROM node:20-bookworm-slim AS base
# Ajustes de npm para builds más estables (timeouts, sin audit/fund, menos logs)
ENV NODE_ENV=production \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_PROGRESS=false \
    NPM_CONFIG_LOGLEVEL=error \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_TIMEOUT=600000

# Permite sobreescribir el registry desde build-args si hace falta
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY}
# Toolchain y dumb-init (Debian)
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 g++ make dumb-init ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------- Dependencias de prod ----------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Usa lock si existe; si no, install. Con cache de npm.
RUN --mount=type=cache,target=/root/.npm bash -lc '\
  if [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install --prefer-offline; \
  fi'

# ---------- Desarrollo (opcional) ----------
FROM base AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm bash -lc '\
  if [ -f package-lock.json ]; then npm ci; else npm install; fi'
COPY . .
EXPOSE 3000
CMD ["npm","run","dev"]

# ---------- Build ----------
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm bash -lc '\
  if [ -f package-lock.json ]; then npm ci; else npm install; fi'
COPY . .
RUN npx prisma generate
RUN npm run build
# Deja solo dependencias de producción y evita descargas en etapas siguientes
RUN npm prune --omit=dev

# ---------- Producción ----------
FROM base AS production
WORKDIR /app

# Usuario no root
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

# Node_modules ya podados en builder + artefactos build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/dist   ./dist
COPY --from=builder --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Evita generar Prisma en producción (ya se generó en builder)

USER appuser
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["dumb-init","--"]
CMD ["npm","run","start:prod"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
