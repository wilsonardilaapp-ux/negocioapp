const { execSync } = require('child_process');

console.log('=== INSPECCIÓN DE PROCESO NEXT.JS ===\n');

try {
  const lsof = execSync('lsof -i :6000 -P -n || ss -lptn "sport = :6000"').toString();
  console.log('Proceso escuchando en puerto 6000:');
  console.log(lsof);
} catch (e) {
  console.log('No se pudo ejecutar lsof/ss directamente:', e.message);
}

// Ver script dev en package.json
try {
  const pkg = JSON.parse(require('fs').readFileSync('package.json', 'utf8'));
  console.log('\nScripts en package.json:', pkg.scripts);
} catch (e) {}

