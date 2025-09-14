#!/bin/bash

echo "🧉 Iniciando LitoraliaStore Demo - El Mejor E-commerce de Mates!"
echo "=============================================================="

# Verificar si http-server está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ npx no encontrado. Instalando Node.js..."
    exit 1
fi

# Navegar al directorio fiscal
cd /home/nordia/ventalocal/fiscal-addon/public

# Iniciar servidor demo
echo "🛒 LitoraliaStore accesible en:"
echo "   http://localhost:8080/litoralia-store.html"
echo ""
echo "🧉 Catálogo completo:"
echo "   • Mate Imperial Calabaza - $3150 (30% OFF)"
echo "   • Bombilla Alpaca Premium - $1500 (25% OFF)"
echo "   • Yerba Premium Litoral x1kg - $2000 (20% OFF)"
echo "   • Termo Stanley 1L Verde - $8900"
echo "   • Kit Matero Completo - $9990 (COMBO)"
echo "   • Azúcar Orgánica 500g - $850"
echo ""
echo "💡 Funcionalidades:"
echo "   ✅ Carrito de compras funcional"
echo "   ✅ Integración con VentaLocal"
echo "   ✅ Facturación automática AFIP"
echo "   ✅ Efectos visuales de conversión"
echo "   ✅ Diseño mobile-first"
echo ""
echo "Press Ctrl+C to stop demo server"
echo "=============================================================="

npx http-server . -p 8080 -o litoralia-store.html