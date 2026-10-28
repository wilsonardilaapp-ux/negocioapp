const fs = require('fs');

function moveUseClientToTop(file) {
  if (!fs.existsSync(file)) {
    console.error(`[ERROR] No existe ${file}`);
    return;
  }

  // 1. Crear respaldo (.bak)
  const original = fs.readFileSync(file, 'utf8');
  const backup = `${file}.bak`;
  fs.writeFileSync(backup, original, 'utf8');
  console.log(`[RESPALDO CREADO] ${backup}`);

  // 2. Remover todas las apariciones existentes de "use client"; o 'use client';
  let cleanContent = original.replace(/['"]use client['"];?\s*\r?\n?/g, '').trim();

  // 3. Colocar "use client"; en la línea 1 exacta
  const finalContent = `"use client";\n\n${cleanContent}\n`;

  fs.writeFileSync(file, finalContent, 'utf8');
  console.log(`[CORREGIDO CON ÉXITO] ${file}`);
}

console.log('====================================================');
console.log('   REUBICANDO "use client"; EN LA LÍNEA 1');
console.log('====================================================\n');

moveUseClientToTop('src/app/(dashboard)/dashboard/kardex/page.tsx');
moveUseClientToTop('src/app/(dashboard)/dashboard/reservas/layout.tsx');

console.log('\n--- VERIFICACIÓN DE LAS PRIMERAS LÍNEAS ---');

function printTop(file) {
  console.log(`\n• ${file}:`);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.slice(0, 6).forEach((l, i) => console.log(`   L${i + 1}: ${l}`));
}

printTop('src/app/(dashboard)/dashboard/kardex/page.tsx');
printTop('src/app/(dashboard)/dashboard/reservas/layout.tsx');
