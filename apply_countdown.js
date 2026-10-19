const fs = require("fs");
const path = require("path");

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const bak = filePath + ".bak";
    fs.copyFileSync(filePath, bak);
    console.log(`[RESPALDO] Creado: ${bak}`);
  }
}

// 1. CREAR src/components/catalogo/countdown-timer.tsx
const countdownPath = path.join("src", "components", "catalogo", "countdown-timer.tsx");
const countdownContent = `'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: string;
  variant?: 'badge' | 'compact' | 'full';
  className?: string;
  onExpire?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function CountdownTimer({ targetDate, variant = 'compact', className = '', onExpire }: CountdownTimerProps) {
  const calculateTimeRemaining = (): TimeRemaining => {
    if (!targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    // Si viene solo fecha (YYYY-MM-DD), fijar fin del dia 23:59:59
    const normalizedDate = targetDate.includes('T') ? targetDate : `${targetDate}T23:59:59`;
    const targetMs = new Date(normalizedDate).getTime();
    const nowMs = Date.now();
    const difference = targetMs - nowMs;

    if (isNaN(difference) || difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(calculateTimeRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = calculateTimeRemaining();
      setTimeLeft(updated);
      if (updated.isExpired) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');

  // 1. VARIANTE BADGE (sobre la imagen del producto, junto al descuento)
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold shadow-md border border-white/20 select-none ${className}`}>
        <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
        <span>
          {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  // 2. VARIANTE COMPACT (zona de precio de la tarjeta)
  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-1 py-1 select-none ${className}`}>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
          <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Oferta termina en:</span>
        </div>
        <div className="flex items-center gap-1">
          {timeLeft.days > 0 && (
            <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded px-1.5 py-0.5 text-xs font-black">
              {timeLeft.days}<span className="text-[10px] text-emerald-600 font-medium">d</span>
            </span>
          )}
          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded px-1.5 py-0.5 text-xs font-black">
            {pad(timeLeft.hours)}<span className="text-[10px] text-emerald-600 font-medium">h</span>
          </span>
          <span className="text-emerald-500 font-bold">:</span>
          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded px-1.5 py-0.5 text-xs font-black">
            {pad(timeLeft.minutes)}<span className="text-[10px] text-emerald-600 font-medium">m</span>
          </span>
          <span className="text-emerald-500 font-bold">:</span>
          <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded px-1.5 py-0.5 text-xs font-black">
            {pad(timeLeft.seconds)}<span className="text-[10px] text-emerald-600 font-medium">s</span>
          </span>
        </div>
      </div>
    );
  }

  // 3. VARIANTE FULL (modal de detalle de producto "Ver")
  return (
    <div className={`p-4 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-emerald-50/30 to-white shadow-sm space-y-2 select-none ${className}`}>
      <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
          OFERTA POR TIEMPO LIMITADO
        </span>
        <span className="text-[11px] font-semibold text-emerald-600">¡Termina pronto!</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white border border-emerald-200/60 rounded-lg p-2 shadow-xs">
          <span className="block text-xl md:text-2xl font-black text-emerald-700 tabular-nums">
            {timeLeft.days}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Días</span>
        </div>
        <div className="bg-white border border-emerald-200/60 rounded-lg p-2 shadow-xs">
          <span className="block text-xl md:text-2xl font-black text-emerald-700 tabular-nums">
            {pad(timeLeft.hours)}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Horas</span>
        </div>
        <div className="bg-white border border-emerald-200/60 rounded-lg p-2 shadow-xs">
          <span className="block text-xl md:text-2xl font-black text-emerald-700 tabular-nums">
            {pad(timeLeft.minutes)}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Min</span>
        </div>
        <div className="bg-white border border-emerald-200/60 rounded-lg p-2 shadow-xs">
          <span className="block text-xl md:text-2xl font-black text-emerald-700 tabular-nums">
            {pad(timeLeft.seconds)}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Seg</span>
        </div>
      </div>
    </div>
  );
}
export default CountdownTimer;
`;

fs.writeFileSync(countdownPath, countdownContent, "utf8");
console.log(`[CREADO] ${countdownPath}`);

// 2. MODIFICAR src/models/promotion.ts
const promoModelPath = "src/models/promotion.ts";
backupFile(promoModelPath);
let promoModelCode = fs.readFileSync(promoModelPath, "utf8");
if (!promoModelCode.includes("showCountdown?: boolean;")) {
  promoModelCode = promoModelCode.replace(
    "showInCheckout: boolean;",
    "showInCheckout: boolean;\n  showCountdown?: boolean;                       // Mostrar contador regresivo en producto"
  );
  fs.writeFileSync(promoModelPath, promoModelCode, "utf8");
  console.log(`[MODIFICADO] ${promoModelPath}`);
}

// 3. MODIFICAR src/app/(dashboard)/dashboard/promotions/page.tsx
const promoPagePath = "src/app/(dashboard)/dashboard/promotions/page.tsx";
backupFile(promoPagePath);
let promoPageCode = fs.readFileSync(promoPagePath, "utf8");

// A. Agregar handleToggleCountdown
if (!promoPageCode.includes("handleToggleCountdown")) {
  const anchorToggle = "const handleToggleActive = async (id: string, current: boolean) => {";
  const newToggle = `const handleToggleCountdown = async (id: string, current: boolean) => {
    try {
      await promotionService.updatePromotion(id, { showCountdown: !current });
      if (user?.uid) {
        await promotionService.syncPublicCatalog(user.uid);
      }
      toast({ title: 'Contador actualizado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar contador' });
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {`;
  promoPageCode = promoPageCode.replace(anchorToggle, newToggle);
}

// B. Agregar showCountdown a initialDefaults
if (!promoPageCode.includes("showCountdown: false,")) {
  promoPageCode = promoPageCode.replace(
    "showInCheckout: true,",
    "showInCheckout: true,\n    showCountdown: false,"
  );
}

// C. Cargar showCountdown en setFormData al editar
if (!promoPageCode.includes("showCountdown: !!promo.showCountdown,")) {
  promoPageCode = promoPageCode.replace(
    "validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0] : initialDefaults.validUntil,",
    "validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0] : initialDefaults.validUntil,\n          showCountdown: !!promo.showCountdown,"
  );
}

// D. Sanitizar showCountdown al guardar
if (!promoPageCode.includes("showCountdown: !!formData.showCountdown,")) {
  promoPageCode = promoPageCode.replace(
    "showInCheckout: formData.showInCheckout === undefined ? true : !!formData.showInCheckout,",
    "showInCheckout: formData.showInCheckout === undefined ? true : !!formData.showInCheckout,\n        showCountdown: !!formData.showCountdown,"
  );
}

// E. Agregar switch en el formulario
if (!promoPageCode.includes("Mostrar contador regresivo")) {
  const checkoutSwitchJSX = `<div className="flex items-center gap-2">
              <Switch checked={formData.showInCheckout} onCheckedChange={v => setFormData({ ...formData, showInCheckout: v })} />
              <Label>Ver en checkout</Label>
            </div>`;
  const newSwitchesJSX = `${checkoutSwitchJSX}
            <div className="flex items-center gap-2">
              <Switch checked={!!formData.showCountdown} onCheckedChange={v => setFormData({ ...formData, showCountdown: v })} />
              <Label>Mostrar contador regresivo</Label>
            </div>`;
  promoPageCode = promoPageCode.replace(checkoutSwitchJSX, newSwitchesJSX);
}

// F. Agregar columna y switch rápido en la tabla
if (!promoPageCode.includes("<TableHead>Contador</TableHead>")) {
  promoPageCode = promoPageCode.replace(
    "<TableHead>Estado</TableHead>",
    "<TableHead>Estado</TableHead>\n                  <TableHead>Contador</TableHead>"
  );
  promoPageCode = promoPageCode.replace(
    "</TableCell>\n                    <TableCell className=\"text-right\">",
    `</TableCell>\n                    <TableCell>\n                      <Switch checked={!!promo.showCountdown} onCheckedChange={() => handleToggleCountdown(promo.id, !!promo.showCountdown)} />\n                    </TableCell>\n                    <TableCell className="text-right">`
  );
}

fs.writeFileSync(promoPagePath, promoPageCode, "utf8");
console.log(`[MODIFICADO] ${promoPagePath}`);

// 4. MODIFICAR src/components/catalogo/public-product-card.tsx
const publicCardPath = "src/components/catalogo/public-product-card.tsx";
backupFile(publicCardPath);
let publicCardCode = fs.readFileSync(publicCardPath, "utf8");

// A. Importar CountdownTimer
if (!publicCardCode.includes("CountdownTimer")) {
  publicCardCode = `import { CountdownTimer } from './countdown-timer';\n` + publicCardCode;
}

// B. Badge sobre la imagen
if (!publicCardCode.includes("variant=\"badge\"")) {
  const oldBadgeBlock = `<Badge className="bg-red-600 hover:bg-red-700 text-white font-black border-none shadow-md px-3 py-1">
            {discountInfo.promotion?.type === 'percentage' 
              ? \`-\${discountInfo.promotion.discountValue}%\` 
              : 'OFERTA'}
          </Badge>`;
  const newBadgeBlock = `<Badge className="bg-red-600 hover:bg-red-700 text-white font-black border-none shadow-md px-3 py-1">
            {discountInfo.promotion?.type === 'percentage' 
              ? \`-\${discountInfo.promotion.discountValue}%\` 
              : 'OFERTA'}
          </Badge>
          {discountInfo.promotion?.showCountdown && discountInfo.promotion?.validUntil && (
            <CountdownTimer targetDate={discountInfo.promotion.validUntil} variant="badge" />
          )}`;
  publicCardCode = publicCardCode.replace(oldBadgeBlock, newBadgeBlock);
  publicCardCode = publicCardCode.replace(
    'className="absolute top-3 left-3 z-10 animate-in fade-in zoom-in duration-300"',
    'className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5 animate-in fade-in zoom-in duration-300"'
  );
}

// C. Contador en la zona de precio
if (!publicCardCode.includes("variant=\"compact\"")) {
  const oldFinalPrice = `<span className="text-2xl font-black text-red-600">
                {formatCurrency(discountInfo.finalPrice)}
              </span>`;
  const newFinalPrice = `<span className="text-2xl font-black text-red-600">
                {formatCurrency(discountInfo.finalPrice)}
              </span>
              {discountInfo.promotion?.showCountdown && discountInfo.promotion?.validUntil && (
                <CountdownTimer targetDate={discountInfo.promotion.validUntil} variant="compact" />
              )}`;
  publicCardCode = publicCardCode.replace(oldFinalPrice, newFinalPrice);
}

fs.writeFileSync(publicCardPath, publicCardCode, "utf8");
console.log(`[MODIFICADO] ${publicCardPath}`);

// 5. MODIFICAR src/components/catalogo/product-view-modal.tsx
const viewModalPath = "src/components/catalogo/product-view-modal.tsx";
backupFile(viewModalPath);
let viewModalCode = fs.readFileSync(viewModalPath, "utf8");

// A. Imports
if (!viewModalCode.includes("CountdownTimer")) {
  viewModalCode = `import { CountdownTimer } from './countdown-timer';\nimport type { Promotion } from '@/models/promotion';\nimport { promotionService } from '@/services/promotion-service';\n` + viewModalCode;
}

// B. Agregar promotions a ProductViewModalProps
if (!viewModalCode.includes("promotions?: Promotion[]")) {
  viewModalCode = viewModalCode.replace(
    "onRatingUpdated?: (productId: string, newRating: number, newCount: number) => void;",
    "onRatingUpdated?: (productId: string, newRating: number, newCount: number) => void;\n  promotions?: Promotion[];"
  );
  viewModalCode = viewModalCode.replace(
    "onRatingUpdated \n}: ProductViewModalProps",
    "onRatingUpdated,\n  promotions = []\n}: ProductViewModalProps"
  );
  if (!viewModalCode.includes("promotions = []")) {
    viewModalCode = viewModalCode.replace(
      "onRatingUpdated\n}: ProductViewModalProps",
      "onRatingUpdated,\n  promotions = []\n}: ProductViewModalProps"
    );
  }
}

// C. Calcular discountInfo en el modal
if (!viewModalCode.includes("modalDiscountInfo")) {
  viewModalCode = viewModalCode.replace(
    "const firestore = useFirestore();",
    `const firestore = useFirestore();
  const modalDiscountInfo = (product && promotions && promotions.length > 0)
    ? promotionService.calculateDiscountedPrice(product, promotions)
    : null;
  const effectivePrice = modalDiscountInfo?.hasDiscount ? modalDiscountInfo.finalPrice : (product?.price || 0);`
  );
}

// D. Renderizar precio con descuento y contador full
if (!viewModalCode.includes("variant=\"full\"")) {
  const oldPriceBlock = `<div className="text-3xl font-black text-primary">
                {formatCurrency(product.price)}
              </div>`;
  const newPriceBlock = `{modalDiscountInfo?.hasDiscount ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-red-600">
                      {formatCurrency(modalDiscountInfo.finalPrice)}
                    </span>
                    <span className="text-base text-muted-foreground line-through decoration-red-400">
                      {formatCurrency(modalDiscountInfo.originalPrice)}
                    </span>
                    <Badge className="bg-red-600 text-white font-black">
                      {modalDiscountInfo.promotion?.type === 'percentage' ? \`-\${modalDiscountInfo.promotion.discountValue}%\` : 'OFERTA'}
                    </Badge>
                  </div>
                  {modalDiscountInfo.promotion?.showCountdown && modalDiscountInfo.promotion?.validUntil && (
                    <CountdownTimer targetDate={modalDiscountInfo.promotion.validUntil} variant="full" />
                  )}
                </div>
              ) : (
                <div className="text-3xl font-black text-primary">
                  {formatCurrency(product.price)}
                </div>
              )}`;
  viewModalCode = viewModalCode.replace(oldPriceBlock, newPriceBlock);
}

// E. Actualizar el boton de agregar al carrito con effectivePrice
if (!viewModalCode.includes("effectivePrice * quantity")) {
  viewModalCode = viewModalCode.replace(
    "{formatCurrency(product.price * quantity)}",
    "{formatCurrency(effectivePrice * quantity)}"
  );
}

fs.writeFileSync(viewModalPath, viewModalCode, "utf8");
console.log(`[MODIFICADO] ${viewModalPath}`);

// 6. MODIFICAR src/app/(public)/catalog/[businessId]/page.tsx
const catalogPagePath = "src/app/(public)/catalog/[businessId]/page.tsx";
backupFile(catalogPagePath);
let catalogPageCode = fs.readFileSync(catalogPagePath, "utf8");

if (!catalogPageCode.includes("promotions={pageData.promotions || []}")) {
  catalogPageCode = catalogPageCode.replace(
    `<ProductViewModal \n                product={selectedProduct} \n                businessId={pageData.resolvedBusinessId}`,
    `<ProductViewModal \n                product={selectedProduct} \n                businessId={pageData.resolvedBusinessId}\n                promotions={pageData.promotions || []}`
  );
  if (!catalogPageCode.includes("promotions={pageData.promotions || []}")) {
    catalogPageCode = catalogPageCode.replace(
      `<ProductViewModal \n                product={selectedProduct}`,
      `<ProductViewModal \n                promotions={pageData.promotions || []}\n                product={selectedProduct}`
    );
  }
  fs.writeFileSync(catalogPagePath, catalogPageCode, "utf8");
  console.log(`[MODIFICADO] ${catalogPagePath}`);
}

console.log("\n>>> IMPLEMENTACION COMPLETADA CON EXITO <<<");
