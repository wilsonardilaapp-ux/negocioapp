const fs = require('fs');

console.log('=== INSPECCIÓN DE RESOLUCIÓN EN CATALOG PAGE ===\n');
const content = fs.readFileSync('src/app/(public)/catalog/[businessId]/page.tsx', 'utf8');
const lines = content.split('\n');

// Buscar cómo se llena resolvedBusinessId
const fetchIdx = lines.findIndex(l => l.includes('fetchData = async'));
if (fetchIdx !== -1) {
  lines.slice(fetchIdx, fetchIdx + 60).forEach((l, i) => console.log(l));
}
