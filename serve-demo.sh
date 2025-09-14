#!/bin/bash

echo "🚀 Iniciando VentaLocal Demo Fiscal para NAVES..."
echo "======================================================"

# Verificar si http-server está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ npx no encontrado. Instalando Node.js..."
    exit 1
fi

# Navegar al directorio fiscal
cd /home/nordia/ventalocal/fiscal-addon/public

# Iniciar servidor demo
echo "📱 Demo accesible en:"
echo "   http://localhost:8080/demo-fiscal.html"
echo ""
echo "🏛️ Para NAVES 2024:"
echo "   - Demo completamente funcional"
echo "   - Simula integración con AFIP"
echo "   - Flujo completo venta → factura"
echo "   - Propuesta de valor clara"
echo ""
echo "Press Ctrl+C to stop demo server"
echo "======================================================"

npx http-server . -p 8080 -o demo-fiscal.html