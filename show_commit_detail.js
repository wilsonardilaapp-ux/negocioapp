const { execSync } = require('child_process');

console.log('=== DETALLE DEL BLOQUE ELIMINADO EN ce6f70a ===\n');

try {
  const diff = execSync('git show ce6f70a -- src/app/\\(public\\)/catalog/\\[businessId\\]/page.tsx').toString();
  const lines = diff.split('\n');
  const startIdx = lines.findIndex(l => l.includes('<SuggestionModal'));
  if (startIdx !== -1) {
    lines.slice(startIdx - 5, startIdx + 25).forEach(l => console.log(l));
  }
} catch(e) {
  console.log(e.message);
}

// Ver cómo está montado ProductViewModal en page.tsx actualmente
console.log('\n=== MONTAJE ACTUAL DE ProductViewModal EN page.tsx ===\n');
const pageContent = require('fs').readFileSync('src/app/(public)/catalog/[businessId]/page.tsx', 'utf8');
const pLines = pageContent.split('\n');
const viewIdx = pLines.findIndex(l => l.includes('<ProductViewModal'));
if (viewIdx !== -1) {
  pLines.slice(viewIdx - 2, viewIdx + 15).forEach(l => console.log(l));
}
