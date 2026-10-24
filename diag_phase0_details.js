const fs = require('fs');
const path = require('path');

function searchInSrc(dir, terms) {
  let results = [];
  function walk(d) {
    try {
      const items = fs.readdirSync(d);
      for (const item of items) {
        const full = path.join(d, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
          const content = fs.readFileSync(full, 'utf8');
          for (const term of terms) {
            if (content.toLowerCase().includes(term.toLowerCase())) {
              results.push({ file: full, term });
            }
          }
        }
      }
    } catch (e) {}
  }
  walk(dir);
  return results;
}

console.log('====================================');
console.log('INSPECCIÓN DETALLADA DE SRC');
console.log('====================================');

// 1. Módulos existentes
console.log('\n--- [1] CONTENIDO DE src/modules ---');
if (fs.existsSync('src/modules')) {
  console.log(fs.readdirSync('src/modules'));
} else {
  console.log('src/modules no existe o está vacío');
}

// 2. Rutas en src/app
console.log('\n--- [2] RUTAS EN src/app (carpetas principales) ---');
if (fs.existsSync('src/app')) {
  console.log(fs.readdirSync('src/app'));
}

// 3. WHAPI / WhatsApp en src
console.log('\n--- [3] COINCIDENCIAS WHAPI / WHATSAPP EN src/ ---');
const whapiMatches = searchInSrc('src', ['whapi', 'sendwhatsapp', 'whatsappservice', 'asistente']);
const uniqueWhapiFiles = [...new Set(whapiMatches.map(m => m.file))];
console.log(uniqueWhapiFiles);

// 4. Notificaciones Superadmin en src
console.log('\n--- [4] NOTIFICACIONES SUPERADMIN EN src/ ---');
const notifMatches = searchInSrc('src', ['createnotification', 'superadmin_notification', 'adminnotifications', 'notificationservice']);
const uniqueNotifFiles = [...new Set(notifMatches.map(m => m.file))];
console.log(uniqueNotifFiles);

// 5. Cloudinary / Subida de Archivos en src
console.log('\n--- [5] SUBIDA DE ARCHIVOS / STORAGE EN src/ ---');
const uploadMatches = searchInSrc('src', ['cloudinary.v2', 'uploadimage', 'uploadfile', 'firebasestorage', 'uploadbytes']);
const uniqueUploadFiles = [...new Set(uploadMatches.map(m => m.file))];
console.log(uniqueUploadFiles);

// 6. Sidebar / Navegación Superadmin
console.log('\n--- [6] ARCHIVOS DE SIDEBAR / MENÚ SUPERADMIN ---');
function findFiles(dir, match) {
  let res = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) res.push(...findFiles(full, match));
      else if (match.test(item)) res.push(full);
    }
  } catch (e) {}
  return res;
}
console.log(findFiles('src', /(sidebar|nav|menu|superadmin).*\.(tsx|jsx)$/i));

console.log('====================================');
