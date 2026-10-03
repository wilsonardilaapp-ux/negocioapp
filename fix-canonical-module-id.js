const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
const backupPath = filePath + '.bak';

console.log("🚀 Aplicando corrección canónica de IDs de módulos en negocios/page.tsx...");

if (!fs.existsSync(filePath)) {
  console.error(`❌ Error: No se encontró ${filePath}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
fs.copyFileSync(filePath, backupPath);
console.log(`📦 Respaldo creado: ${backupPath}`);

let content = fs.readFileSync(filePath, 'utf8');

// Reemplazo seguro usando regex exacto del bucle de guardado
const regexSave = /for\s*\(\s*const\s*\[\s*modId,\s*state\s*\]\s*of\s*Object\.entries\(businessModulesState\)\s*\)\s*\{[\s\S]*?\}/g;

const newSaveCode = `for (const [modId, state] of Object.entries(businessModulesState)) {
            const canonicalId = getCanonicalModuleId(modId);
            const modRef = doc(firestore, 'businesses', selectedBusiness.id, 'modules', canonicalId);
            batch.set(modRef, { 
                id: canonicalId, 
                status: state.active ? 'active' : 'inactive', 
                isAddon: state.isAddon, 
                extra: moduleExtras[canonicalId] || moduleExtras[modId] || 0, 
                updatedAt: new Date().toISOString() 
            }, { merge: true });
        }`;

if (regexSave.test(content)) {
  content = content.replace(regexSave, newSaveCode);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✅ Guardado corregido con ID canónico unificado.");
} else {
  console.error("❌ No se encontró el bucle de guardado para reemplazar.");
  process.exit(1);
}

console.log("🎉 Corrección de ID canónico finalizada con éxito.");
