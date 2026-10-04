const { execSync } = require('child_process');

console.log('=== HISTORIAL DE CAMBIOS EN suggestion-flow.ts ===\n');
try {
  const log = execSync('git log -n 5 --oneline src/ai/flows/suggestion-flow.ts').toString();
  console.log(log);
  
  console.log('--- Último cambio en suggestion-flow.ts: ---');
  const diff = execSync('git log -n 1 -p src/ai/flows/suggestion-flow.ts').toString();
  console.log(diff.slice(0, 2000));
} catch(e) {
  console.log(e.message);
}

console.log('\n=== HISTORIAL DE CAMBIOS EN update-suggestion-metrics-flow.ts ===\n');
try {
  const diff2 = execSync('git log -n 1 -p src/ai/flows/update-suggestion-metrics-flow.ts').toString();
  console.log(diff2.slice(0, 2000));
} catch(e) {
  console.log(e.message);
}
