const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'actions', 'loyalty.ts');

// Respaldo de seguridad previo
fs.copyFileSync(filePath, `${filePath}.bak`);
console.log(`[BACKUP] Creado ${filePath}.bak`);

let content = fs.readFileSync(filePath, 'utf8');

// 1. Remover cualquier ocurrencia desfasada de 'use server' y del import
content = content.replace(/import\s*\{\s*getJevCopilotLimitsInfo[^}]*\}\s*from\s*['"]@\/jev\/jevLimitsService['"];?\n?/g, '');
content = content.replace(/^['"]use server['"];?\s*\n?/m, '');

// 2. Colocar 'use server' en la línea 1 absoluta seguido del import
const newHeader = `'use server';\n\nimport { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from '@/jev/jevLimitsService';\n`;
content = newHeader + content.trimStart();

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Corregido: "use server" posicionado en la línea 1 de loyalty.ts.');
