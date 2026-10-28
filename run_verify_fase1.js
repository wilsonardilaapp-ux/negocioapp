const fs = require('fs');

function checkFile(filePath, keywords) {
  console.log(`\n--- VERIFICACIÓN: ${filePath} ---`);
  if (!fs.existsSync(filePath)) return console.error(`No existe ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  for (const kw of keywords) {
    const found = content.includes(kw);
    console.log(`  [${found ? 'OK' : 'FALTA'}] Contiene "${kw}"`);
  }
}

checkFile('src/app/(dashboard)/dashboard/suggestions/page.tsx', [
  'suggestionLimitReached',
  'disabled={suggestionLimitReached}'
]);

checkFile('src/app/(dashboard)/dashboard/reservas/layout.tsx', [
  'useSubscription',
  "isModuleAuthorized('reservas-agendamiento')",
  'Módulo de Reservas y Citas Desactivado'
]);

checkFile('src/app/(dashboard)/dashboard/kardex/page.tsx', [
  'useSubscription',
  "isModuleAuthorized('inventario-kardex')",
  'Módulo de Inventario Kardex Desactivado'
]);

console.log('\nVerificando existencia de respaldos .bak:');
['src/app/(dashboard)/dashboard/suggestions/page.tsx.bak',
 'src/app/(dashboard)/dashboard/reservas/layout.tsx.bak',
 'src/app/(dashboard)/dashboard/kardex/page.tsx.bak'].forEach(b => {
   console.log(`  [${fs.existsSync(b) ? 'EXISTE' : 'NO EXISTE'}] ${b}`);
 });
