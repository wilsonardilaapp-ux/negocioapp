const fs = require('fs');
if (fs.existsSync('src/app/(dashboard)/dashboard/reservas/layout.tsx')) {
  console.log(fs.readFileSync('src/app/(dashboard)/dashboard/reservas/layout.tsx', 'utf8').slice(0, 1000));
} else {
  console.log('No existe reservas/layout.tsx');
}
