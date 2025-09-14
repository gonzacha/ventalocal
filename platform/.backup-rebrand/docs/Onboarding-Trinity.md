# Onboarding Trinity

Objetivo: que cualquier integrante levante el entorno y haga su primer request en menos de 30 minutos.

## Requisitos
- Docker y Docker Compose
- Node.js 18+ (recomendado 20)

## Comandos clave
- `make dev` — Infraestructura (Postgres, Redis, MinIO, MeiliSearch), instalar deps, generar Prisma, migrar y arrancar API local en 3000.
- `make health` — Verifica estado de servicios y API.
- `make seed` — Carga datos de demostración (tenant `demo`, categorías, productos).
- `make down` — Detiene infraestructura.

## Pasos rápidos
1. `make dev`
2. `make seed`
3. `curl http://localhost:3000/health` → OK
4. `curl -H "x-tenant-id: demo" http://localhost:3000/api/products`

## Variables
- Copiar `services/api-gateway/.env.local.example` a `.env.local` si preferís `npm run dev:local`.
- Si tenés latencia con npm, podés forzar mirror: `NPM_REGISTRY=https://registry.npmmirror.com make dev`.

## Troubleshooting
- Puerto 3000 ocupado: `kill $(lsof -ti:3000)` y reintentar `make dev`.
- DB no migrada: `make prisma-migrate`.
- NPM timeout: usar `NPM_REGISTRY` de arriba.

## Endpoints
- Health: `GET http://localhost:3000/health`
- Productos: `GET http://localhost:3000/api/products` con header `x-tenant-id: demo`

¡Listo! Con esto el equipo queda operando y con datos demo.
