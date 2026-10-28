const fs = require('fs');

function showContext(filePath, patterns) {
  if (!fs.existsSync(filePath)) return console.log(`No existe: ${filePath}`);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  console.log(`\n====================================================`);
  console.log(`ARCHIVO: ${filePath}`);
  console.log(`====================================================`);
  lines.forEach((line, idx) => {
    for (const pat of patterns) {
      if (pat.test(line)) {
        const start = Math.max(0, idx - 3);
        const end = Math.min(lines.length, idx + 4);
        console.log(`--- Coincidencia en línea ${idx + 1} (${pat}) ---`);
        for (let j = start; j < end; j++) {
          console.log(`${j + 1 === idx + 1 ? '>>' : '  '} L${j + 1}: ${lines[j]}`);
        }
        break;
      }
    }
  });
}

showContext('src/app/(dashboard)/dashboard/cupones/page.tsx', [
  /import.*LimitBanner/i,
  /useSubscription/i,
  /<Button.*Crear|Nuevo/i,
  /couponsCount/i,
  /isModuleAuthorized/i
]);

showContext('src/app/(dashboard)/dashboard/suggestions/page.tsx', [
  /import.*LimitBanner/i,
  /useSubscription/i,
  /<Button.*Crear|Nueva|Agregar/i,
  /suggestionsCount/i,
  /isModuleAuthorized/i
]);

