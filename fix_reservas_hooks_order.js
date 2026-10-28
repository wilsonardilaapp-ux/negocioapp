const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/reservas/layout.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] Archivo no existe: ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

// 2. Reconstrucción ordenada del componente
const targetOldBlock = `export default function ReservasLayout({ children }: { children: React.ReactNode }) {
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

  const pathname = usePathname();
  
  const config = useMemo(() => {
    return HEADER_CONFIG[pathname] || HEADER_CONFIG['/dashboard/reservas'];
  }, [pathname]);

  const Icon = config.icon;`;

const orderedBlock = `export default function ReservasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const config = useMemo(() => {
    return HEADER_CONFIG[pathname] || HEADER_CONFIG['/dashboard/reservas'];
  }, [pathname]);

  const Icon = config.icon;

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
  }`;

let updated = original;

// Normalizamos saltos de línea para el reemplazo seguro
const normalizeLF = str => str.replace(/\r\n/g, '\n');
const normOriginal = normalizeLF(original);
const normTarget = normalizeLF(targetOldBlock);
const normOrdered = normalizeLF(orderedBlock);

if (normOriginal.includes(normTarget)) {
  updated = normOriginal.replace(normTarget, normOrdered);
} else {
  // En caso de discrepancia menor de formato, aplicamos regex
  const regex = /export default function ReservasLayout[\s\S]*?const Icon = config\.icon;/;
  updated = normOriginal.replace(regex, normOrdered);
}

// 3. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 4. Verificación
console.log('\n--- VERIFICACIÓN DE ESTRUCTURA INTERNA ---');
const lines = fs.readFileSync(file, 'utf8').split('\n');
const startIdx = lines.findIndex(l => l.includes('export default function ReservasLayout'));
console.log(lines.slice(startIdx, startIdx + 30).map((l, i) => `${i + startIdx + 1}: ${l}`).join('\n'));
