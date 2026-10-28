const fs = require('fs');
const path = require('path');

function backupAndApply(filePath, transformFn) {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Archivo no encontrado: ${filePath}`);
    return false;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  const backupPath = `${filePath}.bak`;
  fs.writeFileSync(backupPath, original, 'utf8');
  console.log(`[RESPALDO CREADO] ${backupPath}`);

  try {
    const updated = transformFn(original);
    if (!updated || updated === original) {
      console.warn(`[SIN CAMBIOS] No se aplicó ninguna modificación en: ${filePath}`);
      return false;
    }
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`[MODIFICADO CON ÉXITO] ${filePath}`);
    return true;
  } catch (err) {
    console.error(`[ERROR AL MODIFICAR] ${filePath}:`, err.message);
    // Restaurar si falla
    fs.writeFileSync(filePath, original, 'utf8');
    return false;
  }
}

console.log('====================================================');
console.log('   INICIANDO APLICACIÓN QUIRÚRGICA DE LÍMITES');
console.log('====================================================\n');

// 1. SUGERENCIAS: Deshabilitar botón Nueva Regla al llegar al límite
backupAndApply('src/app/(dashboard)/dashboard/suggestions/page.tsx', (content) => {
  // Asegurar la constante suggestionLimitReached
  let updated = content;
  if (!updated.includes('suggestionLimitReached')) {
    const targetAnchor = 'const totalOrdersCount = orders?.length ?? 0;';
    if (updated.includes(targetAnchor)) {
      updated = updated.replace(
        targetAnchor,
        `${targetAnchor}\n    const suggestionLimitReached = limits.suggestions !== -1 && suggestionsCount >= limits.suggestions;`
      );
    } else {
      // Fallback cerca de render
      const fallbackAnchor = 'return (';
      const idx = updated.lastIndexOf(fallbackAnchor);
      if (idx !== -1) {
        updated = updated.slice(0, idx) + 'const suggestionLimitReached = limits.suggestions !== -1 && suggestionsCount >= limits.suggestions;\n\n    ' + updated.slice(idx);
      }
    }
  }

  // Modificar botón Nueva Regla
  const buttonOld = '<Button onClick={handleAddNewRule}>';
  const buttonNew = '<Button onClick={handleAddNewRule} disabled={suggestionLimitReached} title={suggestionLimitReached ? "Límite de reglas de sugerencia alcanzado para tu plan" : undefined}>';
  if (updated.includes(buttonOld)) {
    updated = updated.replace(buttonOld, buttonNew);
  }

  return updated;
});

// 2. RESERVAS: Proteger layout global con isModuleAuthorized('reservas-agendamiento')
backupAndApply('src/app/(dashboard)/dashboard/reservas/layout.tsx', (content) => {
  let updated = content;

  // Agregar imports necesarios
  if (!updated.includes('useSubscription')) {
    updated = "import { useSubscription } from '@/hooks/useSubscription';\nimport { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';\nimport { Loader2, Frown } from 'lucide-react';\n" + updated;
  }

  // Insertar chequeo de suscripción dentro del componente ReservasLayout
  const componentAnchor = 'export default function ReservasLayout({ children }: { children: React.ReactNode }) {';
  const checkCode = `
  const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();

  if (isSubLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!isModuleAuthorized('reservas-agendamiento')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Reservas y Citas Desactivado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
          <Frown className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
          <p className="text-muted-foreground max-w-sm">
            El módulo de &quot;Reservas y Citas&quot; no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
          </p>
        </CardContent>
      </Card>
    );
  }
`;

  if (updated.includes(componentAnchor) && !updated.includes("isModuleAuthorized('reservas-agendamiento')")) {
    updated = updated.replace(componentAnchor, `${componentAnchor}${checkCode}`);
  }

  return updated;
});

// 3. KARDEX: Proteger kardex/page.tsx con isModuleAuthorized('inventario-kardex')
backupAndApply('src/app/(dashboard)/dashboard/kardex/page.tsx', (content) => {
  let updated = content;

  // Agregar imports necesarios
  if (!updated.includes('useSubscription')) {
    updated = "import { useSubscription } from '@/hooks/useSubscription';\nimport { Loader2, Frown } from 'lucide-react';\n" + updated;
  }

  // Insertar chequeo dentro de KardexPage
  const componentAnchor = 'export default function KardexPage() {';
  const checkCode = `
    const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();
`;

  const renderAnchor = 'return (';
  const guardCode = `
    if (isSubLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    if (!isModuleAuthorized('inventario-kardex')) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Módulo de Inventario Kardex Desactivado</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                    <Frown className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
                    <p className="text-muted-foreground max-w-sm">
                        El módulo de &quot;Inventario Kardex&quot; no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
                    </p>
                </CardContent>
            </Card>
        );
    }
`;

  if (updated.includes(componentAnchor) && !updated.includes("isModuleAuthorized('inventario-kardex')")) {
    updated = updated.replace(componentAnchor, `${componentAnchor}${checkCode}`);
    const lastReturnIdx = updated.lastIndexOf(renderAnchor);
    if (lastReturnIdx !== -1) {
      updated = updated.slice(0, lastReturnIdx) + guardCode + '\n    ' + updated.slice(lastReturnIdx);
    }
  }

  return updated;
});

console.log('\n====================================================');
console.log('   APLICACIÓN COMPLETADA');
console.log('====================================================');
