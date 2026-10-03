const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
const backupPath = filePath + '.bak';

console.log("🚀 Aplicando corrección quirúrgica en negocios/page.tsx...");

if (!fs.existsSync(filePath)) {
  console.error(`❌ Error: No se encontró ${filePath}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
fs.copyFileSync(filePath, backupPath);
console.log(`📦 Respaldo creado: ${backupPath}`);

let content = fs.readFileSync(filePath, 'utf8');

// 2. Reemplazar la lógica de lectura en openManageBusiness para asegurar estado activo correcto
const oldSnippet = `        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            initialState[cleanId] = { active: data.status === 'active', isAddon: data.isAddon === true, isPlanDefault: planModules.includes(cleanId) };
            if (data.extra !== undefined) extras[cleanId] = data.extra;
        });`;

const newSnippet = `        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            // Asegurar lectura robusta del estado activo (soporta boolean y string)
            const isActive = data.status === 'active' || data.status === true || data.active === true;
            initialState[cleanId] = { active: isActive, isAddon: data.isAddon === true, isPlanDefault: planModules.includes(cleanId) };
            if (data.extra !== undefined || data.extraLimit !== undefined) extras[cleanId] = data.extra ?? data.extraLimit;
        });`;

if (content.includes(oldSnippet)) {
  content = content.replace(oldSnippet, newSnippet);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✅ Corrección aplicada con éxito en openManageBusiness.");
} else {
  console.log("⚠️ No se encontró el bloque exacto, intentando patch alternativo...");
  // Patch alternativo más amplio si la estructura tuviera ligeras variaciones
  const altOld = `initialState[cleanId] = { active: data.status === 'active'`;
  if (content.includes(altOld)) {
    content = content.replace(
      /initialState\[cleanId\]\s*=\s*\{\s*active:\s*data\.status\s*===\s*'active'/g,
      "initialState[cleanId] = { active: data.status === 'active' || data.status === true || data.active === true"
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("✅ Patch alternativo aplicado con éxito.");
  } else {
    console.error("❌ No se pudo aplicar el parche automáticamente. Por favor revísalo manualmente.");
    process.exit(1);
  }
}

console.log("🎉 Corrección de toggle finalizada. Ya puedes recargar tu aplicación.");
