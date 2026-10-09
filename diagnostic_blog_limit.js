const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', '.turbo', 'coverage'
]);

function searchFiles(dir, searchPatterns, results = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        searchFiles(fullPath, searchPatterns, results);
      } else if (entry.isFile() && /\.(tsx|ts|jsx|js|mjs)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matched = [];
          for (const pattern of searchPatterns) {
            if (pattern.test(content)) {
              matched.push(pattern.source);
            }
          }
          if (matched.length > 0) {
            results.push({ path: fullPath, matches: matched });
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
  return results;
}

console.log('🔍 [DIAGNÓSTICO] Analizando archivos del proyecto...\n');

const patterns = [
  /L[ií]mite de posts/i,
  /posts? ilimitados?/i,
  /blog_posts/i,
  /"Blog Posts"/i
];

const matches = searchFiles(process.cwd(), patterns);

console.log('=== ARCHIVOS CON LÍMITES O TEXTOS DETECTADOS ===');
matches.forEach(m => {
  console.log(`\n📄 Archivo: ${m.path}`);
  const lines = fs.readFileSync(m.path, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (patterns.some(p => p.test(line))) {
      const start = Math.max(0, idx - 2);
      const end = Math.min(lines.length - 1, idx + 2);
      console.log(`  [Líneas ${start + 1}-${end + 1}]:`);
      for (let i = start; i <= end; i++) {
        console.log(`    ${i + 1}: ${lines[i]}`);
      }
    }
  });
});

console.log('\n=== RUTAS Y ACCIONES DE BLOG RELACIONADAS ===');
const blogRoutes = searchFiles(process.cwd(), [/createPost/i, /\/api\/.*blog/i, /from ['"].*blog/i]);
blogRoutes.slice(0, 15).forEach(r => {
  if (!matches.some(m => m.path === r.path)) {
    console.log(`📌 ${r.path}`);
  }
});

console.log('\n Diagnóstico finalizado.');
