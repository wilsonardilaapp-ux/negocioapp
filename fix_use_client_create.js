const fs = require('fs');
const path = require('path');

const pagePath = path.join('src', 'app', '(admin)', 'superadmin', 'blog', 'create', 'page.tsx');
fs.copyFileSync(pagePath, `${pagePath}.bak`);
console.log(`[BACKUP] Creado ${pagePath}.bak`);

let content = fs.readFileSync(pagePath, 'utf8');

// 1. Remover cualquier ocurrencia de 'use client'
content = content.replace(/^['"]use client['"];?\s*\n?/m, '');
content = content.replace(/['"]use client['"];?\s*\n?/g, '');

// 2. Colocar 'use client' en la línea 1 absoluta
content = `'use client';\n\n` + content.trimStart();

fs.writeFileSync(pagePath, content, 'utf8');
console.log('✅ Corregido: "use client" posicionado en la línea 1 de superadmin/blog/create/page.tsx.');
