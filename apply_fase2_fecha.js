const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'components', 'blog', 'posts-table.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe el archivo: ${targetFile}`);
  process.exit(1);
}

// 1. Crear respaldo .bak
const backupFile = `${targetFile}.bak`;
fs.copyFileSync(targetFile, backupFile);
console.log(`💾 Respaldo creado: ${backupFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Definir la función formateadora segura
const helperFunction = `function formatPostDate(value: any): string {
  if (!value) return '—';
  try {
    let date: Date | null = null;
    if (typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    if (!date || isNaN(date.getTime())) {
      return '—';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return \`\${day}/\${month}/\${year}\`;
  } catch {
    return '—';
  }
}

`;

// Insertar helper antes del componente PostsTable si no existe
if (!content.includes('function formatPostDate')) {
  content = content.replace(/(export function PostsTable|function PostsTable)/, `${helperFunction}$1`);
}

// 3. Reemplazar la línea de renderizado de fecha
const oldLineRegex = /\{post\.createdAt\s*\?\s*new Date\(post\.createdAt as string\)\.toLocaleDateString\(\)\s*:\s*['"]N\/A['"]\}/g;

if (oldLineRegex.test(content)) {
  content = content.replace(oldLineRegex, `{formatPostDate(post.createdAt)}`);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Archivo src/components/blog/posts-table.tsx actualizado con éxito.');
} else {
  // Reemplazo de respaldo si ya cambió algo
  const fallbackRegex = /\{post\.createdAt\s*\?[^}]+\}/g;
  console.log('Aplicando reemplazo de fecha...');
  content = content.replace(fallbackRegex, `{formatPostDate(post.createdAt)}`);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Archivo actualizado con reemplazo de fallback.');
}
