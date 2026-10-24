const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('activePlans') || l.includes('Planes de Activación') || l.includes('PublicPaymentBlock') || l.includes('displayName')) {
    console.log(`L${i + 1}: ${l}`);
  }
});
