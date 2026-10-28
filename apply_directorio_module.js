const fs = require('fs');

function backupFile(file) {
  if (!fs.existsSync(file)) {
    console.error(`[ERROR] Archivo no existe: ${file}`);
    return false;
  }
  const backup = `${file}.bak`;
  fs.writeFileSync(backup, fs.readFileSync(file, 'utf8'), 'utf8');
  console.log(`[RESPALDO CREADO] ${backup}`);
  return true;
}

console.log('====================================================');
console.log('   APLICANDO PROTECCIÓN A DIRECTORIO Y VALORACIONES');
console.log('====================================================\n');

// 1. Modificar valoraciones-directorio/page.tsx
const pageFile = 'src/app/(dashboard)/dashboard/valoraciones-directorio/page.tsx';
if (backupFile(pageFile)) {
  let content = fs.readFileSync(pageFile, 'utf8');

  // Agregar import de useSubscription si no existe
  if (!content.includes('useSubscription')) {
    content = content.replace(
      "import { useBusinessRatings } from '@/hooks/useBusinessRatings';",
      "import { useBusinessRatings } from '@/hooks/useBusinessRatings';\nimport { useSubscription } from '@/hooks/useSubscription';"
    );
  }

  // Agregar Frown a lucide-react si no existe
  if (!content.includes('Frown')) {
    content = content.replace(
      "Loader2, Star, FileSpreadsheet, FileText",
      "Loader2, Star, FileSpreadsheet, FileText, Frown"
    );
  }

  // Consumir useSubscription en BusinessRatingsPage
  const compAnchor = 'export default function BusinessRatingsPage() {';
  const hookCall = `export default function BusinessRatingsPage() {
  const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();`;

  if (content.includes(compAnchor) && !content.includes('isModuleAuthorized')) {
    content = content.replace(compAnchor, hookCall);
  }

  // Actualizar isLoading
  content = content.replace(
    'const isLoading = isRatingsLoading || isBusinessLoading;',
    'const isLoading = isRatingsLoading || isBusinessLoading || isSubLoading;'
  );

  // Agregar guarda después del bloque isLoading
  const loadingAnchor = `  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }`;

  const guardBlock = `

  if (!isModuleAuthorized('business-directory')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Módulo de Directorio Desactivado</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
          <Frown className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
          <p className="text-muted-foreground max-w-sm">
            El módulo de &quot;Directorio de Negocios&quot; no está activo en tu plan actual. Por favor, contacta al administrador de la plataforma para más información.
          </p>
        </CardContent>
      </Card>
    );
  }`;

  if (content.includes(loadingAnchor) && !content.includes("isModuleAuthorized('business-directory')")) {
    content = content.replace(loadingAnchor, `${loadingAnchor}${guardBlock}`);
  }

  fs.writeFileSync(pageFile, content, 'utf8');
  console.log(`[MODIFICADO CON ÉXITO] ${pageFile}`);
}

// 2. Modificar client-nav.tsx
const navFile = 'src/components/layout/client-nav.tsx';
if (backupFile(navFile)) {
  let navContent = fs.readFileSync(navFile, 'utf8');

  const oldNav = '{ href: "/dashboard/valoraciones-directorio", icon: Star, label: "Valoraciones del Directorio" },';
  const newNav = '{ href: "/dashboard/valoraciones-directorio", icon: Star, label: "Valoraciones del Directorio", moduleId: \'business-directory\' },';

  if (navContent.includes(oldNav)) {
    navContent = navContent.replace(oldNav, newNav);
    fs.writeFileSync(navFile, navContent, 'utf8');
    console.log(`[MODIFICADO CON ÉXITO] ${navFile}`);
  } else if (navContent.includes(newNav)) {
    console.log(`[YA CONFIGURADO] ${navFile}`);
  } else {
    console.warn('[ADVERTENCIA] No se encontró la coincidencia exacta en client-nav.tsx');
  }
}

// 3. Verificación
console.log('\n--- VERIFICACIÓN FINAL ---');
const checkPage = fs.readFileSync(pageFile, 'utf8');
const checkNav = fs.readFileSync(navFile, 'utf8');
console.log('¿Página tiene isModuleAuthorized("business-directory")?:', checkPage.includes("isModuleAuthorized('business-directory')"));
console.log('¿Nav tiene moduleId: "business-directory"?:', checkNav.includes("moduleId: 'business-directory'"));
console.log('¿Existen ambos respaldos .bak?:', fs.existsSync(`${pageFile}.bak`) && fs.existsSync(`${navFile}.bak`));
