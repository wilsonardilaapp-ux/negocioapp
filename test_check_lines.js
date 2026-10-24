const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = content.split('\n');

const openBraces = (content.match(/{/g) || []).length;
const closeBraces = (content.match(/}/g) || []).length;
console.log(`Líneas totales: ${lines.length}`);
console.log(`Balance de llaves: ${openBraces}/${closeBraces}`);

// Ver líneas alrededor de activePlans.map
const mapIdx = lines.findIndex(l => l.includes('{activePlans.map(plan => {'));
if (mapIdx !== -1) {
  console.log('\n--- LÍNEAS ALREDEDOR DE MAP ---');
  for (let i = mapIdx; i < Math.min(lines.length, mapIdx + 30); i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
