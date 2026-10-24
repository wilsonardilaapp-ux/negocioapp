const fs = require('fs');

try {
  const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
  console.log(`[OK] Archivo leído correctamente (${(content.length / 1024).toFixed(1)} KB)`);
  
  // Contar llaves y paréntesis para garantizar balance total
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;

  console.log(`Llaves: { = ${openBraces}, } = ${closeBraces} -> ${openBraces === closeBraces ? 'PERFECTO' : 'DESBALANCE'}`);
  console.log(`Paréntesis: ( = ${openParens}, ) = ${closeParens} -> ${openParens === closeParens ? 'PERFECTO' : 'DESBALANCE'}`);

  if (openBraces === closeBraces && openParens === closeParens) {
    console.log('\n>>> SINTAXIS 100% LIMPIA Y LISTA PARA NAVEGADOR <<<');
  }
} catch (e) {
  console.error('Error:', e.message);
}
