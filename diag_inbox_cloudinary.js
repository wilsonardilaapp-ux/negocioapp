const fs = require('fs');

if (fs.existsSync('src/app/(admin)/superadmin/notifications/components/InboxTab.tsx')) {
  console.log('--- INBOX TAB EXTRACT ---');
  console.log(fs.readFileSync('src/app/(admin)/superadmin/notifications/components/InboxTab.tsx', 'utf8').slice(0, 600));
}

// Buscar uso de cloudinary en todo src
function searchCloudinary(dir) {
  try {
    fs.readdirSync(dir).forEach(f => {
      const p = `${dir}/${f}`;
      if (fs.statSync(p).isDirectory()) searchCloudinary(p);
      else if (/\.(ts|tsx|js)$/.test(f)) {
        const c = fs.readFileSync(p, 'utf8');
        if (c.includes('cloudinary')) console.log('Uso de cloudinary en:', p);
      }
    });
  } catch(e) {}
}
console.log('--- BUSCANDO USO DE CLOUDINARY ---');
searchCloudinary('src');
