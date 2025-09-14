#!/bin/bash

# ComercioYA Platform - Prerequisites Check Script
# Validates system requirements before development setup

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Status tracking
ERRORS=0
WARNINGS=0

echo -e "${CYAN}🔍 ComercioYA Platform - Prerequisites Check${NC}"
echo "=================================================="
echo ""

# Function to check command availability
check_command() {
    local cmd="$1"
    local name="$2"
    local min_version="$3"
    local install_hint="$4"

    if command -v "$cmd" >/dev/null 2>&1; then
        local version=$($cmd --version 2>/dev/null | head -n1 || echo "unknown")
        echo -e "${GREEN}✅ $name found${NC} ($version)"

        # Version check if specified
        if [ -n "$min_version" ]; then
            local current_version=$($cmd --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -n1 || echo "0.0")
            if [ "$(printf '%s\n' "$min_version" "$current_version" | sort -V | head -n1)" != "$min_version" ]; then
                echo -e "${YELLOW}⚠️  Version $current_version is below recommended $min_version${NC}"
                ((WARNINGS++))
            fi
        fi
    else
        echo -e "${RED}❌ $name not found${NC}"
        if [ -n "$install_hint" ]; then
            echo -e "   ${YELLOW}Install: $install_hint${NC}"
        fi
        ((ERRORS++))
    fi
}

# Function to check port availability
check_port() {
    local port="$1"
    local service="$2"

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local process=$(lsof -Pi :$port -sTCP:LISTEN -t | head -n1)
        local process_name=$(ps -p $process -o comm= 2>/dev/null || echo "unknown")
        echo -e "${YELLOW}⚠️  Port $port ($service) is in use by PID $process ($process_name)${NC}"
        echo -e "   ${YELLOW}Stop with: kill $process${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ Port $port ($service) available${NC}"
    fi
}

# Function to check NPM registry connectivity
check_npm_registry() {
    local registry="$1"
    local timeout=5

    echo -n "Checking NPM registry connectivity ($registry)... "
    if curl -s --connect-timeout $timeout --max-time $timeout "$registry" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Reachable${NC}"
    else
        echo -e "${RED}❌ Unreachable or slow${NC}"
        echo -e "   ${YELLOW}Try mirror: NPM_REGISTRY=https://registry.npmmirror.com make dev${NC}"
        ((WARNINGS++))
    fi
}

# Function to check disk space
check_disk_space() {
    local required_gb=5
    local available_gb=$(df . | awk 'NR==2 {printf "%.1f", $4/1024/1024}')

    if (( $(echo "$available_gb >= $required_gb" | bc -l) )); then
        echo -e "${GREEN}✅ Disk space: ${available_gb}GB available${NC}"
    else
        echo -e "${YELLOW}⚠️  Disk space: Only ${available_gb}GB available (recommended: ${required_gb}GB+)${NC}"
        ((WARNINGS++))
    fi
}

# Check system commands
echo -e "${BLUE}📦 Checking system dependencies...${NC}"
check_command "docker" "Docker" "20.0" "https://docs.docker.com/get-docker/"
check_command "docker-compose" "Docker Compose" "1.29" "https://docs.docker.com/compose/install/"
check_command "node" "Node.js" "18.0" "https://nodejs.org/ (recommend v20 LTS)"
check_command "npm" "npm" "8.0" "comes with Node.js"
check_command "curl" "curl" "" "usually pre-installed"
check_command "lsof" "lsof" "" "sudo apt install lsof (Ubuntu) or brew install lsof (macOS)"
echo ""

# Check Docker daemon
echo -e "${BLUE}🐳 Checking Docker daemon...${NC}"
if docker info >/dev/null 2>&1; then
    local docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Docker daemon running${NC} (v$docker_version)"
else
    echo -e "${RED}❌ Docker daemon not running or not accessible${NC}"
    echo -e "   ${YELLOW}Start Docker Desktop or run: sudo systemctl start docker${NC}"
    ((ERRORS++))
fi
echo ""

# Check ports
echo -e "${BLUE}🔌 Checking port availability...${NC}"
check_port "3000" "API Gateway"
check_port "5432" "PostgreSQL"
check_port "6380" "Redis (custom)"
check_port "6379" "Redis (default)"
check_port "7700" "MeiliSearch"
check_port "9000" "MinIO"
check_port "9002" "MinIO Console"
echo ""

# Check NPM registry
echo -e "${BLUE}📡 Checking NPM registry...${NC}"
check_npm_registry "${NPM_REGISTRY:-https://registry.npmjs.org/}"
echo ""

# Check disk space (requires bc for floating point math)
echo -e "${BLUE}💾 Checking disk space...${NC}"
if command -v bc >/dev/null 2>&1; then
    check_disk_space
else
    echo -e "${YELLOW}⚠️  Cannot check disk space (bc not installed)${NC}"
    ((WARNINGS++))
fi
echo ""

# Check project structure
echo -e "${BLUE}📁 Checking project structure...${NC}"
required_files=(
    "docker-compose-minimal.yml"
    "services/api-gateway/package.json"
    "services/api-gateway/prisma/schema.prisma"
    "services/api-gateway/src/index.ts"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        ((ERRORS++))
    fi
done
echo ""

# Summary
echo "=================================================="
if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
    echo -e "${GREEN}🎉 All checks passed! Ready to run 'make dev'${NC}"
    exit 0
elif [[ $ERRORS -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found, but you can proceed with 'make dev'${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found. Please fix before running 'make dev'${NC}"
    if [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}   Also $WARNINGS warning(s) to consider${NC}"
    fi
    echo ""
    echo -e "${CYAN}Common fixes:${NC}"
    echo -e "• Install missing dependencies"
    echo -e "• Start Docker daemon"
    echo -e "• Free up conflicting ports"
    echo -e "• Check network connectivity"
    exit 1
fi