const fs = require('fs');

const file = 'src/components/reservas/AgendaGrid.tsx';
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
    "import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';",
    "import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';\nimport { LimitBanner } from '@/components/dashboard/LimitBanner';\nimport { useSubscription } from '@/hooks/useSubscription';"
  );
}

if (!updated.includes('Info,')) {
  updated = updated.replace(
    "FileSpreadsheet,\n  FileText",
    "FileSpreadsheet,\n  FileText,\n  Info"
  );
}

// 3. Hooks y cálculo de límite dentro de AgendaGrid
const funcStart = 'export function AgendaGrid() {';
const hookInjection = `export function AgendaGrid() {
  const { plan, planDetails, allHybridPlans } = useSubscription();`;

if (updated.includes(funcStart) && !updated.includes('allHybridPlans } = useSubscription()')) {
  updated = updated.replace(funcStart, hookInjection);
}

const rawResAnchor = 'const { data: rawReservations, isLoading } = useCollection<Reservation>(resQuery);';
const limitCalcInjection = `const { data: rawReservations, isLoading } = useCollection<Reservation>(resQuery);

  // --- RESOLUCIÓN DINÁMICA DE LÍMITES DE CITAS (PLAN HÍBRIDO) ---
  const reservasLimit = useMemo(() => {
    const activePlan = planDetails || (allHybridPlans?.[0] as any);
    const extraLimits = activePlan?.extraLimits;
    if (Array.isArray(extraLimits)) {
      const item = extraLimits.find((el: any) => 
        /reserva|cita/i.test(el.key || '')
      );
      if (item && typeof item.value === 'number') {
        return item.value;
      }
    }
    return 30; // Límite base predeterminado
  }, [planDetails, allHybridPlans]);

  const totalReservationsCount = useMemo(() => {
    return (rawReservations || []).filter(r => r.status !== 'cancelled').length;
  }, [rawReservations]);

  const isLimitReached = reservasLimit !== -1 && totalReservationsCount >= reservasLimit;`;

if (updated.includes(rawResAnchor) && !updated.includes('reservasLimit')) {
  updated = updated.replace(rawResAnchor, limitCalcInjection);
}

// 4. Inyección visual del banner y el contador de límite en el return
const returnStart = '  return (\n    <div className="space-y-6">';
const returnWithBanner = `  return (
    <div className="space-y-6">
      <LimitBanner 
        current={totalReservationsCount} 
        limit={reservasLimit} 
        label="citas/reservas" 
        plan={typeof plan === 'string' ? plan : (plan as any)?.name || 'Plan'} 
      />

      <div className="flex items-center gap-2 rounded-2xl border bg-secondary/50 p-3 text-xs text-muted-foreground shadow-sm">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span>Límite de citas del plan: <strong className="text-foreground font-bold">{totalReservationsCount} / {reservasLimit === -1 ? '∞' : reservasLimit}</strong></span>
      </div>`;

if (updated.includes(returnStart) && !updated.includes('Límite de citas del plan:')) {
  updated = updated.replace(returnStart, returnWithBanner);
}

// 5. Botones con deshabilitación cuando se alcanza el límite
const btn1Old = '<Button onClick={() => { setEditingReservation(null); setIsModalOpen(true); }} className="font-black shadow-lg shadow-primary/10">';
const btn1New = '<Button onClick={() => { setEditingReservation(null); setIsModalOpen(true); }} disabled={isLimitReached} title={isLimitReached ? "Límite de citas alcanzado para tu plan. Actualiza tu suscripción." : undefined} className="font-black shadow-lg shadow-primary/10">';
if (updated.includes(btn1Old)) {
  updated = updated.replace(btn1Old, btn1New);
}

const btn2Old = '<Button onClick={() => { setEditingReservation(null); setIsModalOpen(true); }} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5 h-12 px-8 rounded-xl">';
const btn2New = '<Button onClick={() => { setEditingReservation(null); setIsModalOpen(true); }} disabled={isLimitReached} title={isLimitReached ? "Límite de citas alcanzado para tu plan. Actualiza tu suscripción." : undefined} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5 h-12 px-8 rounded-xl">';
if (updated.includes(btn2Old)) {
  updated = updated.replace(btn2Old, btn2New);
}

// 6. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 7. Auto-verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN FINAL ---');
console.log('¿Importa LimitBanner?:', check.includes('LimitBanner'));
console.log('¿Calcula reservasLimit?:', check.includes('reservasLimit = useMemo'));
console.log('¿Tiene indicador "Límite de citas del plan"?:', check.includes('Límite de citas del plan:'));
console.log('¿Botones tienen disabled={isLimitReached}?:', check.includes('disabled={isLimitReached}'));
console.log('¿Existe el respaldo .bak?:', fs.existsSync(backupFile));
