const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
console.log("🚀 Limpiando y aplicando guardado unificado con ID canónico...");

let content = fs.readFileSync(filePath, 'utf8');

// Vamos a reemplazar todo el bucle de guardado (desde 'for (const [modId' hasta el cierre '}')
// Buscamos la función handleSaveManageBusiness y reescribimos su sección de módulos de forma limpia.

const oldLoopSearch = 'for (const [modId, state] of Object.entries(businessModulesState)) {';
const startIndex = content.indexOf(oldLoopSearch);

if (startIndex === -1) {
  console.error("❌ No se encontró el bucle de guardado.");
  process.exit(1);
}

// Encontrar el final del bucle de guardado (el cierre de batch.commit o similar)
const endIndex = content.indexOf('await batch.commit();', startIndex);
if (endIndex === -1) {
  console.error("❌ No se encontró await batch.commit().");
  process.exit(1);
}

// Construir el bloque limpio y perfecto de guardado
const cleanSaveBlock = `for (const [modId, state] of Object.entries(businessModulesState)) {
            const canonicalId = getCanonicalModuleId(modId);
            const modRef = doc(firestore, 'businesses', selectedBusiness.id, 'modules', canonicalId);
            batch.set(modRef, { 
                id: canonicalId, 
                status: state.active ? 'active' : 'inactive', 
                isAddon: state.isAddon, 
                extra: moduleExtras[canonicalId] || moduleExtras[modId] || 0, 
                updatedAt: new Date().toISOString() 
            }, { merge: true });
        }

        `;

// Reemplazar desde el inicio del bucle hasta justo antes de batch.commit()
const updatedContent = content.slice(0, startIndex) + cleanSaveBlock + content.slice(endIndex);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log("✅ Bucle de guardado actualizado y limpiado con éxito.");
