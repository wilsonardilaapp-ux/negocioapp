const fs = require('fs');

console.log('==============================================');
console.log('LÍNEAS EXACTAS EN public-form.tsx');
console.log('==============================================');

const formContent = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const formLines = formContent.split('\n');

formLines.forEach((line, idx) => {
  if (line.includes('mensualidad') || line.includes('plan.badge') || line.includes('Plan Activación Básica') || line.includes('Plan Básico')) {
    console.log(`public-form.tsx -> Línea ${idx + 1}: ${line.trim()}`);
  }
});

console.log('\n==============================================');
console.log('LÍNEAS EXACTAS EN constants.ts');
console.log('==============================================');

const constContent = fs.readFileSync('src/modules/solicitudes-negocio/constants.ts', 'utf8');
const constLines = constContent.split('\n');

constLines.forEach((line, idx) => {
  if (line.includes('Plan Activación Básica') || line.includes('plan-vip') || line.includes('mensualidad') || line.includes('commissionPercentage')) {
    console.log(`constants.ts -> Línea ${idx + 1}: ${line.trim()}`);
  }
});

console.log('==============================================');
