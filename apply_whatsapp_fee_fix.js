const fs = require('fs');
const filePath = 'src/components/catalogo/purchase-modal.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Actualizar encabezado del pedido en Sede
content = content.replace(
  "orderSummary += `${emoStore} NUEVO PEDIDO PARA RECOGER EN TIENDA\\n`;",
  "orderSummary += `${emoStore} NUEVO PEDIDO PARA ENTREGA EN SEDE\\n`;"
);

// 2. Inyectar la línea de Tarifa de servicio en el resumen de WhatsApp
const targetEnvioLine = `orderSummary += \`Envío:         \${tipoEntrega === 'domicilio' ? formatCurrency(deliveryFee).padStart(12) : 'Gratis'.padStart(12)}\\n\`;`;

const newBreakdownBlock = `${targetEnvioLine}

        if (serviceFee > 0) {
            orderSummary += \`Tarifa servicio: \${formatCurrency(serviceFee).padStart(11)}\\n\`;
        }`;

if (content.includes(targetEnvioLine) && !content.includes("Tarifa servicio:")) {
  content = content.replace(targetEnvioLine, newBreakdownBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Tarifa de servicio inyectada en el comprobante de WhatsApp.');
} else {
  console.log('ℹ️ La línea ya estaba presente o se actualizó el texto.');
  fs.writeFileSync(filePath, content, 'utf8');
}
