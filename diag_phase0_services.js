const fs = require('fs');
const path = require('path');

console.log('====================================');
console.log('INSPECCIÓN DE SERVICIOS Y NOTIFICACIONES');
console.log('====================================');

// 1. Subdirectorios en superadmin
if (fs.existsSync('src/app/(admin)/superadmin')) {
  console.log('\n--- [1] PÁGINAS EN src/app/(admin)/superadmin ---');
  console.log(fs.readdirSync('src/app/(admin)/superadmin'));
}

// 2. Revisar cómo se usa whatsapp-factory
if (fs.existsSync('src/services/whatsapp-factory.ts')) {
  console.log('\n--- [2] PRIMERAS 40 LÍNEAS DE src/services/whatsapp-factory.ts ---');
  const lines = fs.readFileSync('src/services/whatsapp-factory.ts', 'utf8').split('\n').slice(0, 40).join('\n');
  console.log(lines);
}

// 3. Revisar Cloudinary o servicios de Storage en src/lib o src/services
console.log('\n--- [3] BÚSQUEDA DE STORAGE / CLOUDINARY ---');
function findInFolder(dir) {
  let res = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) res.push(...findInFolder(p));
      else if (/\.(ts|js)$/.test(f)) {
        const c = fs.readFileSync(p, 'utf8');
        if (c.includes('cloudinary') || c.includes('storage') || c.includes('upload')) res.push(p);
      }
    });
  } catch (e) {}
  return res;
}
console.log(findInFolder('src/lib').concat(findInFolder('src/services')));

// 4. Ver super-admin-nav.tsx items
if (fs.existsSync('src/components/layout/super-admin-nav.tsx')) {
  console.log('\n--- [4] EXTRACTO DE ITEMS EN super-admin-nav.tsx ---');
  const nav = fs.readFileSync('src/components/layout/super-admin-nav.tsx', 'utf8');
  const match = nav.match(/const\s+(navItems|links|routes|navigation|menuItems)\s*=\s*\[[\s\S]*?\];/);
  if (match) console.log(match[0]);
  else console.log('Búsqueda genérica de links en super-admin-nav:', nav.slice(0, 500));
}

console.log('====================================');
