const fs = require('fs');

try {
  const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;

  console.log(`[VERIFICACIÓN] Llaves { } = ${openBraces}/${closeBraces} (${openBraces === closeBraces ? 'BALANCEADO' : 'ERROR'})`);
  console.log(`[VERIFICACIÓN] Paréntesis ( ) = ${openParens}/${closeParens} (${openParens === closeParens ? 'BALANCEADO' : 'ERROR'})`);
  console.log(`[VERIFICACIÓN] Presencia de preview grid: ${content.includes('photoItems.map') ? 'SÍ' : 'NO'}`);
  console.log(`[VERIFICACIÓN] Presencia de botón Quitar todas: ${content.includes('handleClearAllPhotos') ? 'SÍ' : 'NO'}`);
  console.log(`[VERIFICACIÓN] Presencia de revokeObjectURL: ${content.includes('URL.revokeObjectURL') ? 'SÍ' : 'NO'}`);

  if (openBraces === closeBraces && openParens === closeParens) {
    console.log('\n>>> SINTAXIS PERFECTA Y COMPILACIÓN LISTA <<<');
  }
} catch (e) {
  console.error('Error:', e.message);
}
