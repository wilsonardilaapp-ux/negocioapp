const fs = require('fs');

const files = [
  'src/modules/solicitudes-negocio/types.ts',
  'src/modules/solicitudes-negocio/constants.ts',
  'src/modules/solicitudes-negocio/components/admin-editor.tsx',
  'src/modules/solicitudes-negocio/components/public-form.tsx'
];

console.log('==============================================');
console.log('VERIFICANDO SINTAXIS Y BALANCE');
console.log('==============================================');

files.forEach(f => {
  try {
    const content = fs.readFileSync(f, 'utf8');
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    const balanced = openBraces === closeBraces && openParens === closeParens;
    console.log(`[${balanced ? 'OK' : 'ERROR'}] ${f} -> Llaves: ${openBraces}/${closeBraces}, Paréntesis: ${openParens}/${closeParens}`);
  } catch (e) {
    console.error(`Error en ${f}:`, e.message);
  }
});

console.log('==============================================');
