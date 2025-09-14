# 🏪 VentaLocal - El Ecosistema PyME 2.0

> E-commerce + Facturación + Gestión = Todo en uno

## 🚀 Demo NAVES 2024

### Inicio Rápido
```bash
cd /home/nordia/ventalocal
./serve-demo.sh
```

**Demo URL:** http://localhost:8080/demo-fiscal.html

### 🎯 Propuesta de Valor

| Beneficio | VentaLocal | Competencia |
|-----------|------------|-------------|
| **Costo inicial** | $0 (30 facturas gratis) | $800.000+ (Controlador Fiscal) |
| **Costo por factura** | $25 ARS | $50-80 ARS |
| **Setup time** | 5 minutos | 2-4 semanas |
| **Integración** | Todo en uno | 5+ sistemas separados |
| **Escalabilidad** | 1 a 1000+ sucursales | Limitada |

## 🏗️ Arquitectura

```
ventalocal/
├── platform/           # Plataforma e-commerce principal
├── fiscal-addon/        # Sistema fiscal independiente
│   ├── types/          # Interfaces TypeScript
│   ├── services/       # Lógica de negocio
│   └── public/         # Demo NAVES
└── serve-demo.sh       # Servidor demo
```

### Componentes Fiscales

- **MockTaxAdapter**: Simulador AFIP para demo
- **FiscalService**: Lógica central con outbox pattern
- **Demo HTML**: Interfaz profesional para presentación

## 🎭 Para la Presentación NAVES

### 1. Historia de Problema
- PyMEs pagan $800K+ en controladores fiscales
- Sistemas fragmentados (5+ herramientas)
- Complejidad técnica alta

### 2. Solución VentaLocal
- **Freemium**: 30 facturas gratis/mes
- **Pay-per-use**: $25 ARS por factura extra
- **Todo integrado**: E-commerce + Fiscal + Stock

### 3. Demo en Vivo
1. Abrir http://localhost:8080/demo-fiscal.html
2. Simular venta completa
3. Mostrar factura con CAE automático
4. Destacar tiempo de procesamiento (1-2 segundos)

### 4. Mercado
- 600,000+ PyMEs en Argentina
- 90% vende por WhatsApp
- TAM: $2.4B ARS anuales en facturación

## 💻 Desarrollo

### Platform Principal
```bash
cd platform
make dev  # Docker stack completo
```

### Solo Demo Fiscal
```bash
./serve-demo.sh  # Servidor independiente
```

## 🔮 Roadmap Post-NAVES

### Fase 1: Integración Real (30 días)
- [ ] Evaluar TusFacturasAPP vs AfipSDK
- [ ] Implementar adapter real
- [ ] Testing con AFIP Homologación

### Fase 2: Producción (60 días)
- [ ] Deploy en ventalocal.com.ar
- [ ] Integración completa platform + fiscal
- [ ] Onboarding primeros 100 clientes

### Fase 3: Escalamiento (90 días)
- [ ] Multi-tenant completo
- [ ] WhatsApp Business API
- [ ] Analytics y reporting

## 🏆 Métricas Objetivo NAVES

- **Impacto:** 600K+ PyMEs potenciales
- **Revenue:** $240M ARS/año proyectado
- **Diferenciación:** Único freemium fiscal en Argentina
- **Tracción:** Demo funcional + arquitectura escalable

---

**VentaLocal - Democratizando la tecnología para PyMEs argentinas** 🇦🇷