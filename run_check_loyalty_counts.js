const fs = require('fs');

const content = fs.readFileSync('src/actions/loyalty.ts', 'utf8');
const lines = content.split('\n');

function printFunction(fnName) {
  const idx = lines.findIndex(l => l.includes(`export async function ${fnName}`));
  if (idx !== -1) {
    console.log(`\n--- ${fnName} ---`);
    console.log(lines.slice(idx, idx + 35).join('\n'));
  }
}

printFunction('getLoyaltyStatus');
printFunction('getRecoveryStats');
