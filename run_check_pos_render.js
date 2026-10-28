const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/pos/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (/loadingBusiness|loadingProducts|isModuleAuthorized|LimitBanner|return/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});

console.log('\n--- Alrededor de L130 a L160 ---');
for (let i = 120; i < 170; i++) {
  if (lines[i] && lines[i].includes('loadingBusiness')) {
    console.log(lines.slice(Math.max(0, i - 2), i + 25).join('\n'));
    break;
  }
}
