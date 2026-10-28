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

// 2. Bloque objetivo exacto a sustituir
const oldLoadingBlock = `  if (loadingBusiness) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando inteligencia de clientes...</p>
      </div>
    );
  }

  if (!user || !business) return null;`;

const newGuardBlock = `  if (loadingBusiness || isSubLoading) {
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
  }

  if (!user || !business) return null;`;

let updated = original;

const normalizeLF = str => str.replace(/\r\n/g, '\n');
const normOriginal = normalizeLF(original);
const normOld = normalizeLF(oldLoadingBlock);
const normNew = normalizeLF(newGuardBlock);

if (normOriginal.includes(normOld)) {
  updated = normOriginal.replace(normOld, normNew);
} else {
  // Regex de seguridad
  const regex = /if\s*\(\s*loadingBusiness\s*\)\s*\{[\s\S]*?if\s*\(\s*!user\s*\|\|\s*!business\s*\)\s*return null;/;
  updated = normOriginal.replace(regex, normNew);
}

// 3. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 4. Verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN FINAL ---');
console.log('¿Valida isModuleAuthorized("loyalty")?:', check.includes("!isModuleAuthorized('loyalty')"));
console.log('¿Tiene indicador de límite en UI?:', check.includes('Límite de Fidelización e Inteligencia (IA) del plan:'));
console.log('¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
