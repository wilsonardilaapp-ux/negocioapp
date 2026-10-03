const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
const backupPath = filePath + '.bak';

console.log("🚀 Aplicando nueva estrategia en openManageBusiness...");

// 1. Respaldo de seguridad
fs.copyFileSync(filePath, backupPath);

let content = fs.readFileSync(filePath, 'utf8');

// Buscamos el bloque donde se procesa modulesSnapshot.docs.forEach en openManageBusiness
const oldOpenBlock = `        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            // Asegurar lectura robusta del estado activo (soporta boolean y string)
            const isActive = data.status === 'active' || data.status === true || data.active === true;
            initialState[cleanId] = { active: isActive, isAddon: data.isAddon === true, isPlanDefault: planModules.includes(cleanId) };
            if (data.extra !== undefined || data.extraLimit !== undefined) extras[cleanId] = data.extra ?? data.extraLimit;
        });`;

const newOpenBlock = `        // Mapear primero los módulos por defecto del plan
        DEFAULT_MODULES.forEach(dm => {
            const canonicalId = getCanonicalModuleId(dm.id);
            const isPlanDefault = planModules.includes(canonicalId);
            initialState[canonicalId] = {
                active: isPlanDefault,
                isAddon: !isPlanDefault,
                isPlanDefault: isPlanDefault
            };
        });

        // Sobrescribir con el estado real exacto guardado en Firestore para este negocio
        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            const isActive = data.status === 'active' || data.status === true || data.active === true;
            const isAddon = data.isAddon !== undefined ? data.isAddon : !planModules.includes(cleanId);
            
            initialState[cleanId] = { 
                active: isActive, 
                isAddon: isAddon, 
                isPlanDefault: planModules.includes(cleanId) 
            };
            if (data.extra !== undefined || data.extraLimit !== undefined) {
                extras[cleanId] = data.extra ?? data.extraLimit;
            }
        });`;

if (content.includes('modulesSnapshot.docs.forEach')) {
  // Reemplazar la sección de lectura de modulesSnapshot en openManageBusiness
  content = content.replace(
    /modulesSnapshot\.docs\.forEach\s*\([\s\S]*?\);\s*\}/,
    `// Mapear primero los módulos por defecto del plan
        DEFAULT_MODULES.forEach(dm => {
            const canonicalId = getCanonicalModuleId(dm.id);
            const isPlanDefault = planModules.includes(canonicalId);
            initialState[canonicalId] = {
                active: isPlanDefault,
                isAddon: !isPlanDefault,
                isPlanDefault: isPlanDefault
            };
        });

        // Sobrescribir con el estado real guardado en Firestore
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
        });`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✅ Nueva estrategia aplicada con éxito en openManageBusiness.");
} else {
  console.error("❌ No se encontró modulesSnapshot.docs.forEach en el archivo.");
  process.exit(1);
}

console.log("🎉 Estrategia de carga y persistencia completada.");
