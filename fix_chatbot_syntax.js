const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] Archivo no existe: ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

let updated = original;

// 2. Corrección quirúrgica de la coma faltante
const targetSyntax = '  FileText\n  Frown,';
const fixedSyntax = '  FileText,\n  Frown,';

if (updated.includes(targetSyntax)) {
  updated = updated.replace(targetSyntax, fixedSyntax);
} else {
  // Manejo por regex en caso de variación de espacios o saltos de línea Windows (CRLF)
  updated = updated.replace(/FileText\s*\r?\n\s*Frown,/, 'FileText,\n  Frown,');
}

// 3. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 4. Verificación inmediata
const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log('\n--- VERIFICACIÓN DEL BLOQUE IMPORT (L70 a L76) ---');
console.log(lines.slice(69, 76).map((l, i) => `${i + 70}: ${l}`).join('\n'));
