const fs = require('fs');

const file = 'src/actions/loyalty.ts';
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('--- Funciones exportadas en src/actions/loyalty.ts ---');
  const funcs = content.match(/export async function \w+/g) || [];
  console.log(funcs.join('\n'));
}
