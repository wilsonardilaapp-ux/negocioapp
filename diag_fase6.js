const fs = require('fs');

console.log('--- 1. PLANES FIJOS EN SUPERADMIN (COLECCIÓN Y TOGGLES) ---');
try {
  const p = fs.readFileSync('src/app/(admin)/superadmin/plans/page.tsx', 'utf8');
  console.log(p.split('\n').filter(l => l.includes('collection(') || l.includes('plans') || l.includes('isPublic') || l.includes('active')).slice(0, 10).join('\n'));
} catch(e) { console.log(e.message); }

console.log('\n--- 2. PRICING / LANDING (CÓMO LEE LOS PLANES) ---');
try {
  const pr = fs.readFileSync('src/app/(public)/pricing/page.tsx', 'utf8');
  console.log(pr.split('\n').filter(l => l.includes('collection(') || l.includes('plans') || l.includes('hybrid')).slice(0, 10).join('\n'));
} catch(e) { console.log(e.message); }

console.log('\n--- 3. REGISTRO / ONBOARDING DE RESTAURANTE NUEVO ---');
try {
  const findFiles = (dir) => {
    let res = [];
    for (const f of fs.readdirSync(dir)) {
      const full = `${dir}/${f}`;
      if (['node_modules', '.git', '.next'].includes(f)) continue;
      if (fs.statSync(full).isDirectory()) res = res.concat(findFiles(full));
      else if (/(register|onboard|create-business|signup)/i.test(f) && /\.(tsx?)$/.test(f)) res.push(full);
    }
    return res;
  };
  console.log('Archivos de registro/onboarding encontrados:', findFiles('src'));
} catch(e) { console.log(e.message); }
