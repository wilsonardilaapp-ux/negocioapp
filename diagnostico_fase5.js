const fs = require('fs');

console.log('=== [PASO 1.5] MEMORIA JEV ===\n');
if (fs.existsSync('src/jev/jevMemory.ts')) {
  console.log('--- Funciones de jevMemory.ts ---');
  const lines = fs.readFileSync('src/jev/jevMemory.ts', 'utf8').split('\n');
  lines.forEach((l, idx) => {
    if (/^export (async )?function |interface /i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
}

// Buscar en src/jev dónde se renderiza "Memoria"
const jevFiles = fs.readdirSync('src/jev');
for (const f of jevFiles) {
  if (f.endsWith('.tsx')) {
    const content = fs.readFileSync(`src/jev/${f}`, 'utf8');
    if (/Memoria/i.test(content)) {
      console.log(`\nEncontrada palabra 'Memoria' en src/jev/${f}`);
      content.split('\n').forEach((l, idx) => {
        if (/memoria/i.test(l)) console.log(`  L${idx+1}: ${l.trim()}`);
      });
    }
  }
}

// Ver reseñas en actions/reviews.ts
if (fs.existsSync('src/actions/reviews.ts')) {
  console.log('\n--- Exportaciones de src/actions/reviews.ts ---');
  fs.readFileSync('src/actions/reviews.ts', 'utf8').split('\n').forEach((l, idx) => {
    if (/^export (async )?function /i.test(l)) console.log(`  L${idx+1}: ${l.trim()}`);
  });
}

console.log('\n=== FIN ===');
