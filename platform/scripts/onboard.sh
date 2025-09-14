#!/bin/bash

# ComercioYA Platform - Trinity Team Onboarding Script
# One-command setup for development environment

set -e

# Colors
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
RESET='\033[0m'

# Configuration
API_DIR="services/api-gateway"
ENV_FILE="$API_DIR/.env.local"
ENV_EXAMPLE="$API_DIR/.env.local.example"

echo -e "${CYAN}🚀 ComercioYA Platform - Trinity Team Onboarding${RESET}"
echo -e "${CYAN}=================================================${RESET}"
echo ""

# Step 1: Check prerequisites
echo -e "${CYAN}Step 1: Checking prerequisites...${RESET}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${RESET}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${RESET}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon is not running. Please start Docker.${RESET}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites OK${RESET}"
echo ""

# Step 2: Setup environment variables
echo -e "${CYAN}Step 2: Setting up environment...${RESET}"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo -e "${GREEN}✅ Created .env.local from template${RESET}"
    else
        echo -e "${YELLOW}⚠️  .env.local.example not found, creating basic .env.local${RESET}"
        cat > "$ENV_FILE" << EOL
# Development Environment Variables
NODE_ENV=development
DATABASE_URL=postgresql://ventalocal:ventalocal2024@localhost:5432/ventalocal
REDIS_URL=redis://localhost:6380
JWT_SECRET=dev-secret-key-change-in-production
MP_ACCESS_TOKEN=test_token
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=ventalocal
MINIO_SECRET_KEY=ventalocal2024
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=ventalocal_master_key_2024
EOL
    fi
else
    echo -e "${GREEN}✅ .env.local already exists${RESET}"
fi
echo ""

# Step 3: Start infrastructure services
echo -e "${CYAN}Step 3: Starting infrastructure services...${RESET}"
echo -e "${YELLOW}Starting PostgreSQL, Redis, MinIO, and MeiliSearch...${RESET}"

docker-compose -f docker-compose-minimal.yml up -d postgres redis minio meilisearch

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${RESET}"
sleep 10

# Check service health
echo -e "${CYAN}Checking service health...${RESET}"
for i in {1..30}; do
    if docker-compose -f docker-compose-minimal.yml ps | grep -q "Up (healthy)"; then
        break
    fi
    echo -n "."
    sleep 2
done
echo ""

docker-compose -f docker-compose-minimal.yml ps
echo ""

# Step 4: Install dependencies and setup database
echo -e "${CYAN}Step 4: Setting up API Gateway...${RESET}"
cd "$API_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${RESET}"
    # Try with timeout to avoid hanging
    timeout 300 npm install || {
        echo -e "${RED}❌ npm install timed out or failed${RESET}"
        echo -e "${YELLOW}💡 Try running: NPM_REGISTRY=https://registry.npm.taobao.org npm install${RESET}"
        exit 1
    }
else
    echo -e "${GREEN}✅ Dependencies already installed${RESET}"
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${RESET}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${RESET}"
npx prisma migrate dev --name init || {
    echo -e "${YELLOW}⚠️  Migration failed, trying to push schema...${RESET}"
    npx prisma db push
}

cd ../..

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${RESET}"
echo ""
echo -e "${CYAN}Next steps:${RESET}"
echo -e "1. Start the API: ${YELLOW}cd services/api-gateway && npm run dev${RESET}"
echo -e "2. Or use: ${YELLOW}make api-dev${RESET}"
echo -e "3. Visit: ${YELLOW}http://localhost:3000/health${RESET}"
echo -e "4. Seed data: ${YELLOW}make seed${RESET}"
echo ""
echo -e "${CYAN}Useful commands:${RESET}"
echo -e "• ${YELLOW}make help${RESET} - Show all available commands"
echo -e "• ${YELLOW}make ps${RESET} - Show running services"
echo -e "• ${YELLOW}make logs${RESET} - Show service logs"
echo -e "• ${YELLOW}make down${RESET} - Stop all services"
echo ""

# Optional: Start API automatically
read -p "$(echo -e ${YELLOW}Start API Gateway now? [y/N]:${RESET} )" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}Starting API Gateway...${RESET}"
    cd "$API_DIR"
    npm run dev
fi