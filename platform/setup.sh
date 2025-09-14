#!/bin/bash

# 🚀 VentaLocal Platform - Setup Script
# This script sets up the entire development environment

set -e

echo "
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🚀 VentaLocal Platform - Setup Wizard                ║
║     Sistema eCommerce + CRM + ERP                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://docker.com"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met!${NC}"

# Create .env file
echo -e "\n${YELLOW}🔐 Setting up environment variables...${NC}"

if [ ! -f .env ]; then
    cat > .env << EOF
# Database
DATABASE_URL=postgresql://ventalocal:ventalocal2024@localhost:5432/ventalocal

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=$(openssl rand -hex 32)

# MercadoPago (obtain from https://www.mercadopago.com.ar/developers)
MP_ACCESS_TOKEN=TEST-YOUR-ACCESS-TOKEN-HERE
MP_PUBLIC_KEY=TEST-YOUR-PUBLIC-KEY-HERE

# Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=ventalocal
MINIO_SECRET_KEY=ventalocal2024
MINIO_USE_SSL=false

# Search
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=ventalocal_master_key_2024

# URLs
FRONTEND_URL=http://localhost:3001
ADMIN_URL=http://localhost:3002
CRM_URL=http://localhost:3003
API_URL=http://localhost:3000

# Plausible Analytics (optional)
PLAUSIBLE_SECRET=$(openssl rand -hex 32)

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ventalocal.com.ar

# WhatsApp Business API (optional)
WHATSAPP_API_KEY=
WHATSAPP_PHONE_ID=
EOF
    echo -e "${GREEN}✅ Environment file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping...${NC}"
fi

# Install dependencies
echo -e "\n${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Setup database
echo -e "\n${YELLOW}🗄️  Setting up database...${NC}"

# Start only database services
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Run migrations
echo "Running database migrations..."
npx prisma migrate dev --name init

# Seed database
echo -e "\n${YELLOW}🌱 Seeding database with demo data...${NC}"

cat > packages/database/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      slug: 'demo',
      name: 'Demo Store',
      plan: 'COMERCIO',
      status: 'ACTIVE',
      primaryColor: '#10b981',
      secondaryColor: '#f59e0b',
      billingEmail: 'demo@ventalocal.com.ar',
    },
  });

  console.log('✅ Created demo tenant');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin Demo',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created admin user (admin@demo.com / admin123)');

  // Create vendor user
  const vendor = await prisma.user.create({
    data: {
      email: 'vendedor@ventalocal.com',
      password: hashedPassword,
      name: 'Juan Vendedor',
      role: 'VENDOR',
      isVendor: true,
      commissionRate: 0.3,
    },
  });

  console.log('✅ Created vendor user (vendedor@ventalocal.com / admin123)');

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Electrodomésticos',
        slug: 'electrodomesticos',
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Tecnología',
        slug: 'tecnologia',
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Hogar',
        slug: 'hogar',
      },
    }),
  ]);

  console.log('✅ Created categories');

  // Create products
  const products = [
    {
      name: 'Heladera No Frost 430L',
      slug: 'heladera-no-frost-430l',
      price: 849000,
      salePrice: 799000,
      stock: 10,
      categoryId: categories[0].id,
      featured: true,
    },
    {
      name: 'Smart TV 50" 4K',
      slug: 'smart-tv-50-4k',
      price: 690000,
      salePrice: 650000,
      stock: 15,
      categoryId: categories[1].id,
      featured: true,
    },
    {
      name: 'Lavarropas 8kg Inverter',
      slug: 'lavarropas-8kg-inverter',
      price: 520000,
      stock: 8,
      categoryId: categories[0].id,
    },
    {
      name: 'Microondas 25L Digital',
      slug: 'microondas-25l-digital',
      price: 145000,
      stock: 20,
      categoryId: categories[0].id,
    },
    {
      name: 'Notebook Core i5 8GB',
      slug: 'notebook-core-i5-8gb',
      price: 780000,
      stock: 5,
      categoryId: categories[1].id,
      featured: true,
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        tenantId: tenant.id,
        status: 'ACTIVE',
        description: `${product.name} - Producto de alta calidad con garantía oficial`,
        images: ['https://via.placeholder.com/400'],
      },
    });
  }

  console.log('✅ Created sample products');

  // Create sample leads for CRM
  const leads = [
    {
      businessName: 'Ferretería Don José',
      contactName: 'José Martinez',
      email: 'jose@ferreteria.com',
      phone: '3794123456',
      plan: 'EMPRENDEDOR' as const,
      status: 'NEW' as const,
      probability: 80,
    },
    {
      businessName: 'Boutique María',
      contactName: 'María González',
      email: 'maria@boutique.com',
      phone: '3794234567',
      plan: 'COMERCIO' as const,
      status: 'CONTACTED' as const,
      probability: 60,
    },
  ];

  for (const lead of leads) {
    await prisma.lead.create({
      data: {
        ...lead,
        vendorId: vendor.id,
        notes: 'Lead generado desde demo',
      },
    });
  }

  console.log('✅ Created sample CRM leads');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

# Install bcryptjs for seeding
npm install bcryptjs @types/bcryptjs

# Run seed
npx tsx packages/database/seed.ts

# Start all services
echo -e "\n${YELLOW}🚀 Starting all services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Create MinIO buckets
echo -e "\n${YELLOW}📦 Setting up storage buckets...${NC}"
docker exec ventalocal-storage mc alias set local http://localhost:9000 ventalocal ventalocal2024
docker exec ventalocal-storage mc mb local/products --ignore-existing
docker exec ventalocal-storage mc mb local/uploads --ignore-existing
docker exec ventalocal-storage mc anonymous set public local/products
docker exec ventalocal-storage mc anonymous set public local/uploads

# Display success message
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 VentaLocal Platform setup completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

echo -e "\n📌 ${YELLOW}Available Services:${NC}"
echo -e "   ${GREEN}✅${NC} eCommerce Store:    http://localhost:3001"
echo -e "   ${GREEN}✅${NC} Admin Dashboard:    http://localhost:3002"
echo -e "   ${GREEN}✅${NC} CRM Application:    http://localhost:3003"
echo -e "   ${GREEN}✅${NC} API Gateway:        http://localhost:3000"
echo -e "   ${GREEN}✅${NC} MinIO Console:      http://localhost:9001"
echo -e "   ${GREEN}✅${NC} MeiliSearch:        http://localhost:7700"

echo -e "\n🔑 ${YELLOW}Demo Credentials:${NC}"
echo -e "   Admin:   admin@demo.com / admin123"
echo -e "   Vendor:  vendedor@ventalocal.com / admin123"

echo -e "\n💡 ${YELLOW}Next Steps:${NC}"
echo -e "   1. Configure MercadoPago credentials in .env"
echo -e "   2. Access admin dashboard to manage products"
echo -e "   3. Visit the store to see it in action"
echo -e "   4. Check CRM for lead management"

echo -e "\n📚 ${YELLOW}Useful Commands:${NC}"
echo -e "   npm run dev          - Start development servers"
echo -e "   npm run build        - Build for production"
echo -e "   docker-compose logs  - View service logs"
echo -e "   docker-compose down  - Stop all services"

echo -e "\n${GREEN}Happy coding! 🚀${NC}"
