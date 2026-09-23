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

// 1. MODIFICAR src/components/catalogo/public-product-card.tsx
backupAndEdit('src/components/catalogo/public-product-card.tsx', (content) => {
  if (content.includes('calcularPrecioCliente')) return content;

  let updated = content.replace(
    /import type { Product } from '@\/models\/product';/,
    `import type { Product } from '@/models/product';\nimport { calcularPrecioCliente, type PricingContext } from '@/constants/pricingPlans';`
  );

  updated = updated.replace(
    /interface PublicProductCardProps {\s*product: Product;\s*promotions: Promotion\[\];\s*onView: \(\) => void;\s*onBuy: \(\) => void;\s*}/,
    `interface PublicProductCardProps {\n  product: Product;\n  promotions: Promotion[];\n  onView: () => void;\n  onBuy: () => void;\n  planContext?: PricingContext;\n}`
  );

  updated = updated.replace(
    /export default function PublicProductCard\({ product, promotions = \[\], onView, onBuy }: PublicProductCardProps\)/,
    `export default function PublicProductCard({ product, promotions = [], onView, onBuy, planContext }: PublicProductCardProps)`
  );

  // Inyectar cálculo de precio cliente
  const targetRenderPrice = `<p className="text-2xl font-black text-primary">\n                {formatCurrency(product.price)}\n            </p>`;
  const newRenderPrice = `<div className="flex items-baseline flex-wrap">
              <p className="text-2xl font-black text-primary">
                  {formatCurrency(calcularPrecioCliente(product.basePrice ?? product.price, planContext))}
              </p>
              {planContext?.planType === 'hibrido' && (
                <span 
                  className="text-[10px] font-medium text-muted-foreground ml-2 bg-muted px-1.5 py-0.5 rounded cursor-help"
                  title="Incluye cargo de servicio Menfy"
                >
                  Servicio Menfy incl.
                </span>
              )}
            </div>`;

  if (updated.includes(targetRenderPrice)) {
    updated = updated.replace(targetRenderPrice, newRenderPrice);
  } else {
    // Fallback por espaciado
    updated = updated.replace(
      /{formatCurrency\(product\.price\)}/,
      `{formatCurrency(calcularPrecioCliente(product.basePrice ?? product.price, planContext))}`
    );
  }

  return updated;
});

