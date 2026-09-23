const fs = require('fs');
const filePath = 'src/constants/pricingPlans.ts';

let content = fs.readFileSync(filePath, 'utf8');

const oldRoundFn = `export function roundUp100(value: number): number {
  if (!value || isNaN(value) || value <= 0) return 0;
  return Math.ceil(value / 100) * 100;
}`;

const newRoundFn = `export function roundUp100(value: number): number {
  if (!value || isNaN(value) || value <= 0) return 0;
  // Normalizar micro-épsilon flotante de JavaScript (ej. 24200.000000000004 -> 24200)
  const cleanValue = Math.round(value * 100) / 100;
  return Math.ceil(cleanValue / 100) * 100;
}`;

content = content.replace(oldRoundFn, newRoundFn);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Precisión financiera corregida en roundUp100.');
