// services/api-gateway/src/index.ts
import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import mercadopago from 'mercadopago';
import { Redis } from 'ioredis';

const app = fastify({ logger: true });
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Configure MercadoPago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN!,
});

// Healthcheck (no DB required)
app.get('/health', async () => ({ status: 'ok' }));

// Plugins
app.register(cors, {
  origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
});

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key',
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    authorize: (roles: string[]) => any;
  }
}

// Auth helpers
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
});

app.decorate('authorize', (roles: string[]) => {
  return async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const role = request.user?.role;
    if (roles.length && !roles.includes(role)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
});

app.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
});

// Global error handler
app.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';

  // Log error for monitoring
  request.log.error({
    err: error,
    req: { method: request.method, url: request.url },
    statusCode,
    errorCode
  }, 'API Error');

  // Don't expose internal error details in production
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : error.message;

  reply.code(statusCode).send({
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
    path: request.url
  });
});

// ============================================
// AUTH
// ============================================
app.post('/auth/login', async (request, reply) => {
  const { email, password } = (request as any).body || {};
  if (!email || !password) return reply.code(400).send({ error: 'Email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(401).send({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });

  const token = await reply.jwtSign({ sub: user.id, role: user.role, tenantId: user.tenantId });
  return { token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } };
});

app.get('/auth/me', { preHandler: app.authenticate }, async (request: any) => {
  return { user: request.user };
});

// Middleware: Extract tenant from subdomain or header
app.addHook('onRequest', async (request, reply) => {
  // Skip tenant resolution for health endpoint
  if (request.url.startsWith('/health')) {
    (request as any).tenantId = null;
    return;
  }
  const host = request.headers.host;
  const tenantHeader = request.headers['x-tenant-id'] as string;
  
  let tenantId: string | null = null;
  
  // Check subdomain
  if (host) {
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { slug: subdomain },
        });
        if (tenant) {
          tenantId = tenant.id;
        }
      } catch (err) {
        // If DB is not migrated yet, continue without tenant
        app.log.warn({ err }, 'Tenant lookup skipped');
      }
    }
  }
  
  // Override with header if present (accepts tenant id or slug)
  if (tenantHeader) {
    try {
      // Try as ID
      const byId = await prisma.tenant.findUnique({ where: { id: tenantHeader } });
      if (byId) {
        tenantId = byId.id;
      } else {
        const bySlug = await prisma.tenant.findUnique({ where: { slug: tenantHeader } });
        if (bySlug) tenantId = bySlug.id;
      }
    } catch (err) {
      app.log.warn({ err }, 'Tenant header lookup skipped');
    }
  }
  
  // Attach to request
  (request as any).tenantId = tenantId;
});

// ============================================
// ECOMMERCE ENDPOINTS
// ============================================

// Get products (public)
app.get('/api/products', async (request, reply) => {
  const tenantId = (request as any).tenantId;
  if (!tenantId) {
    return reply.code(400).send({ error: 'Tenant not found' });
  }
  
  const { category, search, featured, page = 1, limit = 20 } = request.query as any;
  
  // Check cache first
  const cacheKey = `products:${tenantId}:${category}:${search}:${featured}:${page}:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const where: any = {
    tenantId,
    status: 'ACTIVE',
  };
  
  if (category) {
    where.category = { slug: category };
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  if (featured === 'true') {
    where.featured = true;
  }
  
  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  
  const total = await prisma.product.count({ where });
  
  const response = {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(response));
  
  return response;
});

// Get single product
app.get('/api/products/:slug', async (request, reply) => {
  const tenantId = (request as any).tenantId;
  const { slug } = request.params as any;
  
  const product = await prisma.product.findFirst({
    where: {
      tenantId,
      slug,
      status: 'ACTIVE',
    },
    include: {
      category: true,
    },
  });
  
  if (!product) {
    return reply.code(404).send({ error: 'Product not found' });
  }
  
  return product;
});

// Create order
app.post('/api/orders', async (request, reply) => {
  const tenantId = (request as any).tenantId;
  const body = request.body as any;
  
  // Validate stock
  for (const item of body.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    
    if (!product || product.stock < item.quantity) {
      return reply.code(400).send({
        error: `Insufficient stock for ${product?.name || 'product'}`,
      });
    }
  }
  
  // Calculate totals
  let subtotal = 0;
  const orderItems = [];
  
  for (const item of body.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });
    
    const price = product?.salePrice || product?.price || 0;
    const itemTotal = Number(price) * item.quantity;
    subtotal += itemTotal;
    
    orderItems.push({
      productId: item.productId,
      name: product!.name,
      price,
      quantity: item.quantity,
      total: itemTotal,
    });
  }
  
  const shipping = body.shippingMethod === 'express' ? 500 : 0;
  const total = subtotal + shipping;
  
  // Create order
  const order = await prisma.order.create({
    data: {
      tenantId,
      email: body.email,
      name: body.name,
      phone: body.phone,
      subtotal,
      shipping,
      total,
      paymentMethod: body.paymentMethod,
      shippingAddress: body.shippingAddress,
      shippingMethod: body.shippingMethod,
      items: {
        create: orderItems,
      },
    },
    include: {
      items: true,
    },
  });
  
  // Update stock
  for (const item of orderItems) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: {
          decrement: item.quantity,
        },
      },
    });
    
    // Create inventory movement
    await prisma.inventoryMovement.create({
      data: {
        productId: item.productId,
        type: 'SALE',
        quantity: -item.quantity,
        reference: order.id,
        reason: `Order #${order.orderNumber}`,
      },
    });
  }
  
  // If MercadoPago, create preference
  if (body.paymentMethod === 'MERCADOPAGO') {
    const preference = {
      items: orderItems.map(item => ({
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
      })),
      back_urls: {
        success: `${process.env.FRONTEND_URL}/pedido/${order.id}/exito`,
        failure: `${process.env.FRONTEND_URL}/pedido/${order.id}/error`,
        pending: `${process.env.FRONTEND_URL}/pedido/${order.id}/pendiente`,
      },
      auto_return: 'approved',
      external_reference: order.id,
      notification_url: `${process.env.API_URL}/webhooks/mercadopago`,
    };
    
    const response = await mercadopago.preferences.create(preference);
    
    return {
      order,
      payment_url: response.body.init_point,
    };
  }
  
  return order;
});

