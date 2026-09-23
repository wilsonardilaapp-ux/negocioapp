const fs = require('fs');
const filePath = 'src/components/invoice/InvoiceTemplate.tsx';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "export type OrderType = typeof mockOrder;",
  "export type OrderType = Omit<typeof mockOrder, 'serviceFee'> & { serviceFee?: number };"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ serviceFee configurado como opcional en OrderType.');
