const fs = require('fs');
const filePath = 'src/app/(admin)/superadmin/hybrid-plans/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `          pricePerOrder: 0,\n          tableCommissionRate: 3,\n      tableCommissionRate: 3,`,
  `      pricePerOrder: 0,\n      tableCommissionRate: 3,`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Duplicado corregido.');
