const fs = require('fs');

const navPath = 'src/components/layout/super-admin-nav.tsx';
const bakPath = 'src/components/layout/super-admin-nav.tsx.bak';

if (!fs.existsSync(navPath)) {
  console.error('[ERROR] No se encontró el archivo:', navPath);
  process.exit(1);
}

// 1. Crear respaldo de seguridad .bak
fs.copyFileSync(navPath, bakPath);
console.log(`[BACKUP OK] Respaldo creado en: ${bakPath}`);

let content = fs.readFileSync(navPath, 'utf8');

// 2. Agregar SlidersHorizontal a los imports si no está
if (!content.includes('SlidersHorizontal')) {
  content = content.replace(
    'ClipboardList,',
    'ClipboardList,\n  SlidersHorizontal,'
  );
  console.log('[IMPORT OK] SlidersHorizontal agregado a los imports.');
}

// 3. Agregar el nuevo ítem justo debajo de Solicitudes
const target = '{ href: "/superadmin/solicitudes-negocio", icon: ClipboardList, label: "Solicitudes" },';
const nuevoItem = '\n  { href: "/superadmin/solicitudes-negocio/configurar", icon: SlidersHorizontal, label: "Config. Solicitudes" },';

if (!content.includes('/superadmin/solicitudes-negocio/configurar')) {
  if (content.includes(target)) {
    content = content.replace(target, target + nuevoItem);
    fs.writeFileSync(navPath, content, 'utf8');
    console.log('[APLICADO OK] Ítem "Config. Solicitudes" agregado exitosamente.');
  } else {
    console.error('[ERROR] No se encontró la línea objetivo de Solicitudes.');
    process.exit(1);
  }
} else {
  console.log('[INFO] El ítem ya estaba registrado en el menú.');
}

console.log('==============================================');
console.log('CAMBIO COMPLETADO CON ÉXITO');
console.log('==============================================');
