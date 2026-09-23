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

// 1. MODIFICAR src/components/catalogo/product-card.tsx
backupAndEdit('src/components/catalogo/product-card.tsx', (content) => {
  let updated = content;

  // Actualizar el bloque de visualización de precios para desglosar canales sin porcentajes
  const targetPriceBlock = `<div className="space-y-1 mb-2 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Precio Base (tu ganancia):</span>
                        <span className="font-semibold text-foreground">{formatCurrency(product.basePrice ?? product.price)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary">Precio Cliente:</span>
                        <span className="text-lg font-bold text-primary">
                            {formatCurrency(calcularPrecioCliente(product.basePrice ?? product.price, planContext))}
                        </span>
                    </div>
                </div>`;

  const newPriceBlock = `(() => {
                    const rawBase = product.basePrice ?? product.price;
                    const pDom = calcularPrecioCliente(rawBase, planContext, 'domicilio');
                    const pMesa = calcularPrecioCliente(rawBase, planContext, 'mesa');
                    const isHybrid = planContext?.planType === 'hibrido';

                    return (
                      <div className="space-y-1 mb-2 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Precio Base (tu ganancia):</span>
                          <span className="font-semibold text-foreground">{formatCurrency(rawBase)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <span className="text-[11px] font-semibold text-primary">Precio Cliente:</span>
                          {isHybrid && pDom !== pMesa ? (
                            <div className="text-xs font-bold text-foreground flex items-center justify-between bg-muted/40 px-2 py-1 rounded">
                              <span>Domicilio: <strong className="text-primary">{formatCurrency(pDom)}</strong></span>
                              <span>·</span>
                              <span>Mesa: <strong className="text-primary">{formatCurrency(pMesa)}</strong></span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(pDom)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()`;

  if (updated.includes(targetPriceBlock)) {
    updated = updated.replace(targetPriceBlock, `{${newPriceBlock}}`);
  }

  return updated;
});

// 2. MODIFICAR src/components/catalogo/product-form.tsx
backupAndEdit('src/components/catalogo/product-form.tsx', (content) => {
  let updated = content;

  // Cálculos en vivo para ambos canales sin porcentajes
  const oldLivePriceCode = `const watchedPrice = watch("price");
    const liveClientPrice = calcularPrecioCliente(watchedPrice, planContext);
    const comisionRate = obtenerTasaComisionHibrida(planContext);
    const comisionPercent = Math.round(comisionRate * 100);`;

  const newLivePriceCode = `const watchedPrice = watch("price");
    const liveClientPriceDom = calcularPrecioCliente(watchedPrice, planContext, 'domicilio');
    const liveClientPriceMesa = calcularPrecioCliente(watchedPrice, planContext, 'mesa');
    const isHybridPlan = planContext?.planType === 'hibrido';`;

  if (updated.includes(oldLivePriceCode)) {
    updated = updated.replace(oldLivePriceCode, newLivePriceCode);
  }

  // Actualizar el grid de inputs en product-form
  const oldInputsGrid = `<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="price">Precio base (lo que tú recibes)</Label>
                            <Input id="price" type="number" step="0.01" {...register("price")} />
                            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="clientPrice">Precio final al cliente</Label>
                            <Input 
                                id="clientPrice" 
                                type="text" 
                                readOnly 
                                disabled 
                                value={liveClientPrice > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(liveClientPrice) : '$ 0'} 
                                className="bg-muted font-bold text-primary" 
                            />
                            <p className="text-[11px] text-muted-foreground mt-1">
                                {planContext?.planType === 'hibrido' 
                                    ? \`Incluye \${comisionPercent}% de servicio Menfy.\` 
                                    : 'Tu plan fijo incluye el servicio por mensualidad. Sin comisiones.'}
                            </p>
                        </div>`;

  const newInputsGrid = `<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="price">Precio base (lo que tú recibes)</Label>
                            <Input id="price" type="number" step="0.01" {...register("price")} />
                            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                        </div>
                        {isHybridPlan ? (
                          <>
                            <div>
                              <Label htmlFor="clientPriceDom">Precio Cliente (Domicilio)</Label>
                              <Input 
                                id="clientPriceDom" 
                                type="text" 
                                readOnly 
                                disabled 
                                value={liveClientPriceDom > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(liveClientPriceDom) : '$ 0'} 
                                className="bg-muted font-bold text-primary" 
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Tarifa de servicio en domicilio.
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="clientPriceMesa">Precio Cliente (Mesa QR)</Label>
                              <Input 
                                id="clientPriceMesa" 
                                type="text" 
                                readOnly 
                                disabled 
                                value={liveClientPriceMesa > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(liveClientPriceMesa) : '$ 0'} 
                                className="bg-muted font-bold text-primary" 
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Tarifa de servicio en mesa.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div>
                            <Label htmlFor="clientPrice">Precio final al cliente</Label>
                            <Input 
                              id="clientPrice" 
                              type="text" 
                              readOnly 
                              disabled 
                              value={liveClientPriceDom > 0 ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(liveClientPriceDom) : '$ 0'} 
                              className="bg-muted font-bold text-primary" 
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Tu plan incluye el servicio por mensualidad. Sin comisiones.
                            </p>
                          </div>
                        )}`;

  if (updated.includes(oldInputsGrid)) {
    updated = updated.replace(oldInputsGrid, newInputsGrid);
  }

  return updated;
});

// 3. MODIFICAR src/app/(dashboard)/dashboard/catalogo/page.tsx
backupAndEdit('src/app/(dashboard)/dashboard/catalogo/page.tsx', (content) => {
  let updated = content;

  // Reemplazar el Badge superior para aplicar las 3 leyendas institucionales ciego (sin %)
  const targetBadge = `<p className="text-xs text-muted-foreground">
                        {pricingContext.planType === 'hibrido'
                            ? \`Según tu plan, se aplica \${Math.round(obtenerTasaComisionHibrida(pricingContext) * 100)}% de servicio Menfy en los precios al cliente. Tú recibes siempre el 100% de tu precio base.\`
                            : 'Tu plan incluye el servicio Menfy por mensualidad fija. Sin comisiones sobre tus platos. El cliente paga exactamente tu precio base.'}
                    </p>`;

  const newBadge = `<p className="text-xs text-muted-foreground">
                        {(() => {
                          if (pricingContext.planType === 'fijo') {
                            return 'Tu plan incluye el servicio Menfy por mensualidad. Sin comisiones.';
                          }
                          const nameLower = (pricingContext.planName || '').toLowerCase();
                          if (nameLower.includes('arranque')) {
                            return 'Menfy agrega una tarifa de servicio en domicilio y en mesa. Tú recibes siempre el 100% de tu precio base.';
                          }
                          return 'Menfy agrega una tarifa de servicio en domicilio y en mesa. Tu mensualidad cubre las herramientas de gestión de tu negocio.';
                        })()}
                    </p>`;

  if (updated.includes(targetBadge)) {
    updated = updated.replace(targetBadge, newBadge);
  }

  return updated;
});

console.log('\n🎉 Fase 3 aplicada.');
