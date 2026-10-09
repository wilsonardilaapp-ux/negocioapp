const fs = require('fs');
const path = require('path');

console.log('🔍 [PASO 0: DIAGNÓSTICO] Inspeccionando configuración del editor Quill...\n');

// 1. Versiones en package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('1. LIBRERÍA Y VERSIONES:');
console.log('  - react-quill:', pkg.dependencies['react-quill'] || pkg.devDependencies['react-quill'] || 'No listado directamente');
console.log('  - quill:', pkg.dependencies['quill'] || pkg.devDependencies['quill'] || 'Dependencia interna');

// 2. Componente RichTextEditor
const editorPath = 'src/components/editor/RichTextEditor.tsx';
console.log(`\n2. CONFIGURACIÓN EN ${editorPath}:`);
if (fs.existsSync(editorPath)) {
  const content = fs.readFileSync(editorPath, 'utf8');
  const lines = content.split('\n');
  
  // Buscar modules, formats, toolbar
  lines.forEach((line, idx) => {
    if (/modules|toolbar|formats|theme|header|size|clean/i.test(line)) {
      console.log(`  L${idx + 1}: ${line}`);
    }
  });
}

// 3. Estilos actuales en /dashboard/blog/create/page.tsx
const createPagePath = 'src/app/(dashboard)/dashboard/blog/create/page.tsx';
console.log(`\n3. ESTILOS ACTUALES EN ${createPagePath}:`);
if (fs.existsSync(createPagePath)) {
  const content = fs.readFileSync(createPagePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/editor-dashboard-blog|ql-|RichTextEditor/i.test(line)) {
      console.log(`  L${idx + 1}: ${line}`);
    }
  });
}

// 4. Cómo se renderiza el HTML en el blog público
console.log('\n4. RENDERIZADO PÚBLICO DEL BLOG:');
function findPublicBlog(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findPublicBlog(full);
    else if (full.includes('[slug]') || (full.includes('blog') && full.includes('page.tsx'))) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('dangerouslySetInnerHTML') || c.includes('content')) {
        console.log(`  📌 Archivo: ${full}`);
        c.split('\n').forEach((l, i) => {
          if (l.includes('dangerouslySetInnerHTML') || l.includes('prose') || l.includes('ql-editor') || l.includes('ql-snow')) {
            console.log(`     L${i + 1}: ${l}`);
          }
        });
      }
    }
  }
}
findPublicBlog('src/app/(public)');
