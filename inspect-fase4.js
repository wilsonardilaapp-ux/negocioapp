const fs = require('fs');

console.log("=== 1. CREACIÓN DE NEGOCIO EN superadmin/negocios/page.tsx ===");
try {
  const content = fs.readFileSync('src/app/(admin)/superadmin/negocios/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('handleAddBusiness') || l.includes('handleCreateBusiness') || l.includes('Agregar Negocio') || l.includes('createBusiness')) {
      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 25); j++) {
        console.log(`L${j+1}: ${lines[j]}`);
      }
    }
  });
} catch(e) { console.log(e.message); }

console.log("\n=== 2. SEEDERS O INICIALIZADORES POR DEFECTO ===");
try {
  const files = ['src/lib/seeder.ts', 'src/lib/initialData.ts', 'src/services/businessService.ts'];
  files.forEach(f => {
    if (fs.existsSync(f)) {
      console.log(`Encontrado: ${f}`);
    }
  });
} catch(e) {}
