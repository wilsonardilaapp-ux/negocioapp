const fs = require('fs');

const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let content = fs.readFileSync(servicePath, 'utf8');

// Reemplazar la línea con la regex vacía por una limpia
content = content.replace(
  "let limpia = (plantillaRaw || '').replace(/\\uFFFD/g, '').replace(//g, '');",
  "let limpia = (plantillaRaw || '').replace(/\\uFFFD/g, '');"
);

// Fallback por si acaso
content = content.replace(".replace(//g, '')", "");

fs.writeFileSync(servicePath, content, 'utf8');
console.log('[OK] solicitudes-service.ts corregido: expresión regular vacía eliminada.');
