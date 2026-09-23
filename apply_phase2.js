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
  if (content.includes('calcularPrecioCliente')) return content;

  // Importar función de precios
  let updated = content.replace(
    /import type { Product } from '@\/models\/product';/,
    `import type { Product } from '@/models/product';\nimport { calcularPrecioCliente, type PricingContext } from '@/constants/pricingPlans';`
  );

  // Agregar prop planContext
  updated = updated.replace(
    /interface ProductCardProps {\s*product: Product;\s*children\?: React\.ReactNode;\s*}/,
    `interface ProductCardProps {\n    product: Product;\n    children?: React.ReactNode;\n    planContext?: PricingContext;\n}`
  );

  updated = updated.replace(
    /export default function ProductCard\({ product, children }: ProductCardProps\)/,
    `export default function ProductCard({ product, children, planContext }: ProductCardProps)`
  );

  // Reemplazar la sección de precio para mostrar Base + Cliente
  const targetPrice = `<p className="text-2xl font-bold text-primary">{formatCurrency(product.price)}</p>`;
  const newPriceBlock = `
                <div className="space-y-1 mb-2 pt-1 border-t border-border/50">
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

  if (updated.includes(targetPrice)) {
    updated = updated.replace(targetPrice, newPriceBlock);
  }

  return updated;
});

// 2. MODIFICAR src/components/catalogo/product-form.tsx
backupAndEdit('src/components/catalogo/product-form.tsx', (content) => {
  if (content.includes('calcularPrecioCliente')) return content;

  // Importar helpers
  let updated = content.replace(
    /import type { Product } from '@\/models\/product';/,
    `import type { Product } from '@/models/product';\nimport { calcularPrecioCliente, obtenerTasaComisionHibrida, type PricingContext } from '@/constants/pricingPlans';`
  );

  // Extender props
  updated = updated.replace(
    /interface ProductFormProps {/,
    `interface ProductFormProps {\n    planContext?: PricingContext;`
  );

  updated = updated.replace(
    /export default function ProductForm\(\{ product, onSave, onCancel, imageLimit \}: ProductFormProps\)/,
    `export default function ProductForm({ product, onSave, onCancel, imageLimit, planContext }: ProductFormProps)`
  );

  // Añadir watch a useForm
  updated = updated.replace(
    /const {\s*register,\s*handleSubmit,\s*control,\s*reset,\s*formState: {\s*errors\s*}\s*} = useForm/,
    `const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm`
  );

  // Calcular precio cliente en vivo
  const hookHookTarget = `const { toast } = useToast();`;
  const livePriceCode = `const { toast } = useToast();
    const watchedPrice = watch("price");
    const liveClientPrice = calcularPrecioCliente(watchedPrice, planContext);
    const comisionRate = obtenerTasaComisionHibrida(planContext);
    const comisionPercent = Math.round(comisionRate * 100);`;

  updated = updated.replace(hookHookTarget, livePriceCode);

  // Reemplazar la sección del input de precio en la UI
  const oldGrid = `<div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="price">Precio</Label>
                            <Input id="price" type="number" step="0.01" {...register("price")} />
                            {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
                        </div>`;

  const newGrid = `<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

  if (updated.includes(oldGrid)) {
    updated = updated.replace(oldGrid, newGrid);
  }

  return updated;
});

// 3. MODIFICAR src/app/(dashboard)/dashboard/catalogo/page.tsx
backupAndEdit('src/app/(dashboard)/dashboard/catalogo/page.tsx', (content) => {
  if (content.includes('planContext={pricingContext}')) return content;

  // Importar helpers de planes
  let updated = content.replace(
    /import type { Business } from '\.\.\/\.\.\/\.\.\/\.\.\/models\/business';/,
    `import type { Business } from '../../../../models/business';\nimport { type PricingContext, obtenerTasaComisionHibrida } from '@/constants/pricingPlans';\nimport { Badge } from '@/components/ui/badge';`
  );

  // Agregar estado para businessData
  updated = updated.replace(
    /const \[isFormOpen, setIsFormOpen\] = useState\(false\);/,
    `const [isFormOpen, setIsFormOpen] = useState(false);\n    const [businessData, setBusinessData] = useState<Business | null>(null);`
  );

  // Guardar businessData al obtenerlo
  updated = updated.replace(
    /const businessRootData = businessSnap\.exists\(\) \? businessSnap\.data\(\) as Business : null;/,
    `const businessRootData = businessSnap.exists() ? businessSnap.data() as Business : null;\n                if (isMounted) setBusinessData(businessRootData);`
  );

  // Crear pricingContext memoizado
  const memoCode = `
    const pricingContext: PricingContext = useMemo(() => {
        const type = businessData?.planType || (plan?.name?.toLowerCase().includes('crecimiento') || plan?.name?.toLowerCase().includes('estándar') || plan?.name?.toLowerCase().includes('profesional') || plan?.name?.toLowerCase().includes('básico') ? 'hibrido' : 'fijo');
        return {
            planType: type,
            planName: businessData?.planName || plan?.name,
            planSlug: (plan as any)?.slug,
            comisionRate: (plan as any)?.comision || (plan as any)?.commission,
        };
    }, [businessData, plan]);
  `;
  
  updated = updated.replace(
    /const isAuthorized = useMemo\(/,
    `${memoCode}\n    const isAuthorized = useMemo(`
  );

  // Asegurar guardado de basePrice en handleSaveProduct
  updated = updated.replace(
    /const dataToSave = { \.\.\.productData, businessId: user\.uid };/,
    `const dataToSave = { ...productData, basePrice: (productData as any).basePrice ?? productData.price, businessId: user.uid };`
  );

  // Pasar planContext a ProductForm
  updated = updated.replace(
    /<ProductForm \s*product={editingProduct}/,
    `<ProductForm \n                                    planContext={pricingContext}\n                                    product={editingProduct}`
  );

  // Pasar planContext a ProductCard
  updated = updated.replace(
    /<ProductCard key={product\.id} product={product}>/,
    `<ProductCard key={product.id} product={product} planContext={pricingContext}>`
  );

  // Inyectar el Badge superior dinámico del plan antes del grid de productos
  const badgeBlock = `
            {/* Banner dinámico de plan Menfy */}
            <div className="mb-6 p-4 rounded-xl border bg-card/60 backdrop-blur shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tu Plan:</span>
                        <span className="text-sm font-bold text-foreground">{pricingContext.planName || 'Plan Menfy'}</span>
                        <Badge variant={pricingContext.planType === 'hibrido' ? 'default' : 'secondary'}>
                            {pricingContext.planType === 'hibrido' ? 'Modelo Híbrido' : 'Modelo Fijo'}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {pricingContext.planType === 'hibrido'
                            ? \`Según tu plan, se aplica \${Math.round(obtenerTasaComisionHibrida(pricingContext) * 100)}% de servicio Menfy en los precios al cliente. Tú recibes siempre el 100% de tu precio base.\`
                            : 'Tu plan incluye el servicio Menfy por mensualidad fija. Sin comisiones sobre tus platos. El cliente paga exactamente tu precio base.'}
                    </p>
                </div>
            </div>
  `;

  updated = updated.replace(
    /<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">/,
    `${badgeBlock}\n            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">`
  );

  return updated;
});

console.log('\n🎉 Fase 2 completada exitosamente.');
