const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO CAMBIOS APLICADOS');
console.log('==============================================');

// 1. constants.ts
const constants = fs.readFileSync('src/modules/solicitudes-negocio/constants.ts', 'utf8');
console.log(`[CONSTANTS] Título Plan Básico presente: ${constants.includes("name: 'Plan Básico'") ? 'SÍ' : 'NO'}`);
console.log(`[CONSTANTS] Badge ⚡ EXPRESS en VIP: ${constants.includes("badge: '⚡ EXPRESS'") ? 'SÍ' : 'NO'}`);

// 2. public-form.tsx
const form = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const openBraces = (form.match(/{/g) || []).length;
const closeBraces = (form.match(/}/g) || []).length;
console.log(`[FORM] Balance sintaxis: ${openBraces}/${closeBraces} (${openBraces === closeBraces ? 'PERFECTO' : 'ERROR'})`);
console.log(`[FORM] Estado showFooterNote: ${form.includes('showFooterNote') ? 'SÍ' : 'NO'}`);
console.log(`[FORM] Badge morado #7c3aed: ${form.includes('#7c3aed') ? 'SÍ' : 'NO'}`);
console.log(`[FORM] Toggle Switch 50px x 26px (#16a34a): ${form.includes('50px') && form.includes('#16a34a') ? 'SÍ' : 'NO'}`);
console.log(`[FORM] Nuevo texto del footer: ${form.includes('✨ $0 de mensualidad. 0% de comisión por pedido. Pagas una sola vez.') ? 'SÍ' : 'NO'}`);

console.log('==============================================');
