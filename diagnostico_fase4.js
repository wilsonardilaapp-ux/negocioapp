const fs = require('fs');

console.log('=== [PASO 1.4] ESTRUCTURA DE PESTAÑAS Y DATOS DE FIDELIZACIÓN ===\n');

// 1. Ver pestañas en Vencimientos o Inventario
const filesToCheck = ['src/jev/JevCopilotWidgetVencimientos.tsx', 'src/jev/JevCopilotWidgetInventario.tsx'];
for (const f of filesToCheck) {
  if (fs.existsSync(f)) {
    console.log(`\n--- Pestañas en ${f} ---`);
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, idx) => {
      if (/<Tabs|<TabsTrigger|<TabsContent/i.test(l)) {
        console.log(`L${idx+1}: ${l.trim()}`);
      }
    });
  }
}

// 2. Ver funciones exportadas en src/actions/loyalty.ts
if (fs.existsSync('src/actions/loyalty.ts')) {
  console.log('\n--- Funciones exportadas en src/actions/loyalty.ts ---');
  const lines = fs.readFileSync('src/actions/loyalty.ts', 'utf8').split('\n');
  lines.forEach((l, idx) => {
    if (/^export (async )?function /i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
}

// 3. Buscar referencias a "reseñas" o "reviews"
const fsSearch = (dir) => {
  let res = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (['node_modules', '.next', '.git'].includes(f)) continue;
      const full = `${dir}/${f}`;
      if (fs.statSync(full).isDirectory()) res = res.concat(fsSearch(full));
      else if (/reseña|review/i.test(f)) res.push(full);
    }
  } catch(e){}
  return res;
};
console.log('\n--- Archivos con "reseña" o "review" ---');
fsSearch('src').forEach(f => console.log('  -', f));

console.log('\n=== FIN ===');
