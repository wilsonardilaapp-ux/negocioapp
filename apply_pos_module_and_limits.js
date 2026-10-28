const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/pos/page.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] Archivo no existe: ${file}`);
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
    "import { useSubscription } from '@/hooks/useSubscription';\nimport { LimitBanner } from '@/components/dashboard/LimitBanner';\nimport { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';"
  );
}

if (!updated.includes('Frown')) {
  updated = updated.replace(
    "Loader2, Calculator, CreditCard",
    "Loader2, Calculator, CreditCard, Frown"
  );
}

// 3. Extraer validaciones de useSubscription
const subAnchor = 'const { plan: subPlan, allHybridPlans } = useSubscription();';
const newSubCall = 'const { plan: subPlan, allHybridPlans, isModuleAuthorized, isLoading: isSubLoading, limits, ordersCount } = useSubscription();';

if (updated.includes(subAnchor)) {
  updated = updated.replace(subAnchor, newSubCall);
}

// 4. Bloque de guarda de autorización y carga
const oldLoadingAnchor = `  if (loadingBusiness && !business) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Iniciando Terminal de Facturación...</p>
      </div>
    );
  }`;

const newLoadingAndGuard = `  if ((loadingBusiness && !business) || isSubLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Iniciando Terminal de Facturación...</p>
      </div>
    );
  }

  if (!isModuleAuthorized('catalogo')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Terminal POS Desactivado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
          <Frown className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
          <p className="text-muted-foreground max-w-sm">
            El módulo de &quot;Catálogo y Terminal POS&quot; no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
          </p>
        </CardContent>
      </Card>
    );
  }`;

if (updated.includes(oldLoadingAnchor) && !updated.includes("!isModuleAuthorized('catalogo')")) {
  updated = updated.replace(oldLoadingAnchor, newLoadingAndGuard);
}

// 5. Inyectar LimitBanner tras la cabecera
const headerCloseAnchor = `      </header>`;
const bannerInjection = `      </header>

      {limits && (
        <LimitBanner 
          current={ordersCount} 
          limit={limits.orders} 
          label="pedidos/mes" 
          plan={typeof subPlan === 'string' ? subPlan : (subPlan as any)?.name || 'Plan'} 
        />
      )}`;

if (updated.includes(headerCloseAnchor) && !updated.includes('label="pedidos/mes"')) {
  updated = updated.replace(headerCloseAnchor, bannerInjection);
}

// 6. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[MODIFICADO CON ÉXITO] ${file}`);

// 7. Auto-verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN FINAL ---');
console.log('¿Importa LimitBanner?:', check.includes('LimitBanner'));
console.log('¿Valida isModuleAuthorized("catalogo")?:', check.includes("!isModuleAuthorized('catalogo')"));
console.log('¿Renderiza LimitBanner en POS?:', check.includes('label="pedidos/mes"'));
console.log('¿Existe el respaldo .bak?:', fs.existsSync(backupFile));
