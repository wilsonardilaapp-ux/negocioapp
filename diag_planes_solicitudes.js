const fs = require('fs');

console.log('==============================================');
console.log('DIAGNÓSTICO: Planes y Pagos en Solicitudes');
console.log('==============================================');

// 1. Buscar referencias a 'plan' en src/modules/solicitudes-negocio
function searchInDir(dir) {
  let matches = [];
  try {
    fs.readdirSync(dir).forEach(file => {
      const full = `${dir}/${file}`;
      if (fs.statSync(full).isDirectory()) {
        matches.push(...searchInDir(full));
      } else if (/\.(ts|tsx)$/.test(file)) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.toLowerCase().includes('plan')) {
          matches.push(full);
        }
      }
    });
  } catch (e) {}
  return matches;
}

console.log('\n--- [1] ARCHIVOS CON REFERENCIA A PLANES EN EL MÓDULO ---');
console.log(searchInDir('src/modules/solicitudes-negocio'));

// 2. Revisar si hay planes en types.ts
if (fs.existsSync('src/modules/solicitudes-negocio/types.ts')) {
  const content = fs.readFileSync('src/modules/solicitudes-negocio/types.ts', 'utf8');
  console.log('\n--- [2] ¿HAY PLANES EN types.ts? ---');
  const lines = content.split('\n').filter(l => l.toLowerCase().includes('plan'));
  console.log(lines.length > 0 ? lines.join('\n') : 'No hay referencias directas a plan en types.ts');
}

// 3. Revisar public-form.tsx
if (fs.existsSync('src/modules/solicitudes-negocio/components/public-form.tsx')) {
  const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
  console.log('\n--- [3] ¿HAY PLANES EN public-form.tsx? ---');
  const lines = content.split('\n').filter(l => l.toLowerCase().includes('plan'));
  console.log(lines.length > 0 ? lines.join('\n') : 'No hay selector de plan en public-form.tsx actualmente');
}

console.log('\n==============================================');
