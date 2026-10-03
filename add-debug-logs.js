const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Inyectar log en openManageBusiness
const targetOpen = 'modulesSnapshot.docs.forEach(doc => {';
const debugOpen = `console.log("🔍 [JEV DEBUG OPEN] Docs leídos en modulesSnapshot:", modulesSnapshot.docs.map(d => ({ id: d.id, data: d.data() })));
        modulesSnapshot.docs.forEach(doc => {`;

// Inyectar log en handleSaveManageBusiness
const targetSave = 'await batch.commit();';
const debugSave = `console.log("💾 [JEV DEBUG SAVE] Guardando módulos para businessId:", selectedBusiness.id, Object.entries(businessModulesState));
        await batch.commit();`;

if (content.includes(targetOpen) && content.includes(targetSave)) {
  content = content.replace(targetOpen, debugOpen);
  content = content.replace(targetSave, debugSave);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✅ Logs de diagnóstico inyectados con éxito.");
} else {
  console.error("❌ No se encontraron los puntos de inyección.");
  process.exit(1);
}
