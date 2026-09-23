const fs = require('fs');

console.log('--- 1. TOTALES EN VIEWORDERDIALOG.TSX ---');
try {
  const d = fs.readFileSync('src/components/pedidos/ViewOrderDialog.tsx', 'utf8');
  const lines = d.split('\n');
  const subIdx = lines.findIndex(l => l.includes('Subtotal Productos:'));
  if (subIdx !== -1) {
    console.log(lines.slice(Math.max(0, subIdx - 2), subIdx + 20).join('\n'));
  }
} catch(e) { console.log(e.message); }

console.log('\n--- 2. TOTALES EN TICKET PRINT/[ORDERID]/PAGE.TSX ---');
try {
  const p = fs.readFileSync('src/app/(dashboard)/dashboard/pedidos/print/[orderId]/page.tsx', 'utf8');
  const lines = p.split('\n');
  const printIdx = lines.findIndex(l => l.includes('Subtotal:') || l.includes('Domicilio:'));
  if (printIdx !== -1) {
    console.log(lines.slice(Math.max(0, printIdx - 4), printIdx + 25).join('\n'));
  }
} catch(e) { console.log(e.message); }
