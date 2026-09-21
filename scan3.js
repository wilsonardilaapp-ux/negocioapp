const fs = require('fs');
const path = require('path');

function findFiles(dir) {
  let res = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (['node_modules', '.git', '.next'].includes(f)) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) res = res.concat(findFiles(full));
      else if (/\.(tsx?)$/.test(f)) res.push(full.replace(/\\/g, '/'));
    }
  } catch(e) {}
  return res;
}

const all = findFiles('src');

console.log('--- PLATOS / PRODUCTOS EN DASHBOARD ---');
all.filter(f => /(producto|dish|plato|catalogo|catalog)/i.test(f)).forEach(f => console.log(f));

console.log('\n--- CARTA PÚBLICA / CHECKOUT ---');
all.filter(f => /(checkout|cart|public|menu|orden|order)/i.test(f) && !f.includes('superadmin') && !f.includes('api/stripe')).forEach(f => console.log(f));

console.log('\n--- MODELO BUSINESS ---');
try {
  console.log(fs.readFileSync('src/models/business.ts', 'utf8').slice(0, 500));
} catch(e) {}
