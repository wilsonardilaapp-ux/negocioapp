const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] No existe ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

let updated = original;

// 2. Corrección de import de useMemo
const oldImport = "import React, { useState, useEffect } from 'react';";
const newImport = "import React, { useState, useEffect, useMemo } from 'react';";

if (updated.includes(oldImport)) {
  updated = updated.replace(oldImport, newImport);
} else {
  // Regex por si hay variaciones de espacios
  updated = updated.replace(/import\s+React,\s*\{\s*useState,\s*useEffect\s*\}\s*from\s*['"]react['"];/, newImport);
}

// 3. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 4. Verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN DE LÍNEAS DE CABECERA ---');
const lines = check.split('\n');
console.log(lines.slice(0, 8).map((l, i) => `${i + 1}: ${l}`).join('\n'));
console.log('\n¿Importa useMemo desde react?:', check.includes('useState, useEffect, useMemo'));
