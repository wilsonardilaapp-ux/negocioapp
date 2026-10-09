const fs = require('fs');
const path = require('path');

function printFileSection(filePath, startLine, endLine) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ No existe: ${filePath}`);
    return;
  }
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  console.log(`📄 [${filePath}] (Líneas ${startLine} a ${Math.min(lines.length, endLine)}):`);
  for (let i = startLine - 1; i < Math.min(lines.length, endLine); i++) {
    console.log(`  ${i + 1}: ${lines[i]}`);
  }
}

function searchInFile(filePath, regex) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const matches = [];
  lines.forEach((line, idx) => {
    if (regex.test(line)) {
      matches.push({ line: idx + 1, content: line });
    }
  });
  return matches;
}

console.log('====================================================');
console.log('🔍 DIAGNÓSTICO FASE 1: SUPERADMIN BLOG');
console.log('====================================================\n');

// --- PUNTO 1: Fecha en /superadmin/blog ---
console.log('--- 1. PUNTO 1: Fecha en /superadmin/blog ---');
const superadminBlogPage = 'src/app/(admin)/superadmin/blog/page.tsx';
const tableMatches = searchInFile(superadminBlogPage, /Fecha|Table|createdAt|format/i);
console.log('Coincidencias en superadmin/blog/page.tsx:', tableMatches);

// Ver si usa PostsTable o tabla propia
const postTableMatch = searchInFile(superadminBlogPage, /PostsTable/);
if (postTableMatch.length > 0) {
  console.log('Usa componente PostsTable. Inspeccionando src/components/blog/posts-table.tsx:');
  const postTableDates = searchInFile('src/components/blog/posts-table.tsx', /createdAt|Date|format|Fecha/i);
  console.log(postTableDates);
  printFileSection('src/components/blog/posts-table.tsx', 70, 110);
} else {
  printFileSection(superadminBlogPage, 80, 160);
}

// --- PUNTO 2: Editor en /superadmin/blog/create ---
console.log('\n--- 2. PUNTO 2: Editor en /superadmin/blog/create ---');
const superadminCreatePage = 'src/app/(admin)/superadmin/blog/create/page.tsx';
const editorImports = searchInFile(superadminCreatePage, /editor|quill|tiptap|content/i);
console.log('Imports y usos de editor en superadmin/blog/create/page.tsx:', editorImports);
printFileSection(superadminCreatePage, 160, 215);

// Verificar quién usa RichTextEditor
console.log('\nUso de RichTextEditor en todo el proyecto:');
function findUsages(dir, keyword) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findUsages(full, keyword);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes(keyword)) {
        console.log(`  - Usado en: ${full}`);
      }
    }
  }
}
findUsages('src', 'RichTextEditor');

if (fs.existsSync('src/components/editor/RichTextEditor.tsx')) {
  console.log('\nContenido de src/components/editor/RichTextEditor.tsx:');
  printFileSection('src/components/editor/RichTextEditor.tsx', 1, 60);
}

// --- PUNTO 3: Límite de posts en /superadmin/blog/create ---
console.log('\n--- 3. PUNTO 3: Límite en superadmin/blog/create ---');
const limitMatches = searchInFile(superadminCreatePage, /l[ií]mite|posts permitidos|blogModule|5|max/i);
console.log('Coincidencias de límite en create/page.tsx:', limitMatches);
printFileSection(superadminCreatePage, 75, 120);
printFileSection(superadminCreatePage, 155, 185);

// Revisar backend createPost para Super Admin (businessId indefinido)
console.log('\nBackend createPost (src/actions/blog.ts) y límite para Superadmin:');
printFileSection('src/actions/blog.ts', 20, 60);

