const fs = require('fs');

console.log('--- 1. DASHBOARD SUBSCRIPTION PAGE ---');
try {
  const page = fs.readFileSync('src/app/(dashboard)/dashboard/subscription/page.tsx', 'utf8');
  console.log(page.slice(0, 800));
} catch(e) { console.log('Error page:', e.message); }

console.log('\n--- 2. CURRENT PLAN CARD ---');
try {
  const card = fs.readFileSync('src/app/(dashboard)/dashboard/subscription/components/CurrentPlanCard.tsx', 'utf8');
  console.log(card.slice(0, 800));
} catch(e) { console.log('Error CurrentPlanCard:', e.message); }

console.log('\n--- 3. PLAN COMPARISON TABLE ---');
try {
  const table = fs.readFileSync('src/app/(dashboard)/dashboard/subscription/components/PlanComparisonTable.tsx', 'utf8');
  console.log(table.slice(0, 800));
} catch(e) { console.log('Error PlanComparisonTable:', e.message); }
