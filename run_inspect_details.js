const fs = require('fs');

function printFileSection(file, startLine, endLine) {
  if (!fs.existsSync(file)) return console.log(`No existe: ${file}`);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(`--- ${file} (Líneas ${startLine}-${endLine}) ---`);
  console.log(lines.slice(startLine - 1, endLine).join('\n'));
}

console.log('====================================================');
console.log('1. RESOLUCIÓN DE LÍMITES EN useSubscription.ts');
console.log('====================================================');
printFileSection('src/hooks/useSubscription.ts', 120, 240);

console.log('\n====================================================');
console.log('2. CÓMO VALIDA LÍMITE LANDING PAGE');
console.log('====================================================');
if (fs.existsSync('src/app/(dashboard)/dashboard/landing-page/page.tsx')) {
  const content = fs.readFileSync('src/app/(dashboard)/dashboard/landing-page/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (/limitbanner|landingpages|limits\.|ismoduleauthorized/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

console.log('\n====================================================');
console.log('3. LÍMITES TÉCNICOS EXTRA DEFINIDOS EN SUPERADMIN HYBRID-PLANS');
console.log('====================================================');
if (fs.existsSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx')) {
  const content = fs.readFileSync('src/app/(admin)/superadmin/hybrid-plans/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (/extralimits|technical|limite|kardex|chatbot|vencimiento|fidelizacion/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

console.log('\n====================================================');
console.log('4. COMPONENTE LimitBanner');
console.log('====================================================');
printFileSection('src/components/dashboard/LimitBanner.tsx', 1, 60);

console.log('\n====================================================');
console.log('5. DIRECTORIO Y WHAPI');
console.log('====================================================');
printFileSection('src/app/(dashboard)/dashboard/valoraciones-directorio/page.tsx', 1, 40);

const whapiFiles = fs.readdirSync('src/app/(dashboard)/dashboard', { recursive: true })
  .filter(f => /whapi/i.test(f));
console.log('Archivos Whapi en dashboard:', whapiFiles);

