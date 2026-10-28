const fs = require('fs');

function inspectFile(file) {
  if (!fs.existsSync(file)) return console.log(`No existe: ${file}`);
  console.log(`\n====================================================`);
  console.log(`ARCHIVO: ${file}`);
  console.log(`====================================================`);
  const content = fs.readFileSync(file, 'utf8');
  content.split('\n').forEach((l, i) => {
    if (/collection\(|bookings|citas|reservas/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

inspectFile('src/actions/booking-management.ts');
inspectFile('src/actions/public-booking.ts');
