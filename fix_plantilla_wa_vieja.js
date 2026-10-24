const fs = require('fs');

const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let content = fs.readFileSync(servicePath, 'utf8');

const target = "let limpia = (plantillaRaw || '').replace(/\\uFFFD/g, '');";
const newCode = `let limpia = (plantillaRaw || '').replace(/\\uFFFD/g, '');

  // Parche inteligente: Si la plantilla en BD es antigua y no tiene el nombre completo, inyectarlo
  if (!limpia.includes('{nombre_completo}')) {
    limpia = limpia.replace('{nombre}', '{nombre}\\n{e_persona} *Nombre completo:* {nombre_completo}');
  }`;

if (content.includes(target)) {
  content = content.replace(target, newCode);
  fs.writeFileSync(servicePath, content, 'utf8');
  console.log('==============================================');
  console.log('[OK] PARCHE INTELIGENTE APLICADO A LA PLANTILLA');
  console.log('==============================================');
} else {
  // Reemplazo flexible por si hay diferencias de espacios
  const regex = /let limpia = \(plantillaRaw \|\| ''\)\.replace\(\/\\uFFFD\/g, ''\);/g;
  content = content.replace(regex, newCode);
  fs.writeFileSync(servicePath, content, 'utf8');
  console.log('[OK - Fallback] Parche inteligente aplicado.');
}
