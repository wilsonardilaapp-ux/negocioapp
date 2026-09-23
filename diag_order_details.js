const fs = require('fs');

console.log('--- 1. BUSCAR MODAL "DETALLE DEL PEDIDO" ---');
const findInFiles = (dir) => {
  let res = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      const full = `${dir}/${f}`;
      if (['node_modules', '.git', '.next'].includes(f)) continue;
      if (fs.statSync(full).isDirectory()) res = res.concat(findInFiles(full));
      else if (/\.(tsx?)$/.test(f)) {
        const c = fs.readFileSync(full, 'utf8');
        if (c.includes('Detalle del Pedido') || c.includes('Subtotal Productos:')) {
          res.push(full);
        }
      }
    }
  } catch(e) {}
  return res;
};

console.log('Archivos con Detalle del Pedido:', findInFiles('src'));

console.log('\n--- 2. TICKET DE IMPRESIÓN (PRINT/[ORDERID]/PAGE.TSX) ---');
try {
  const printCode = fs.readFileSync('src/app/(dashboard)/dashboard/pedidos/print/[orderId]/page.tsx', 'utf8');
  const lines = printCode.split('\n');
  const subIdx = lines.findIndex(l => l.includes('Subtotal') || l.includes('subtotal') || l.includes('TOTAL:'));
  if (subIdx !== -1) {
    console.log(lines.slice(Math.max(0, subIdx - 5), subIdx + 30).join('\n'));
  }
} catch(e) { console.log('Error print page:', e.message); }
