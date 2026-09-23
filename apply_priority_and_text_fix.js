const fs = require('fs');

// 1. CORREGIR PRECEDENCIA DE CANAL EN src/constants/pricingPlans.ts
const pricingPath = 'src/constants/pricingPlans.ts';
let pricingContent = fs.readFileSync(pricingPath, 'utf8');

const oldCanalLine = `const activeCanal = context.channel || canal;`;
const newCanalLine = `const activeCanal = canal || context?.channel || 'domicilio';`;

if (pricingContent.includes(oldCanalLine)) {
  pricingContent = pricingContent.replace(oldCanalLine, newCanalLine);
  fs.writeFileSync(pricingPath, pricingContent, 'utf8');
  console.log('✅ Precedencia de canal corregida en pricingPlans.ts');
} else {
  console.log('ℹ️ Línea de canal en pricingPlans.ts ya estaba actualizada.');
}

// 2. CORREGIR TEXTO MENFY -> MARKIX EN src/app/(admin)/superadmin/hybrid-plans/page.tsx
const plansPath = 'src/app/(admin)/superadmin/hybrid-plans/page.tsx';
let plansContent = fs.readFileSync(plansPath, 'utf8');

const oldText = `Tarifa de servicio Menfy sumada a la cuenta del cliente en local por uso del QR (default: 3%).`;
const newText = `Tarifa de servicio Markix sumada a la cuenta del cliente en local por uso del QR (default: 3%).`;

if (plansContent.includes(oldText)) {
  plansContent = plansContent.replace(oldText, newText);
  fs.writeFileSync(plansPath, plansContent, 'utf8');
  console.log('✅ Texto Menfy -> Markix actualizado en hybrid-plans.');
} else {
  console.log('ℹ️ Texto Markix ya estaba presente en hybrid-plans.');
}
