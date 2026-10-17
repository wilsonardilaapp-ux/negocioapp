const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targetFile = path.join(ROOT, 'src/app/(auth)/login/page.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe ${targetFile}`);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Asegurar que useEffect esté importado de 'react'
if (content.includes("import { useState } from 'react';")) {
  content = content.replace(
    "import { useState } from 'react';",
    "import { useState, useEffect } from 'react';"
  );
  console.log("✅ import { useState, useEffect } from 'react' agregado.");
} else if (content.includes('import { useState') && !content.includes('useEffect')) {
  content = content.replace(
    'import { useState',
    'import { useState, useEffect'
  );
  console.log("✅ useEffect añadido al import existente de 'react'.");
} else if (!content.includes('useEffect')) {
  // Si no había import de react explícito
  content = content.replace(
    "'use client';",
    "'use client';\n\nimport { useEffect } from 'react';"
  );
  console.log("✅ import { useEffect } from 'react' inyectado en la cabecera.");
}

fs.writeFileSync(targetFile, content, 'utf8');

// Verificación de las primeras 15 líneas
const lines = fs.readFileSync(targetFile, 'utf8').split('\n');
console.log('\n🔍 Verificación de cabecera de login/page.tsx:');
console.log(lines.slice(0, 15).join('\n'));
