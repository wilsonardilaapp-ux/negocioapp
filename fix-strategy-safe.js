const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
console.log("🚀 Aplicando estrategia de módulos limpia y sin errores...");

let content = fs.readFileSync(filePath, 'utf8');

// Bloque exacto actual en openManageBusiness que lee los módulos de Firestore
const targetOld = `        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            initialState[cleanId] = { active: data.status === 'active', isAddon: data.isAddon === true, isPlanDefault: planModules.includes(cleanId) };
            if (data.extra !== undefined) extras[cleanId] = data.extra;
        });`;

const targetOldWithBoolean = `        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            // Asegurar lectura robusta del estado activo (soporta boolean y string)
            const isActive = data.status === 'active' || data.status === true || data.active === true;
            initialState[cleanId] = { active: isActive, isAddon: data.isAddon === true, isPlanDefault: planModules.includes(cleanId) };
            if (data.extra !== undefined || data.extraLimit !== undefined) extras[cleanId] = data.extra ?? data.extraLimit;
        });`;

const replacementNew = `        // 1. Inicializar con los defaults del plan
        DEFAULT_MODULES.forEach(dm => {
            const canonicalId = getCanonicalModuleId(dm.id);
            const isPlanDefault = planModules.includes(canonicalId);
            initialState[canonicalId] = { active: isPlanDefault, isAddon: !isPlanDefault, isPlanDefault };
        });

        // 2. Sobrescribir con el estado real exacto guardado en Firestore
        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            const isActive = data.status === 'active' || data.status === true || data.active === true;
            initialState[cleanId] = { 
                active: isActive, 
                isAddon: data.isAddon !== undefined ? data.isAddon : !planModules.includes(cleanId), 
                isPlanDefault: planModules.includes(cleanId) 
            };
            if (data.extra !== undefined || data.extraLimit !== undefined) {
                extras[cleanId] = data.extra ?? data.extraLimit;
            }
        });`;

if (content.includes(targetOldWithBoolean)) {
  content = content.replace(targetOldWithBoolean, replacementNew);
} else if (content.includes(targetOld)) {
  content = content.replace(targetOld, replacementNew);
} else {
  console.error("❌ No se encontró el bloque exacto en negocios/page.tsx");
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("✅ Corrección aplicada con éxito y sin errores de sintaxis.");
