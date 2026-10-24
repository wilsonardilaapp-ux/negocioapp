const fs = require('fs');

console.log('==============================================');
console.log('DIAGNÓSTICO: Botón en public-form.tsx');
console.log('==============================================');

// 1. Ver últimas 40 líneas de public-form.tsx
const formContent = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = formContent.split('\n');
console.log('--- ÚLTIMAS LÍNEAS DE public-form.tsx ---');
console.log(lines.slice(lines.length - 40).join('\n'));

// 2. Revisar content de tailwind.config
const twPaths = ['tailwind.config.ts', 'tailwind.config.js', 'tailwind.config.mjs'];
twPaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`\n--- ${p} ---`);
    console.log(fs.readFileSync(p, 'utf8').slice(0, 400));
  }
});

console.log('==============================================');
