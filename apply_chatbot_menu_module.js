const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] Archivo no encontrado: ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

let updated = original;

// 2. Agregar Frown a lucide-react si no está
if (!updated.includes('Frown')) {
  updated = updated.replace(
    "} from 'lucide-react';",
    "  Frown,\n} from 'lucide-react';"
  );
}

// 3. Insertar la guarda después del bloque de loading
const loadingAnchor = `  if (loadingConfig || loadingResponses || loadingGlobalModule || isSubLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Sincronizando asistente...</p>
      </div>
    );
  }`;

const guardCode = `

  if (!isModuleAuthorized(PUBLIC_MENU_CHATBOT_MODULE_ID) && !isPlatformBot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Chatbot Menú Desactivado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
          <Frown className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
          <p className="text-muted-foreground max-w-sm">
            El módulo de &quot;Chatbot Menú&quot; no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
          </p>
        </CardContent>
      </Card>
    );
  }`;

if (updated.includes(loadingAnchor) && !updated.includes("!isModuleAuthorized(PUBLIC_MENU_CHATBOT_MODULE_ID)")) {
  updated = updated.replace(loadingAnchor, `${loadingAnchor}${guardCode}`);
} else {
  console.warn('[ADVERTENCIA] No se encontró el ancla de loading o ya existía la validación.');
}

// 4. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[MODIFICADO CON ÉXITO] ${file}`);

// 5. Verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN ---');
console.log('¿Contiene Frown importado?:', check.includes('Frown'));
console.log('¿Contiene la guarda de autorización?:', check.includes('!isModuleAuthorized(PUBLIC_MENU_CHATBOT_MODULE_ID) && !isPlatformBot'));
console.log('¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
