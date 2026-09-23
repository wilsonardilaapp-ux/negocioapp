const fs = require('fs');
const filePath = 'src/components/catalogo/purchase-modal.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Vincular channel al estado reactivo tipoEntrega
const oldChannelCalc = `const channel: CanalPedido = (origin === 'qr' || origin === 'mesa') ? 'mesa' : 'domicilio';`;
const newChannelCalc = `const channel: CanalPedido = (tipoEntrega === 'recoger_en_tienda' || origin === 'qr' || origin === 'mesa') ? 'mesa' : 'domicilio';`;

content = content.replace(oldChannelCalc, newChannelCalc);

// 2. Cambiar la etiqueta 'Recoger' por 'Sede' en el botón selector
content = content.replace(
  `<span className="text-sm font-bold">Recoger</span>`,
  `<span className="text-sm font-bold">Sede</span>`
);

// 3. Cambiar texto de envío en el resumen
content = content.replace(
  `: 'Gratis (recoger en tienda)'}`,
  `: 'Gratis (en sede)'}`
);

// 4. Cambiar mensaje de pedido listo
content = content.replace(
  `"Tu pedido estará listo para recoger en tienda muy pronto."`,
  `"Tu pedido estará listo en sede muy pronto."`
);

// 5. Ajustar el precio unitario del item en "Tu Pedido" para que sea reactivo al canal activo
const oldItemUnitPrice = `const itemUnitPrice = item.appliedPromotion?.discountedPrice ?? item.price;`;
const newItemUnitPrice = `const basePrice = item.basePrice ?? item.price;
            const itemUnitPrice = item.appliedPromotion?.discountedPrice ?? (planContext ? calcularPrecioCliente(basePrice, planContext, channel) : item.price);`;

content = content.replace(oldItemUnitPrice, newItemUnitPrice);

// Asegurar que calcularPrecioCliente esté importado
if (!content.includes('calcularPrecioCliente')) {
  content = content.replace(
    "import { calcularTarifaServicio,",
    "import { calcularTarifaServicio, calcularPrecioCliente,"
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Canal reactivo a Sede y etiqueta actualizada.');
