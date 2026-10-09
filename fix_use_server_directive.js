const fs = require('fs');
const path = require('path');

const filePath = path.join('src', 'actions', 'blog.ts');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remover cualquier 'use server'; existente
  content = content.replace(/['"]use server['"];?\s*/g, '');

  // Remover imports duplicados de getBusinessBlogLimitServer si los hubiera
  content = content.replace(/import\s*\{\s*getBusinessBlogLimitServer\s*\}\s*from\s*['"]@\/lib\/blog-limits['"];?\s*/g, '');

  // Colocar 'use server'; en la línea 1 exacta, seguido del import
  const fixedContent = `'use server';\n\nimport { getBusinessBlogLimitServer } from '@/lib/blog-limits';\n` + content.trimStart();

  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log('✅ Corregido: "use server" posicionado en la primera línea de src/actions/blog.ts');
} else {
  console.error('❌ No se encontró el archivo src/actions/blog.ts');
}