// 2. MODIFICAR src/components/catalogo/cart-drawer.tsx
backupAndEdit('src/components/catalogo/cart-drawer.tsx', (content) => {
  if (content.includes('planContext')) return content;

  let updated = content.replace(
    /import { useToast } from "@\/hooks\/use-toast";/,
    `import { useToast } from "@/hooks/use-toast";\nimport { type PricingContext } from "@/constants/pricingPlans";`
  );

  updated = updated.replace(
    /interface CartDrawerProps {/,
    `interface CartDrawerProps {\n  planContext?: PricingContext;`
  );

  updated = updated.replace(
    /export function CartDrawer\({ \s*isOpen,\s*onOpenChange,\s*cartItems,\s*onRemoveItem,\s*onUpdateQuantity,\s*onCheckout\s*}: CartDrawerProps\)/,
    `export function CartDrawer({ isOpen, onOpenChange, cartItems, onRemoveItem, onUpdateQuantity, onCheckout, planContext }: CartDrawerProps)`
  );

  // Inyectar línea informativa de servicio Menfy en el footer del carrito
  const targetNote = `<p className="text-[10px] text-muted-foreground italic text-center w-full">\n                * El costo de envío e impuestos se calcularán en el siguiente paso.\n              </p>`;
  const newNoteBlock = `${targetNote}
              {planContext?.planType === 'hibrido' && (
                <p className="text-xs font-semibold text-primary/90 text-center w-full bg-primary/10 py-1.5 px-3 rounded-lg">
                  Cargo de servicio Menfy incluido en los precios
                </p>
              )}`;

  if (updated.includes(targetNote)) {
    updated = updated.replace(targetNote, newNoteBlock);
  }

  return updated;
});

// 3. MODIFICAR src/app/(public)/catalog/[businessId]/page.tsx
backupAndEdit('src/app/(public)/catalog/[businessId]/page.tsx', (content) => {
  if (content.includes('pricingContext')) return content;

  let updated = content.replace(
    /import type { Business } from '@\/models\/business';/,
    `import type { Business } from '@/models/business';\nimport { calcularPrecioCliente, type PricingContext } from '@/constants/pricingPlans';`
  );

  // Agregar business a pageData
  updated = updated.replace(
    /resolvedBusinessId: string \| null;\s*}>\({\s*headerConfig: null,/,
    `resolvedBusinessId: string | null;\n        business: Business | null;\n    }>({ headerConfig: null,`
  );

  updated = updated.replace(
    /paymentSettings: null,\s*resolvedBusinessId: null,\s*}\);/,
    `paymentSettings: null,\n        resolvedBusinessId: null,\n        business: null,\n    });`
  );

  // Consultar doc de business en paralelo
  updated = updated.replace(
    /const publicCatalogRef = doc\(firestore, 'businesses', businessId, 'publicData', 'catalog'\);/,
    `const businessRef = doc(firestore, 'businesses', businessId);\n                const publicCatalogRef = doc(firestore, 'businesses', businessId, 'publicData', 'catalog');`
  );

  updated = updated.replace(
    /const \[catalogSnap, paymentSnap, couponsSnap\] = await Promise\.all\(\[\s*getDoc\(publicCatalogRef\),\s*getDoc\(paymentSettingsRef\),\s*getDocs\(couponsQuery\)\s*\]\);/,
    `const [catalogSnap, paymentSnap, couponsSnap, businessSnap] = await Promise.all([\n                    getDoc(publicCatalogRef),\n                    getDoc(paymentSettingsRef),\n                    getDocs(couponsQuery),\n                    getDoc(businessRef),\n                ]);`
  );

  updated = updated.replace(
    /resolvedBusinessId: businessId,\s*}\);/,
    `resolvedBusinessId: businessId,\n                    business: businessSnap.exists() ? (businessSnap.data() as Business) : null,\n                });`
  );

  // Crear pricingContext memoizado
  const memoPricing = `
    const pricingContext: PricingContext = useMemo(() => {
        return {
            planType: pageData.business?.planType || 'fijo',
            planName: pageData.business?.planName,
            planSlug: (pageData.business as any)?.planSlug,
        };
    }, [pageData.business]);
  `;

  updated = updated.replace(
    /const orderOrigin = useMemo\(/,
    `${memoPricing}\n    const orderOrigin = useMemo(`
  );

  // Pasar planContext a PublicProductCard
  updated = updated.replace(
    /<PublicProductCard \s*key={product\.id}\s*product={product}\s*promotions={pageData\.promotions \|\| \[\]}/,
    `<PublicProductCard \n                                    key={product.id} \n                                    product={product} \n                                    promotions={pageData.promotions || []}\n                                    planContext={pricingContext}`
  );

  // Pasar planContext a CartDrawer
  updated = updated.replace(
    /<CartDrawer \s*isOpen={isCartOpen}/,
    `<CartDrawer \n                planContext={pricingContext}\n                isOpen={isCartOpen}`
  );

  // En handleAddToCart, asignar precio cliente
  const oldAddToCart = `const handleAddToCart = (product: Product, quantity: number) => {`;
  const newAddToCart = `const handleAddToCart = (rawProduct: Product, quantity: number) => {
        const effectiveBase = rawProduct.basePrice ?? rawProduct.price;
        const effectiveClient = calcularPrecioCliente(effectiveBase, pricingContext);
        const product: Product = { ...rawProduct, price: effectiveClient, basePrice: effectiveBase };`;

  updated = updated.replace(oldAddToCart, newAddToCart);

  return updated;
});

console.log('\n🎉 Fase 3 aplicada.');
