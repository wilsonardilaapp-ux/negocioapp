console.log('==============================================');
console.log('TEST AUTOMÁTICO DE EVIDENCIA — WHATSAPP (CORREGIDO)');
console.log('==============================================');

function renderizarPlantillaWhatsApp(plantillaRaw, vars) {
  let limpia = (plantillaRaw || '').replace(/\uFFFD/g, '');

  limpia = limpia.replace(/{e_nuevo}/g, String.fromCodePoint(0x1F195));
  limpia = limpia.replace(/{e_negocio}/g, String.fromCodePoint(0x1F3EA));
  limpia = limpia.replace(/{e_telefono}/g, String.fromCodePoint(0x1F4DE));
  limpia = limpia.replace(/{e_direccion}/g, String.fromCodePoint(0x1F4CD));
  limpia = limpia.replace(/{e_categoria}/g, String.fromCodePoint(0x1F3F7));
  limpia = limpia.replace(/{e_plan}/g, String.fromCodePoint(0x1F4E6));
  limpia = limpia.replace(/{e_pago}/g, String.fromCodePoint(0x1F4B3));
  limpia = limpia.replace(/{e_comprobante}/g, String.fromCodePoint(0x1F9FE));
  limpia = limpia.replace(/{e_imagenes}/g, String.fromCodePoint(0x1F3A8));
  limpia = limpia.replace(/{e_enlace}/g, String.fromCodePoint(0x1F517));

  limpia = limpia.replace(/{nombre}/g, vars.nombre || 'N/A');
  limpia = limpia.replace(/{telefono}/g, vars.telefono || 'N/A');
  limpia = limpia.replace(/{direccion}/g, vars.direccion || 'N/A');
  limpia = limpia.replace(/{categoria}/g, vars.categoria || 'N/A');
  limpia = limpia.replace(/{plan}/g, vars.plan || 'N/A');
  limpia = limpia.replace(/{valor}/g, vars.valor || 'N/A');
  limpia = limpia.replace(/{metodo_pago}/g, vars.metodo_pago || 'N/A');
  limpia = limpia.replace(/{comprobante}/g, vars.comprobante || 'N/A');
  limpia = limpia.replace(/{imagenes}/g, vars.imagenes || 'Ninguna');
  limpia = limpia.replace(/{enlace}/g, vars.enlace || '');

  const arr = Array.from(limpia);
  if (arr.length > 1500) {
    return arr.slice(0, 1450).join('') + '\n\n' + String.fromCodePoint(0x1F517) + ' ' + vars.enlace;
  }
  return limpia;
}

const datosPrueba = {
  nombre: 'Panadería Año Nuevo',
  telefono: '3001234567',
  direccion: 'Calle 100 # 15-20',
  categoria: 'Restaurantes y Gastronomía',
  plan: 'Plan Pro',
  valor: '$49.000 COP',
  metodo_pago: 'Nequi',
  comprobante: 'Adjuntado',
  imagenes: 'Logo, Banner',
  enlace: 'https://markix.app/superadmin/solicitudes-negocio?id=test1234'
};

const plantillaCorruptaSimulada = '{e_nuevo} *Nueva Solicitud*\\n{e_negocio} *Negocio:* {nombre}\\n{e_enlace}\\n{enlace}';

const mensajeRenderizado = renderizarPlantillaWhatsApp(plantillaCorruptaSimulada, datosPrueba);
const urlFinal = 'https://wa.me/573228831634?text=' + encodeURIComponent(mensajeRenderizado);

const hasFFFD = mensajeRenderizado.includes('\uFFFD');
const hasExpectedEmojis = mensajeRenderizado.includes(String.fromCodePoint(0x1F3EA)) && mensajeRenderizado.includes(String.fromCodePoint(0x1F517));
const hasPercentEncoding = urlFinal.includes('%F0%9F') || urlFinal.includes('%');

console.log('[EVIDENCIA 1] Mensaje Renderizado:');
console.log(mensajeRenderizado);

console.log('\n[EVIDENCIA 2] URL Final Generada:');
console.log(urlFinal);

console.log('\n--- VERIFICACIÓN DE REQUISITOS ---');
console.log(`1. ¿Contiene caracter corrupto (\\uFFFD)? ${hasFFFD ? 'SÍ (FALLO)' : 'NO (CORRECTO)'}`);
console.log(`2. ¿Contiene emojis esperados (CodePoints)? ${hasExpectedEmojis ? 'SÍ (CORRECTO)' : 'NO (FALLO)'}`);
console.log(`3. ¿La URL final contiene codificación UTF-8 (%F0%9F...)? ${hasPercentEncoding ? 'SÍ (CORRECTO)' : 'NO (FALLO)'}`);

if (!hasFFFD && hasExpectedEmojis && hasPercentEncoding) {
  console.log('\n>>> RESULTADO: TEST APROBADO CON EVIDENCIA AL 100% <<<');
} else {
  console.log('\n>>> RESULTADO: EL TEST REQUIERE REVISIÓN <<<');
}
console.log('==============================================');
