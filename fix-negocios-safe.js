const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
console.log("🚀 Aplicando corrección limpia y segura en negocios/page.tsx...");

let content = fs.readFileSync(filePath, 'utf8');

// Bloque exacto actual que queremos reemplazar
const targetBlock = `        for (const [modId, state] of Object.entries(businessModulesState)) {
            const modRef = doc(firestore, \`businesses/\${selectedBusiness.id}/modules\`, modId);
            batch.set(modRef, { id: modId, status: state.active ? 'active' : 'inactive', isAddon: state.isAddon, extra: moduleExtras[modId] || 0, updatedAt: new Date().toISOString() }, { merge: true });
        }`;

// Bloque corregido con el ID canónico
const replacementBlock = `        for (const [modId, state] of Object.entries(businessModulesState)) {
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

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replacementBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✅ Corrección aplicada con éxito y sin errores de sintaxis.");
} else {
  console.error("❌ No se encontró el bloque exacto en el archivo. Abortando para no romper nada.");
  process.exit(1);
}
