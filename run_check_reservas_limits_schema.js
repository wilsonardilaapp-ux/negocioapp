const fs = require('fs');

console.log('--- 1. Límites base en HybridPlanSchema (src/models/hybrid-plan.ts) ---');
const schema = fs.readFileSync('src/models/hybrid-plan.ts', 'utf8');
const match = schema.match(/limits:\s*z\.object\(\{[\s\S]*?\}\)/);
if (match) console.log(match[0]);

console.log('\n--- 2. Cómo se configuran los límites en superadmin/hybrid-plans/page.tsx ---');
const adminPage = fs.readFileSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx', 'utf8');
const lines = adminPage.split('\n');
lines.forEach((l, i) => {
  if (/reservas|citas|extraLimits|limits\./i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
