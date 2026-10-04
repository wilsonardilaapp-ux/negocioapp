const { execSync } = require('child_process');

console.log('=== BUSCANDO EL JSX ORIGINAL DE SuggestionModal EN GIT ===\n');

try {
  // Buscar commits donde se tocó SuggestionModal
  const commits = execSync('git log -S "SuggestionModal" --oneline -n 5').toString();
  console.log('Commits que modificaron SuggestionModal:');
  console.log(commits);

  // Ver cómo estaba montado en commits anteriores
  const diff = execSync('git log -S "<SuggestionModal" -p -n 1 -- src/app/\\(public\\)/catalog/\\[businessId\\]/page.tsx').toString();
  console.log('\n--- Diff de cuando se agregó/quitó SuggestionModal en page.tsx: ---');
  console.log(diff.slice(0, 2000));
} catch(e) {
  console.log('Error buscando en git:', e.message);
}
