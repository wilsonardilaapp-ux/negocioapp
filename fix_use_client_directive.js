const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'hooks', 'useSubscription.ts');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remover directiva 'use client' si existe en cualquier parte
  content = content.replace(/['"]use client['"];?\s*/g, '');

  // Remover import duplicado de extractBlogLimitValue si existiera
  content = content.replace(/import\s*\{\s*extractBlogLimitValue\s*\}\s*from\s*['"]@\/lib\/blog-limits['"];?\s*/g, '');

  // Colocar 'use client'; exactamente en la línea 1, seguido del import
  const fixedContent = `'use client';\n\nimport { extractBlogLimitValue } from '@/lib/blog-limits';\n` + content.trimStart();

  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log('✅ Corregido: "use client" posicionado en la primera línea de src/hooks/useSubscription.ts');
} else {
  console.error('❌ No se encontró el archivo src/hooks/useSubscription.ts');
}
