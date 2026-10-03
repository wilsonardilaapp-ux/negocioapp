const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/models/module.ts');
const backupPath = filePath + '.bak';

console.log("🚀 Iniciando FASE 2: Registro de módulo jev_copiloto...");

if (!fs.existsSync(filePath)) {
  console.error(`❌ Error: No se encontró el archivo ${filePath}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
fs.copyFileSync(filePath, backupPath);
console.log(`📦 Respaldo creado: ${backupPath}`);

// 2. Leer contenido
let content = fs.readFileSync(filePath, 'utf8');

// 3. Verificar si ya fue agregado previamente
if (content.includes("'jev_copiloto'") || content.includes('"jev_copiloto"')) {
  console.log("ℹ️ El módulo 'jev_copiloto' ya está registrado en DEFAULT_MODULES. No se requieren cambios.");
  process.exit(0);
}

// 4. Inserción aditiva quirúrgica dentro de DEFAULT_MODULES
const jevEntry = `  { id: 'jev_copiloto', name: 'JEV Copiloto (IA)', description: 'Asistente de inteligencia artificial y recomendaciones operativas para el negocio.', limit: 10 },\n`;

const targetAnchor = 'export const DEFAULT_MODULES = [';
const targetIndex = content.indexOf(targetAnchor);

if (targetIndex === -1) {
  console.error("❌ No se encontró la constante DEFAULT_MODULES en module.ts");
  process.exit(1);
}

const insertionPoint = targetIndex + targetAnchor.length + 1; // justo después del salto de línea
const modifiedContent = content.slice(0, insertionPoint) + jevEntry + content.slice(insertionPoint);

fs.writeFileSync(filePath, modifiedContent, 'utf8');
console.log("✅ Módulo 'jev_copiloto' registrado con éxito en DEFAULT_MODULES.");

// 5. Validación rápida
const verify = fs.readFileSync(filePath, 'utf8');
if (verify.includes("'jev_copiloto'")) {
  console.log("🎉 Verificación exitosa: 'jev_copiloto' presente en src/models/module.ts");
} else {
  console.error("❌ Falló la verificación. Restaurando desde .bak...");
  fs.copyFileSync(backupPath, filePath);
}
