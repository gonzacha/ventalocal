#!/bin/bash

echo "📱 Iniciando VentaLocal Mobile - Punto de Venta Inteligente"
echo "========================================================="

# Verificar si http-server está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ npx no encontrado. Instalando Node.js..."
    exit 1
fi

# Navegar al directorio fiscal
cd /home/nordia/ventalocal/fiscal-addon/public

# Iniciar servidor demo
echo "🚀 VentaLocal Mobile accesible en:"
echo "   http://localhost:8080/ventalocal-mobile.html"
echo ""
echo "📱 CARACTERÍSTICAS PRINCIPALES:"
echo "   ✅ Scanner QR/Códigos de barras nativo"
echo "   ✅ Gestión de stock en tiempo real"
echo "   ✅ Sistema de cajeros y turnos"
echo "   ✅ Facturación AFIP automática"
echo "   ✅ Estadísticas de ventas diarias"
echo "   ✅ Modo offline (PWA)"
echo "   ✅ Sin periféricos - Solo celular"
echo ""
echo "🛒 FLUJO DE TRABAJO:"
echo "   1. Escanear código → 2. Ajustar cantidad → 3. Agregar al carrito"
echo "   4. Cobrar y facturar → 5. Cliente recibe factura automáticamente"
echo ""
echo "⚙️ ADMINISTRACIÓN:"
echo "   • Tab 'Stock': Gestionar productos y precios"
echo "   • Tab 'Admin': Configurar comercio y ver estadísticas"
echo "   • Exportar datos para backup"
echo ""
echo "💡 PARA COMERCIANTES:"
echo "   • Interfaz súper simple - No necesita conocimientos técnicos"
echo "   • Funciona 100% desde el celular"
echo "   • Facturación automática con VentaLocal"
echo "   • Reemplaza: Escáner + Caja registradora + Software fiscal"
echo ""
echo "Press Ctrl+C to stop mobile server"
echo "========================================================="

npx http-server . -p 8080 -o ventalocal-mobile.html