// ============================================
// CRM ENDPOINTS
// ============================================

// Get leads for vendor
app.get('/api/crm/leads', {
  preHandler: [app.authenticate, app.authorize(['VENDOR'])],
}, async (request, reply) => {
  const user = (request as any).user;
  
  const { status, page = 1, limit = 20 } = request.query as any;
  
  const where: any = {
    vendorId: user.id,
  };
  
  if (status) {
    where.status = status;
  }
  
  const leads = await prisma.lead.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  
  const total = await prisma.lead.count({ where });
  
  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
});

// Create lead
app.post('/api/crm/leads', {
  preHandler: [app.authenticate, app.authorize(['VENDOR'])],
}, async (request, reply) => {
  const user = (request as any).user;
  const body = request.body as any;
  
  const lead = await prisma.lead.create({
    data: {
      vendorId: user.id,
      businessName: body.businessName,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      address: body.address,
      plan: body.plan,
      notes: body.notes,
      nextAction: body.nextAction,
    },
  });
  
  return lead;
});

// Convert lead to sale
app.post('/api/crm/leads/:id/convert', {
  preHandler: [app.authenticate, app.authorize(['VENDOR', 'ADMIN'])],
}, async (request, reply) => {
  const user = (request as any).user;
  const { id } = request.params as any;
  const body = request.body as any;

  const lead = await prisma.lead.findUnique({
    where: { id },
  });

  if (!lead || lead.vendorId !== user.id) {
    return reply.code(404).send({ error: 'Lead not found' });
  }

  if (lead.status === 'WON') {
    return reply.code(400).send({ error: 'Lead already converted' });
  }

  // Create tenant for the new client
  const tenant = await prisma.tenant.create({
    data: {
      slug: body.slug,
      name: lead.businessName,
      plan: lead.plan,
      billingEmail: lead.email,
      config: {
        phone: lead.phone,
        address: lead.address,
      },
    },
  });

  // Hash password before creating user
  const hashedPassword = await bcrypt.hash(body.password, 10);

  // Create admin user for the tenant
  const adminUser = await prisma.user.create({
    data: {
      email: lead.email,
      password: hashedPassword,
      name: lead.contactName,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });
  
  // Calculate commission
  const planPrices: any = {
    EMPRENDEDOR: 80000,
    COMERCIO: 150000,
    EMPRESA: 300000,
    MARKETPLACE: 500000,
  };
  
  const amount = planPrices[lead.plan];
  const commission = amount * (user.commissionRate || 0.3);
  
  // Create sale record
  const sale = await prisma.sale.create({
    data: {
      vendorId: user.id,
      plan: lead.plan,
      amount,
      commission,
      tenantId: tenant.id,
    },
  });
  
  // Update lead
  await prisma.lead.update({
    where: { id },
    data: {
      status: 'WON',
      saleId: sale.id,
    },
  });
  
  // Send welcome email
  // await sendWelcomeEmail(adminUser.email, tenant.slug);
  
  return {
    sale,
    tenant,
    loginUrl: `https://${tenant.slug}.ventalocal.com.ar/admin`,
  };
});

// Get vendor commissions
app.get('/api/crm/commissions', {
  preHandler: [app.authenticate, app.authorize(['VENDOR'])],
}, async (request, reply) => {
  const user = (request as any).user;
  
  const sales = await prisma.sale.findMany({
    where: { vendorId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  
  const stats = {
    totalSales: sales.length,
    totalAmount: sales.reduce((acc, s) => acc + Number(s.amount), 0),
    totalCommission: sales.reduce((acc, s) => acc + Number(s.commission), 0),
    pendingCommission: sales
      .filter(s => !s.commissionPaid)
      .reduce((acc, s) => acc + Number(s.commission), 0),
    paidCommission: sales
      .filter(s => s.commissionPaid)
      .reduce((acc, s) => acc + Number(s.commission), 0),
  };
  
  return {
    sales,
    stats,
  };
});

// ============================================
// ERP ENDPOINTS
// ============================================

// Get inventory movements
app.get('/api/erp/inventory/movements', {
  preHandler: [app.authenticate, app.authorize(['ADMIN', 'MANAGER'])],
}, async (request, reply) => {
  const tenantId = (request as any).tenantId;
  const { productId, type, from, to } = request.query as any;
  
  const where: any = {
    product: { tenantId },
  };
  
  if (productId) {
    where.productId = productId;
  }
  
  if (type) {
    where.type = type;
  }
  
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  
  const movements = await prisma.inventoryMovement.findMany({
    where,
    include: {
      product: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  
  return movements;
});

// Adjust inventory
app.post('/api/erp/inventory/adjust', {
  preHandler: [app.authenticate, app.authorize(['ADMIN', 'MANAGER'])],
}, async (request, reply) => {
  const body = request.body as any;
  
  const product = await prisma.product.findUnique({
    where: { id: body.productId },
  });
  
  if (!product) {
    return reply.code(404).send({ error: 'Product not found' });
  }
  
  // Create adjustment movement
  const movement = await prisma.inventoryMovement.create({
    data: {
      productId: body.productId,
      type: 'ADJUSTMENT',
      quantity: body.quantity,
      reason: body.reason,
      createdBy: (request as any).user.id,
    },
  });
  
  // Update product stock
  await prisma.product.update({
    where: { id: body.productId },
    data: {
      stock: {
        increment: body.quantity,
      },
    },
  });
  
  return movement;
});

// Get sales report
app.get('/api/erp/reports/sales', {
  preHandler: [app.authenticate, app.authorize(['ADMIN', 'MANAGER'])],
}, async (request, reply) => {
  const tenantId = (request as any).tenantId;
  const { from, to, groupBy = 'day' } = request.query as any;
  
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
      createdAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  
  // Group by period
  const grouped: any = {};
  
  orders.forEach(order => {
    const date = order.createdAt;
    let key: string;
    
    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (groupBy === 'week') {
      const week = Math.floor(date.getDate() / 7);
      key = `${date.getFullYear()}-W${week}`;
    } else if (groupBy === 'month') {
      key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    } else {
      key = date.getFullYear().toString();
    }
    
    if (!grouped[key]) {
      grouped[key] = {
        period: key,
        orders: 0,
        revenue: 0,
        products: 0,
        customers: new Set(),
      };
    }
    
    grouped[key].orders++;
    grouped[key].revenue += Number(order.total);
    grouped[key].products += order.items.reduce((acc, item) => acc + item.quantity, 0);
    grouped[key].customers.add(order.customerId || order.email);
  });
  
  // Convert to array and calculate customers
  const report = Object.values(grouped).map((item: any) => ({
    ...item,
    customers: item.customers.size,
  }));
  
  return {
    report,
    summary: {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((acc, o) => acc + Number(o.total), 0),
      avgOrderValue: orders.length ? 
        orders.reduce((acc, o) => acc + Number(o.total), 0) / orders.length : 0,
      topProducts: [], // TODO: Calculate top products
    },
  };
});

// ============================================
// WEBHOOKS
// ============================================

// MercadoPago webhook
app.post('/webhooks/mercadopago', async (request, reply) => {
  const { type, data } = request.body as any;
  
  if (type === 'payment') {
    const payment = await mercadopago.payment.findById(data.id);
    
    const orderId = payment.body.external_reference;
    const status = payment.body.status;
    
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: status === 'approved' ? 'PAID' : 'FAILED',
        paymentId: payment.body.id.toString(),
        status: status === 'approved' ? 'PROCESSING' : 'CANCELLED',
      },
    });
    
    // If paid, mark sale as paid
    if (status === 'approved') {
      // Find associated sale if exists
      // Update commission status
    }
  }
  
  return { received: true };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('API Gateway running on port 3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export default app;
