const fs = require('fs');

const file = 'src/components/reservas/AgendaGrid.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(`Total líneas en ${file}: ${lines.length}`);
lines.forEach((l, i) => {
  if (/Nueva Reserva|Agendar mi primera cita|reservationsCount|LimitBanner/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});

// Ver el encabezado de AgendaGrid (primeras 35 líneas)
console.log('\n--- Primeras 35 líneas de AgendaGrid.tsx ---');
console.log(lines.slice(0, 35).join('\n'));
