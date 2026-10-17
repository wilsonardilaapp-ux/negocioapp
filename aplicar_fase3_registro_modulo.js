const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targetFile = path.join(ROOT, 'src', 'models', 'module.ts');
const backupFile = path.join(ROOT, 'src', 'models', 'module.ts.bak');

console.log('====================================================');
console.log('🚀 APLICANDO FASE 3: REGISTRO DEL MÓDULO SOCIAL-PROOF');
console.log('====================================================\n');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ Error: El archivo ${targetFile} no existe.`);
  process.exit(1);
}

// 1. Crear respaldo .bak
fs.copyFileSync(targetFile, backupFile);
console.log(`📦 Respaldo creado exitosamente: src/models/module.ts.bak`);

// 2. Leer contenido actual
let content = fs.readFileSync(targetFile, 'utf8');

// 3. Verificar si el módulo ya fue registrado
if (content.includes("'social-proof'") || content.includes('"social-proof"')) {
  console.log('⚠️ El módulo "social-proof" ya se encuentra registrado en src/models/module.ts.');
} else {
  // Insertar de forma aditiva dentro del arreglo DEFAULT_MODULES
  const newModuleEntry = `  { id: 'social-proof', name: 'Prueba Social', description: 'Muestra indicadores en tiempo real de productos populares y concurrencia de compradores en el catálogo público.', limit: -1 },\n`;
  
  const marker = 'export const DEFAULT_MODULES = [';
  if (content.includes(marker)) {
    content = content.replace(marker, `${marker}\n${newModuleEntry}`);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Módulo "social-proof" añadido exitosamente a DEFAULT_MODULES en src/models/module.ts.');
  } else {
    console.error('❌ No se encontró la constante DEFAULT_MODULES para insertar el módulo.');
  }
}

// 4. Mostrar verificación final del bloque
const updatedContent = fs.readFileSync(targetFile, 'utf8');
const match = updatedContent.match(/export const DEFAULT_MODULES = \[[\s\S]*?\];/);
if (match) {
  console.log('\n🔍 Verificación de DEFAULT_MODULES:');
  console.log(match[0]);
}

