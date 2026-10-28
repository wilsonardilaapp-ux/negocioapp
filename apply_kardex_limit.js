const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/kardex/page.tsx';
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

// 2. Imports aditivos
if (!updated.includes('LimitBanner')) {
  updated = updated.replace(
    "import { useSubscription } from '@/hooks/useSubscription';",
    "import { useSubscription } from '@/hooks/useSubscription';\nimport { LimitBanner } from '@/components/dashboard/LimitBanner';"
  );
}

if (!updated.includes('Info')) {
  updated = updated.replace(
    "Loader2, Frown",
    "Loader2, Frown, Info"
  );
}

if (!updated.includes('useMemo } from \'react\'')) {
  updated = updated.replace(
    "import { useState, useEffect } from 'react';",
    "import { useState, useEffect, useMemo } from 'react';"
  );
}

// 3. Destructurar planDetails y calcular límite dinámico
const subAnchor = 'const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();';
const newSubCall = 'const { isModuleAuthorized, isLoading: isSubLoading, plan, planDetails, allHybridPlans } = useSubscription();';

if (updated.includes(subAnchor)) {
  updated = updated.replace(subAnchor, newSubCall);
}

const effectAnchor = `    // Sincronizar el ítem inicial cuando se cargan los productos si no hay uno seleccionado
    useEffect(() => {
        if (!selectedItemId && kardexData.items.length > 0) {
            setSelectedItemId(kardexData.items[0].id);
        }
    }, [kardexData.items, selectedItemId]);`;

const limitLogic = `    // Sincronizar el ítem inicial cuando se cargan los productos si no hay uno seleccionado
    useEffect(() => {
        if (!selectedItemId && kardexData.items.length > 0) {
            setSelectedItemId(kardexData.items[0].id);
        }
    }, [kardexData.items, selectedItemId]);

    // --- RESOLUCIÓN DINÁMICA DE LÍMITE DE KARDEX (PLAN HÍBRIDO) ---
    const kardexLimit = useMemo(() => {
        const activePlan = planDetails || (allHybridPlans?.[0] as any);
        const extraLimits = activePlan?.extraLimits;
        if (Array.isArray(extraLimits)) {
            const item = extraLimits.find((el: any) => 
                /kardex|inventario/i.test(el.key || '')
            );
            if (item && typeof item.value === 'number') {
                return item.value;
            }
        }
        return 60; // Límite base predeterminado
    }, [planDetails, allHybridPlans]);

    const kardexItemsCount = kardexData?.items?.length ?? 0;`;

if (updated.includes(effectAnchor) && !updated.includes('kardexLimit = useMemo')) {
  updated = updated.replace(effectAnchor, limitLogic);
}

// 4. Inyección del LimitBanner y la barra en el JSX
const returnAnchor = `    return (
        <div className="space-y-6">`;

const returnWithBanner = `    return (
        <div className="space-y-6">
            <LimitBanner 
                current={kardexItemsCount} 
                limit={kardexLimit} 
                label="productos en kardex" 
                plan={typeof plan === 'string' ? plan : (plan as any)?.name || 'Plan'} 
            />

            <div className="flex items-center gap-2 rounded-2xl border bg-secondary/50 p-3 text-xs text-muted-foreground shadow-sm">
                <Info className="h-4 w-4 text-primary shrink-0" />
                <span>Límite de Inventario Kardex del plan: <strong className="text-foreground font-bold">{kardexItemsCount} / {kardexLimit === -1 ? '∞' : kardexLimit}</strong></span>
            </div>`;

if (updated.includes(returnAnchor) && !updated.includes('Límite de Inventario Kardex del plan:')) {
  updated = updated.replace(returnAnchor, returnWithBanner);
}

// 5. Guardar archivo
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 6. Auto-verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN FINAL ---');
console.log('¿Importa useMemo desde react?:', check.includes('useState, useEffect, useMemo'));
console.log('¿Importa LimitBanner?:', check.includes('LimitBanner'));
console.log('¿Calcula kardexLimit?:', check.includes('kardexLimit = useMemo'));
console.log('¿Tiene indicador "Límite de Inventario Kardex del plan"?:', check.includes('Límite de Inventario Kardex del plan:'));
console.log('¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
