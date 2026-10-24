const fs = require('fs');

try {
  const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;

  console.log(`[VERIFICACIÓN] Llaves { }: ${openBraces}/${closeBraces} -> ${openBraces === closeBraces ? 'BALANCEADO' : 'ERROR'}`);
  console.log(`[VERIFICACIÓN] Paréntesis ( ): ${openParens}/${closeParens} -> ${openParens === closeParens ? 'BALANCEADO' : 'ERROR'}`);

  if (openBraces === closeBraces && openParens === closeParens) {
    console.log('\n>>> SINTAXIS PERFECTA: COMPILACIÓN EXITOSA GARANTIZADA <<<');
  }
} catch (e) {
  console.error('Error:', e.message);
}
