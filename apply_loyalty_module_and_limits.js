const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
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
if (!updated.includes('useSubscription')) {
  updated = updated.replace(
    "import { useToast } from '@/hooks/use-toast';",
    "import { useToast } from '@/hooks/use-toast';\nimport { useSubscription } from '@/hooks/useSubscription';\nimport { LimitBanner } from '@/components/dashboard/LimitBanner';"
  );
}

if (!updated.includes('Frown,')) {
  updated = updated.replace(
    "Loader2,",
    "Loader2,\n    Frown,"
  );
}

// 3. Hooks y lógica en LoyaltyDashboardPage
const pageStartAnchor = 'export default function LoyaltyDashboardPage() {';
const hooksInjection = `export default function LoyaltyDashboardPage() {
  const { plan, planDetails, allHybridPlans, isModuleAuthorized, isLoading: isSubLoading } = useSubscription();
  const [recoveryCount, setRecoveryCount] = useState<number>(0);`;

if (updated.includes(pageStartAnchor) && !updated.includes('allHybridPlans, isModuleAuthorized')) {
  updated = updated.replace(pageStartAnchor, hooksInjection);
}

// Hook de límite y efecto para getRecoveryStats
const stateAnchor = 'const [isExporting, setIsExporting] = useState(false);';
const limitCalcCode = `const [isExporting, setIsExporting] = useState(false);

  // --- RESOLUCIÓN DINÁMICA DE LÍMITES DE FIDELIZACIÓN (PLAN HÍBRIDO) ---
  const loyaltyLimit = useMemo(() => {
    const activePlan = planDetails || (allHybridPlans?.[0] as any);
    const extraLimits = activePlan?.extraLimits;
    if (Array.isArray(extraLimits)) {
      const item = extraLimits.find((el: any) => 
        /fideliza|loyalty|inteligencia/i.test(el.key || '')
      );
      if (item && typeof item.value === 'number') {
        return item.value;
      }
    }
    return 10; // Valor configurado en el plan
  }, [planDetails, allHybridPlans]);

  useEffect(() => {
    if (user?.uid) {
      getRecoveryStats(user.uid)
        .then(stats => setRecoveryCount(stats?.count || 0))
        .catch(() => {});
    }
  }, [user?.uid]);`;

if (updated.includes(stateAnchor) && !updated.includes('loyaltyLimit = useMemo')) {
  updated = updated.replace(stateAnchor, limitCalcCode);
}

// 4. Bloque de guarda de autorización de módulo y loader
const oldLoadingAnchor = `  if (loadingBusiness || loadingReviews) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando inteligencia de clientes...</p>
      </div>
    );
  }`;

const newGuardBlock = `  if (loadingBusiness || loadingReviews || isSubLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando inteligencia de clientes...</p>
      </div>
    );
  }

  if (!isModuleAuthorized('loyalty')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Fidelización e Inteligencia Desactivado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
          <Frown className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
          <p className="text-muted-foreground max-w-sm">
            El módulo de &quot;Fidelización e Inteligencia (IA)&quot; no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
          </p>
        </CardContent>
      </Card>
    );
  }`;

if (updated.includes(oldLoadingAnchor) && !updated.includes("!isModuleAuthorized('loyalty')")) {
  updated = updated.replace(oldLoadingAnchor, newGuardBlock);
}

// 5. Inyección de LimitBanner e Indicador bajo la cabecera
const headerCloseAnchor = `      </header>`;
const bannerInjection = `      </header>

      <LimitBanner 
        current={recoveryCount} 
        limit={loyaltyLimit} 
        label="acciones de IA / fidelización" 
        plan={typeof plan === 'string' ? plan : (plan as any)?.name || 'Plan'} 
      />

      <div className="flex items-center gap-2 rounded-2xl border bg-secondary/50 p-3 text-xs text-muted-foreground shadow-sm">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span>Límite de Fidelización e Inteligencia (IA) del plan: <strong className="text-foreground font-bold">{recoveryCount} / {loyaltyLimit === -1 ? '∞' : loyaltyLimit}</strong></span>
      </div>`;

if (updated.includes(headerCloseAnchor) && !updated.includes('Límite de Fidelización e Inteligencia (IA) del plan:')) {
  updated = updated.replace(headerCloseAnchor, bannerInjection);
}

// 6. Guardar archivo
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 7. Auto-verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN FINAL ---');
console.log('¿Importa useSubscription y LimitBanner?:', check.includes('LimitBanner'));
console.log('¿Calcula loyaltyLimit?:', check.includes('loyaltyLimit = useMemo'));
console.log('¿Valida isModuleAuthorized("loyalty")?:', check.includes("!isModuleAuthorized('loyalty')"));
console.log('¿Tiene indicador de Fidelización e IA?:', check.includes('Límite de Fidelización e Inteligencia (IA) del plan:'));
console.log('¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
