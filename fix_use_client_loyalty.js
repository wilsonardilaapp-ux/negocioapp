const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'app', '(dashboard)', 'dashboard', 'loyalty', 'page.tsx');

// Respaldo de seguridad previo
fs.copyFileSync(filePath, `${filePath}.bak`);
console.log(`[BACKUP] Creado ${filePath}.bak`);

let content = fs.readFileSync(filePath, 'utf8');

// 1. Remover cualquier ocurrencia duplicada o desfasada del import y de 'use client'
content = content.replace(/import\s*\{\s*JevCopilotWidgetLoyalty\s*\}\s*from\s*['"]@\/jev\/JevCopilotWidgetLoyalty['"];?\n?/g, '');
content = content.replace(/^['"]use client['"];?\s*\n?/m, '');

// 2. Colocar 'use client' en la línea 1 absoluta seguido del import
const newHeader = `'use client';\n\nimport { JevCopilotWidgetLoyalty } from '@/jev/JevCopilotWidgetLoyalty';\n`;
content = newHeader + content.trimStart();

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Corregido: "use client" posicionado en la línea 1.');
