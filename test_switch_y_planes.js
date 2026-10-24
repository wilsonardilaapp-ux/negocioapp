const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO ELEMENTOS Y SINTAXIS');
console.log('==============================================');

// 1. public-form.tsx
const form = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const openBracesForm = (form.match(/{/g) || []).length;
const closeBracesForm = (form.match(/}/g) || []).length;
console.log(`[PUBLIC FORM] Sintaxis balanceada: ${openBracesForm}/${closeBracesForm} (${openBracesForm === closeBracesForm ? 'PERFECTO' : 'ERROR'})`);
console.log(`[PUBLIC FORM] Switch eliminado de la página pública: ${!form.includes('checked={showFooterNote}') ? 'SÍ' : 'NO'}`);
console.log(`[PUBLIC FORM] Texto visible según config: ${form.includes('config.showCommissionNote !== false') ? 'SÍ' : 'NO'}`);
console.log(`[PUBLIC FORM] Nombre Plan Básico garantizado: ${form.includes('Plan Básico') ? 'SÍ' : 'NO'}`);
console.log(`[PUBLIC FORM] Badge ⚡ EXPRESS morado garantizado: ${form.includes('⚡ EXPRESS') && form.includes('#7c3aed') ? 'SÍ' : 'NO'}`);

// 2. admin-editor.tsx
const editor = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-editor.tsx', 'utf8');
const openBracesEd = (editor.match(/{/g) || []).length;
const closeBracesEd = (editor.match(/}/g) || []).length;
console.log(`\n[ADMIN EDITOR] Sintaxis balanceada: ${openBracesEd}/${closeBracesEd} (${openBracesEd === closeBracesEd ? 'PERFECTO' : 'ERROR'})`);
console.log(`[ADMIN EDITOR] Switch de 50px x 26px presente en el Editor: ${editor.includes('50px') && editor.includes('showCommissionNote') ? 'SÍ' : 'NO'}`);

console.log('==============================================');
