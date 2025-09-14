# 🚀 VentaLocal Platform
> Sistema integral eCommerce + CRM + ERP para comercios regionales

## 📋 Arquitectura del Proyecto

```
ventalocal-platform/
├── apps/
│   ├── ecommerce/          # Tienda frontend (Next.js)
│   ├── admin-dashboard/    # Panel admin tienda (React)
│   ├── crm/               # CRM ventas y clientes
│   ├── erp/               # ERP gestión interna
│   └── marketplace/       # Futuro marketplace regional
├── services/
│   ├── api-gateway/       # Kong/Express Gateway
│   ├── auth-service/      # JWT + OAuth2
│   ├── catalog-service/   # Productos y categorías
│   ├── order-service/     # Pedidos y pagos
│   ├── customer-service/  # Clientes y CRM
│   ├── inventory-service/ # Stock y almacenes
│   ├── billing-service/   # Facturación AFIP
│   └── analytics-service/ # Métricas y BI
├── packages/
│   ├── shared-types/      # TypeScript types
│   ├── ui-components/     # Design system
│   └── utils/            # Helpers comunes
└── infrastructure/
    ├── docker/           # Containers
    ├── k8s/             # Kubernetes configs
    └── terraform/       # IaC para cloud
```

## 🎯 Roadmap de Desarrollo

### FASE 1: MVP Básico (Mes 1)
- [x] eCommerce básico funcional
- [x] Panel admin productos
- [x] Integración Mercado Pago
- [x] Deploy manual VPS

### FASE 2: CRM + Automatización (Mes 2-3)
- [ ] CRM vendedores
- [ ] Pipeline ventas
- [ ] Comisiones automáticas
- [ ] Onboarding wizard

### FASE 3: ERP + Integraciones (Mes 4-6)
- [ ] Gestión inventario multi-deposito
- [ ] Facturación AFIP
- [ ] Contabilidad básica
- [ ] API REST completa

### FASE 4: Marketplace (Mes 7-12)
- [ ] Multi-vendor support
- [ ] Commission engine
- [ ] Logistics management
- [ ] Regional expansion

## 🛠️ Stack Tecnológico

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 14 + Tailwind | SEO + Performance |
| Backend | Node.js + Fastify | Speed + Scalability |
| Database | PostgreSQL + Redis | Relational + Cache |
| Queue | BullMQ | Background jobs |
| Storage | MinIO (S3 compatible) | Self-hosted images |
| Search | MeiliSearch | Fast product search |
| Analytics | Plausible | Privacy-first |
| Monitoring | Grafana + Prometheus | Observability |

## 🚀 Quick Start

```bash
# Clonar repositorio
git clone https://github.com/ventalocal/platform.git
cd ventalocal-platform

# Instalar dependencias
npm install

# Configurar ambiente
cp .env.example .env.local

# Iniciar desarrollo
npm run dev

# Build producción
npm run build
npm run start
```

## 📊 Modelo de Datos Principal

```sql
-- Productos (multi-tenant)
products (
  id, tenant_id, name, slug, price, 
  sale_price, stock, category_id, 
  attributes JSONB, images JSONB
)

-- Pedidos
orders (
  id, tenant_id, customer_id, items JSONB,
  total, status, payment_method, 
  payment_id, shipping_address JSONB
)

-- CRM Leads
crm_leads (
  id, vendor_id, business_name, contact,
  status, plan_interested, notes,
  next_action, probability
)

-- ERP Inventory
inventory_movements (
  id, tenant_id, product_id, type,
  quantity, from_location, to_location,
  cost, reason, timestamp
)
```

## 💰 Planes y Pricing

| Plan | Precio Anual | Comisión Vendedor | Features |
|------|--------------|-------------------|----------|
| **EMPRENDEDOR** | $80.000 | $24.000 | 500 productos, hosting compartido |
| **COMERCIO** | $150.000 | $45.000 | Ilimitado, hosting premium, email marketing |
| **EMPRESA** | $300.000 | $90.000 | Multi-sucursal, API, app móvil |
| **MARKETPLACE** | $500.000 | $150.000 | Multi-vendor, logistics, B2B |

## 🔗 Integraciones Disponibles

- ✅ Mercado Pago (checkout + suscripciones)
- ✅ WhatsApp Business API
- ✅ Correo Argentino / OCA
- 🔄 AFIP Facturación Electrónica
- 🔄 Tango Gestión
- 📅 Google Calendar (citas)
- 📅 Sistemas bancarios (conciliación)

## 📞 Contacto y Soporte

- **Sales:** ventas@ventalocal.com.ar
- **Support:** soporte@ventalocal.com.ar
- **WhatsApp:** +54 9 379 XXX-XXXX
- **Docs:** docs.ventalocal.com.ar

---
© 2024 VentaLocal - Plataforma eCommerce Regional
