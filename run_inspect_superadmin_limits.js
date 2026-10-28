const fs = require('fs');

function searchPatterns(file, patterns) {
  if (!fs.existsSync(file)) return console.log(`No existe ${file}`);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(`\n====================================================`);
  console.log(`ARCHIVO: ${file}`);
  console.log(`====================================================`);
  lines.forEach((l, i) => {
    for (const p of patterns) {
      if (p.test(l)) {
        console.log(`L${i+1}: ${l.trim()}`);
        break;
      }
    }
  });
}

searchPatterns('src/app/(admin)/superadmin/negocios/page.tsx', [
  /LÍMITE BASE|TOTAL REAL|extraLimits|limitesExtra|reservas-agendamiento|Reservas y Citas/i
]);

// Revisamos cómo se guardan o cuentan las reservas de un negocio
const bookingActions = fs.readdirSync('src/actions').filter(f => /booking|reserva/i.test(f));
console.log('\nArchivos de reservas en src/actions:', bookingActions);
