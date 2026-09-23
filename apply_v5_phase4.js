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

// 1. MODIFICAR src/components/catalogo/purchase-modal.tsx
backupAndEdit('src/components/catalogo/purchase-modal.tsx', (content) => {
  if (content.includes('serviceFee')) return content;

  let updated = content;

  // Importar helpers de cálculo
  updated = updated.replace(
    /import type { Order, OrderItem } from '@\/models\/order';/,
    `import type { Order, OrderItem } from '@/models/order';\nimport { calcularTarifaServicio, type PricingContext, type CanalPedido } from '@/constants/pricingPlans';`
  );

  // Añadir planContext a PurchaseModalProps
  updated = updated.replace(
    /externalCoupon\?: Coupon \| null; \/\/ Nuevo prop para cupón desde el chatbot/,
    `externalCoupon?: Coupon | null;\n  planContext?: PricingContext;`
  );

  updated = updated.replace(
    /externalCoupon\s*}: PurchaseModalProps\)/,
    `externalCoupon,\n  planContext\n}: PurchaseModalProps)`
  );

  // Cálculo de canal y serviceFee
  const targetTotalsCalc = `const subtotalBeforeVat = subtotalProducts - finalDiscountAmount + packagingTotal;
  const vatRate = businessInfo?.vatRate ?? 0;
  const vatAmount = subtotalBeforeVat * (vatRate / 100);
  const deliveryFee = tipoEntrega === 'domicilio' ? (businessInfo?.deliveryFee ?? 0) : 0;
  const total = subtotalBeforeVat + vatAmount + deliveryFee;`;

  const newTotalsCalc = `const channel: CanalPedido = (origin === 'qr' || origin === 'mesa') ? 'mesa' : 'domicilio';

  const serviceFee = useMemo(() => {
    if (planContext?.planType !== 'hibrido') return 0;
    return cartItems.reduce((acc, item) => {
      const basePrice = item.basePrice ?? item.price;
      const fee = calcularTarifaServicio(basePrice, planContext, channel);
      return acc + (fee * item.quantity);
    }, 0);
  }, [cartItems, planContext, channel]);

  const subtotalBeforeVat = subtotalProducts - finalDiscountAmount + packagingTotal;
  const vatRate = businessInfo?.vatRate ?? 0;
  const vatAmount = subtotalBeforeVat * (vatRate / 100);
  const deliveryFee = tipoEntrega === 'domicilio' ? (businessInfo?.deliveryFee ?? 0) : 0;
  const total = subtotalBeforeVat + vatAmount + deliveryFee + serviceFee;`;

  updated = updated.replace(targetTotalsCalc, newTotalsCalc);

  // Guardar serviceFee y channel en orderData
  updated = updated.replace(
    /deliveryFee: deliveryFee,/,
    `deliveryFee: deliveryFee,\n            serviceFee: serviceFee,\n            channel: channel,`
  );

  // Inyectar en el resumen de WhatsApp
  const targetWaDelivery = `if (tipoEntrega === 'domicilio' && deliveryFee > 0) {
            orderSummary += \`Costo de envío:      \${formatCurrency(deliveryFee)}\\n\`;
        }`;

  const newWaDelivery = `${targetWaDelivery}
        if (serviceFee > 0) {
            orderSummary += \`Tarifa de servicio:  \${formatCurrency(serviceFee)}\\n\`;
        }`;

  updated = updated.replace(targetWaDelivery, newWaDelivery);

  // Inyectar en la UI del modal (RESUMEN DE LA COMPRA)
  const targetUiDelivery = `<div className="flex justify-between text-sm">
                    <span>Envío:</span>
                    <span>
                        {tipoEntrega === 'domicilio' 
                            ? (deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Gratis')
                            : 'Gratis (recoger en tienda)'}
                    </span>
                </div>`;

  const newUiServiceFee = `${targetUiDelivery}

                {serviceFee > 0 && (
                    <div className="flex justify-between text-sm items-center">
                        <span className="flex items-center gap-1">
                            Tarifa de servicio:
                            <span 
                                className="text-[11px] cursor-help text-muted-foreground" 
                                title="Cargo de la plataforma por gestionar tu pedido en Menfy"
                            >
                                ℹ️
                            </span>
                        </span>
                        <span className="font-semibold text-foreground">{formatCurrency(serviceFee)}</span>
                    </div>
                )}`;

  updated = updated.replace(targetUiDelivery, newUiServiceFee);

  return updated;
});

// 2. MODIFICAR src/app/(public)/catalog/[businessId]/page.tsx
backupAndEdit('src/app/(public)/catalog/[businessId]/page.tsx', (content) => {
  if (content.includes('planContext={pricingContext}') && content.includes('<PurchaseModal')) return content;

  let updated = content;

  // Detectar canal de mesa en pricingContext
  const targetPricingMemo = `const pricingContext: PricingContext = useMemo(() => {
        return {
            planType: pageData.business?.planType || 'fijo',
            planName: pageData.business?.planName,
            planSlug: (pageData.business as any)?.planSlug,
        };
    }, [pageData.business]);`;

  const newPricingMemo = `const isMesaChannel = orderOrigin === 'qr' || orderOrigin === 'mesa';
    const activeCanal = isMesaChannel ? 'mesa' : 'domicilio';

    const pricingContext: PricingContext = useMemo(() => {
        return {
            planType: pageData.business?.planType || 'fijo',
            planName: pageData.business?.planName,
            planSlug: (pageData.business as any)?.planSlug,
            channel: activeCanal,
        };
    }, [pageData.business, activeCanal]);`;

  if (updated.includes(targetPricingMemo)) {
    updated = updated.replace(targetPricingMemo, newPricingMemo);
  }

  // Pasar planContext a PurchaseModal
  updated = updated.replace(
    /<PurchaseModal\s*isOpen={isPurchaseModalOpen}/,
    `<PurchaseModal \n                planContext={pricingContext}\n                isOpen={isPurchaseModalOpen}`
  );

  return updated;
});

// 3. MODIFICAR src/components/catalogo/public-product-card.tsx
backupAndEdit('src/components/catalogo/public-product-card.tsx', (content) => {
  return content.replace(
    /title="Incluye cargo de servicio Menfy"/g,
    `title="Incluye tarifa de servicio Menfy"`
  );
});

console.log('\n🎉 Fase 4 aplicada.');
