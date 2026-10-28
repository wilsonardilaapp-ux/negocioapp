const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/vencimientos/page.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] No existe ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

let updated = original;

// 2. Imports
if (!updated.includes('LimitBanner')) {
  updated = updated.replace(
    "import { useSubscription } from '@/hooks/useSubscription';",
    "import { useSubscription } from '@/hooks/useSubscription';\nimport { LimitBanner } from '@/components/dashboard/LimitBanner';"
  );
}

if (!updated.includes('Info,')) {
  updated = updated.replace(
    "Loader2,",
    "Loader2,\n  Info,"
  );
}

// 3. Extraer planDetails y calcular límite dinámico
const subAnchor = 'const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();';
const newSubCall = 'const { isModuleAuthorized, isLoading: isSubLoading, plan, planDetails, allHybridPlans } = useSubscription();';

if (updated.includes(subAnchor)) {
  updated = updated.replace(subAnchor, newSubCall);
}

const batchesAnchor = 'const { data: batches, isLoading: isBatchesLoading } = useCollection<InventoryBatch>(batchesQuery);';
const limitCalcCode = `const { data: batches, isLoading: isBatchesLoading } = useCollection<InventoryBatch>(batchesQuery);

  // --- RESOLUCIÓN DINÁMICA DE LÍMITE DE VENCIMIENTOS (PLAN HÍBRIDO) ---
  const vencimientosLimit = useMemo(() => {
    const activePlan = planDetails || (allHybridPlans?.[0] as any);
    const extraLimits = activePlan?.extraLimits;
    if (Array.isArray(extraLimits)) {
      const item = extraLimits.find((el: any) => 
        /vencimiento|alerta/i.test(el.key || '')
      );
      if (item && typeof item.value === 'number') {
        return item.value;
      }
    }
    return 20; // Límite base predeterminado
  }, [planDetails, allHybridPlans]);

  const totalBatchesCount = batches?.length ?? 0;`;

if (updated.includes(batchesAnchor) && !updated.includes('vencimientosLimit = useMemo')) {
  updated = updated.replace(batchesAnchor, limitCalcCode);
}

// 4. Inyección del LimitBanner y la barra en el JSX
const headerAnchor = `<div className="space-y-6">
      {/* Encabezado con Botones de Prueba */}`;

const headerWithBanner = `<div className="space-y-6">
      {/* Límites del Plan */}
      <LimitBanner 
        current={totalBatchesCount} 
        limit={vencimientosLimit} 
        label="lotes monitoreados" 
        plan={typeof plan === 'string' ? plan : (plan as any)?.name || 'Plan'} 
      />

      <div className="flex items-center gap-2 rounded-2xl border bg-secondary/50 p-3 text-xs text-muted-foreground shadow-sm">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span>Límite de Alertas de Vencimiento del plan: <strong className="text-foreground font-bold">{totalBatchesCount} / {vencimientosLimit === -1 ? '∞' : vencimientosLimit}</strong></span>
      </div>

      {/* Encabezado con Botones de Prueba */}`;

if (updated.includes(headerAnchor) && !updated.includes('Límite de Alertas de Vencimiento del plan:')) {
  updated = updated.replace(headerAnchor, headerWithBanner);
}

// 5. Guardar archivo
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 6. Auto-verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN FINAL ---');
console.log('¿Importa LimitBanner?:', check.includes('LimitBanner'));
console.log('¿Calcula vencimientosLimit?:', check.includes('vencimientosLimit = useMemo'));
console.log('¿Tiene indicador "Límite de Alertas de Vencimiento del plan"?:', check.includes('Límite de Alertas de Vencimiento del plan:'));
console.log('¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
