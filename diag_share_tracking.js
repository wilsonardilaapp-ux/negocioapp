const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('DIAGNÓSTICO: COMPARTIR Y SEGUIMIENTO');
console.log('==============================================');

// 1. Verificar librerías de gráficos y QR en package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const deps = pkg.dependencies || {};
console.log('--- [1] DEPENDENCIAS CLAVE ---');
console.log('recharts:', deps['recharts'] || 'No instalada');
console.log('qrcode:', deps['qrcode'] || 'No instalada');
console.log('react-qr-code:', deps['react-qr-code'] || 'No instalada');

// 2. Revisar cómo se usa Recharts en superadmin
function findChartExamples(dir) {
  let results = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) results.push(...findChartExamples(p));
      else if (/\.(tsx|jsx)$/.test(f)) {
        const c = fs.readFileSync(p, 'utf8');
        if (c.includes('recharts') || c.includes('BarChart') || c.includes('ResponsiveContainer')) {
          results.push(p);
        }
      }
    });
  } catch(e) {}
  return results;
}
console.log('\n--- [2] PÁGINAS QUE USAN GRÁFICOS (RECHARTS) ---');
console.log(findChartExamples('src/app/(admin)/superadmin'));

// 3. Listar todas las rutas existentes en src/app para palabras reservadas
function getAppRoutes(dir, base = '') {
  let routes = [];
  try {
    fs.readdirSync(dir).forEach(item => {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) {
        if (!item.startsWith('(') && !item.startsWith('@') && item !== 'api') {
          routes.push(base ? `${base}/${item}` : item);
          routes.push(...getAppRoutes(full, base ? `${base}/${item}` : item));
        } else if (item.startsWith('(')) {
          routes.push(...getAppRoutes(full, base));
        }
      }
    });
  } catch (e) {}
  return routes;
}
console.log('\n--- [3] RUTAS DEL PROYECTO DETECTADAS EN src/app ---');
const routes = [...new Set(getAppRoutes('src/app'))].sort();
console.log(routes);

console.log('==============================================');
