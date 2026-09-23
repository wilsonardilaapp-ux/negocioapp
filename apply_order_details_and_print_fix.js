const fs = require('fs');
const path = require('path');

function backupAndEdit(filePath, modifier) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(absPath, 'utf8');
  const bakPath = `${absPath}.bak`;
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, original, 'utf8');
    console.log(`🛡️ Respaldo creado: ${filePath}.bak`);
  }
  const modified = modifier(original);
  if (modified !== original) {
    fs.writeFileSync(absPath, modified, 'utf8');
    console.log(`✅ Modificado exitosamente (aditivo): ${filePath}`);
  } else {
    console.log(`ℹ️ Sin cambios requeridos: ${filePath}`);
  }
}

// 1. MODIFICAR src/components/pedidos/ViewOrderDialog.tsx
backupAndEdit('src/components/pedidos/ViewOrderDialog.tsx', (content) => {
  if (content.includes('Tarifa de servicio:')) return content;

  const targetDeliveryBlock = `{(order.deliveryFee ?? 0) > 0 && (
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Costo Envío:</span>
                                <span>{formatCurrency(order.deliveryFee!)}</span>
                            </div>
                        )}`;

  const newServiceFeeBlock = `${targetDeliveryBlock}
                        {(() => {
                            const calculatedFee = (order as any).serviceFee ?? Math.max(0, (order.total || 0) - ((order.subtotal || 0) + (order.deliveryFee || 0) + (order.packagingCost || 0) + ((order as any).vatAmount || Math.round((order.subtotal || 0) * 0.19))));
                            if (calculatedFee <= 0) return null;
                            return (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Tarifa de servicio:</span>
                                    <span className="font-semibold text-foreground">{formatCurrency(calculatedFee)}</span>
                                </div>
                            );
                        })()}`;

  return content.replace(targetDeliveryBlock, newServiceFeeBlock);
});

// 2. MODIFICAR src/app/(dashboard)/dashboard/pedidos/print/[orderId]/page.tsx
backupAndEdit('src/app/(dashboard)/dashboard/pedidos/print/[orderId]/page.tsx', (content) => {
  if (content.includes('serviceFee: serviceFee')) return content;

  let updated = content;
  
  updated = updated.replace(
    /const discount = order\.discountAmount \?\? 0;/,
    `const discount = order.discountAmount ?? 0;\n        const serviceFee = (order as any).serviceFee ?? Math.max(0, (order.total || 0) - (itemsSubtotal + deliveryFee + packagingFee - discount));`
  );

  updated = updated.replace(
    /packaging: packagingFee,\s*subtotal: itemsSubtotal,/,
    `packaging: packagingFee,\n            serviceFee: serviceFee,\n            subtotal: itemsSubtotal,`
  );

  return updated;
});

// 3. MODIFICAR src/components/invoice/InvoiceTemplate.tsx
backupAndEdit('src/components/invoice/InvoiceTemplate.tsx', (content) => {
  if (content.includes('Tarifa servicio:')) return content;

  let updated = content;

  // Añadir serviceFee a mockOrder para compatibilidad de tipos
  updated = updated.replace(
    /packaging: 1000,/,
    `packaging: 1000,\n  serviceFee: 700,`
  );

  const targetPackagingLine = `if (config.fields.showPackaging) {
    subtotalLines.push(rpad('Empaque:', SUMMARY_LABEL_W) + lpad(order.packaging.toLocaleString('es-CO'), SUMMARY_VALUE_W));
  }`;

  const newServiceFeeLine = `${targetPackagingLine}
  const sFee = (order as any).serviceFee || 0;
  if (sFee > 0) {
    subtotalLines.push(rpad('Tarifa servicio:', SUMMARY_LABEL_W) + lpad(sFee.toLocaleString('es-CO'), SUMMARY_VALUE_W));
  }`;

  updated = updated.replace(targetPackagingLine, newServiceFeeLine);

  return updated;
});

console.log('\n🎉 Modificaciones aplicadas.');
