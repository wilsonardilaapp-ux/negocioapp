const fs = require('fs');

console.log('--- 1. AUDITORÍA DE TEXTOS EN PRICING/PAGE.TSX ---');
try {
  const pr = fs.readFileSync('src/app/(public)/pricing/page.tsx', 'utf8');
  const lines = pr.split('\n');
  lines.filter(l => /(mesa|0%|comisi|porcent|%)/i.test(l)).slice(0, 15).forEach(l => console.log(l.trim()));
} catch(e) { console.log(e.message); }

console.log('\n--- 2. AUDITORÍA EN PUBLIC-PLAN-CARD.TSX ---');
try {
  const card = fs.readFileSync('src/components/pricing/public-plan-card.tsx', 'utf8');
  const lines = card.split('\n');
  lines.filter(l => /(mesa|0%|comisi|porcent|%)/i.test(l)).slice(0, 15).forEach(l => console.log(l.trim()));
} catch(e) { console.log(e.message); }
