import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo data...')

  // Ensure tenant "demo"
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo Store',
      plan: 'COMERCIO',
      status: 'ACTIVE',
      config: { currency: 'ARS' },
    },
  })

  // Categories
  const catElectro = await prisma.category.upsert({
    where: { id: `seed-electro-${tenant.id}` },
    update: {},
    create: {
      id: `seed-electro-${tenant.id}`,
      tenantId: tenant.id,
      name: 'Electrónica',
      slug: 'electronica',
    },
  })

  const catHogar = await prisma.category.upsert({
    where: { id: `seed-hogar-${tenant.id}` },
    update: {},
    create: {
      id: `seed-hogar-${tenant.id}`,
      tenantId: tenant.id,
      name: 'Hogar',
      slug: 'hogar',
    },
  })

  // Products
  const productsData = [
    {
      tenantId: tenant.id,
      name: 'Auriculares Bluetooth',
      slug: 'auriculares-bluetooth',
      price: 19999,
      salePrice: 16999,
      stock: 25,
      status: 'ACTIVE',
      categoryId: catElectro.id,
    },
    {
      tenantId: tenant.id,
      name: 'Smartwatch Deportivo',
      slug: 'smartwatch-deportivo',
      price: 54999,
      stock: 15,
      status: 'ACTIVE',
      categoryId: catElectro.id,
      featured: true,
    },
    {
      tenantId: tenant.id,
      name: 'Cafetera Automática',
      slug: 'cafetera-automatica',
      price: 89999,
      stock: 8,
      status: 'ACTIVE',
      categoryId: catHogar.id,
    },
  ]

  for (const data of productsData) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: data.tenantId, slug: data.slug } },
      update: data,
      create: data,
    })
  }

  console.log('Seed completo. Usa header x-tenant-id: demo')
  // Ensure admin user for demo tenant
  const bcrypt = await import('bcrypt')
  const passwordHash = await bcrypt.hash('demo1234', 10)
  await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: { password: passwordHash, role: 'ADMIN', tenantId: tenant.id },
    create: {
      email: 'admin@demo.local',
      name: 'Admin Demo',
      password: passwordHash,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  })
  console.log('Usuario admin creado: admin@demo.local / demo1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
