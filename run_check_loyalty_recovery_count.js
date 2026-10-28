const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (/RecoveredRevenueCard|recovery|rescatados/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
