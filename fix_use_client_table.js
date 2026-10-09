const fs = require('fs');
const path = require('path');

const tablePath = path.join('src', 'components', 'blog', 'posts-table.tsx');
fs.copyFileSync(tablePath, `${tablePath}.bak`);
console.log(`[BACKUP] Creado ${tablePath}.bak`);

let content = fs.readFileSync(tablePath, 'utf8');

// 1. Remover cualquier ocurrencia de 'use client'
content = content.replace(/^['"]use client['"];?\s*\n?/m, '');
content = content.replace(/['"]use client['"];?\s*\n?/g, '');

// 2. Colocar 'use client' en la línea 1 absoluta
content = `'use client';\n\n` + content.trimStart();

fs.writeFileSync(tablePath, content, 'utf8');
console.log('✅ Corregido: "use client" colocado en la línea 1 de posts-table.tsx.');
