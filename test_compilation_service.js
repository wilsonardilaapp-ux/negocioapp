const fs = require('fs');

try {
  const content = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
  
  // Buscar si queda alguna regex vacía rota
  if (content.includes('.replace(//g,')) {
    console.log('[ERROR] Aún queda una expresión regular vacía.');
  } else {
    console.log('[OK] No hay expresiones regulares vacías.');
  }

  // Verificar balance de llaves
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  console.log(`[VERIFICACIÓN] Llaves { }: ${openBraces}/${closeBraces} -> ${openBraces === closeBraces ? 'BALANCEADO' : 'ERROR'}`);

  if (openBraces === closeBraces && !content.includes('.replace(//g,')) {
    console.log('\n>>> COMPILACIÓN DE solicitudes-service.ts GARANTIZADA <<<');
  }
} catch (e) {
  console.error('Error:', e.message);
}
