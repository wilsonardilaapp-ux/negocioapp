const fs = require('fs');
const path = require('path');

console.log("🚀 Aplicando corrección definitiva del ID canónico ('jev-copiloto')...");

// 1. Actualizar src/models/module.ts
const modulePath = path.join(process.cwd(), 'src/models/module.ts');
let modContent = fs.readFileSync(modulePath, 'utf8');
modContent = modContent.replace("'jev_copiloto'", "'jev-copiloto'").replace('"jev_copiloto"', '"jev-copiloto"');
fs.writeFileSync(modulePath, modContent, 'utf8');
console.log("✅ module.ts actualizado a 'jev-copiloto'.");

// 2. Actualizar src/jev/jevLimitsService.ts
const servicePath = path.join(process.cwd(), 'src/jev/jevLimitsService.ts');
if (fs.existsSync(servicePath)) {
  let serviceContent = fs.readFileSync(servicePath, 'utf8');
  serviceContent = serviceContent.replace(
    "dbRef.collection('modules').doc('jev_copiloto')", 
    "dbRef.collection('modules').doc('jev-copiloto')"
  ).replace(
    "modules/jev_copiloto", 
    "modules/jev-copiloto"
  ).replace(
    "'jev_copiloto'", 
    "'jev-copiloto'"
  );
  fs.writeFileSync(servicePath, serviceContent, 'utf8');
  console.log("✅ jevLimitsService.ts actualizado a 'jev-copiloto'.");
}

// 3. Limpiar logs de depuración en negocios/page.tsx
const negociosPath = path.join(process.cwd(), 'src/app/(admin)/superadmin/negocios/page.tsx');
let negociosContent = fs.readFileSync(negociosPath, 'utf8');
negociosContent = negociosContent.replace(/console\.log\("🔍 \[JEV DEBUG OPEN\][\s\S]*?\);\n/g, '');
negociosContent = negociosContent.replace(/console\.log\("💾 \[JEV DEBUG SAVE\][\s\S]*?\);\n/g, '');
fs.writeFileSync(negociosPath, negociosContent, 'utf8');
console.log("✅ Logs temporales limpiados en negocios/page.tsx.");

console.log("🎉 ¡Corrección canónica aplicada al 100%!");
