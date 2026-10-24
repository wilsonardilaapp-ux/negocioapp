const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function runDiag() {
  console.log('==============================================');
  console.log('DIAGNÓSTICO: PLANTILLA EN FIRESTORE VS CÓDIGO');
  console.log('==============================================');

  // Inicializar firebase-admin si no está inicializado
  if (getApps().length === 0) {
    // Buscar credenciales o inicializar con app default de firebase
    try {
      initializeApp();
    } catch (e) {
      // Si está en entorno Markix Cloud Workstation, firebase-admin se conecta automáticamente
    }
  }

  try {
    const db = getFirestore();
    const docSnap = await db.doc('solicitud_config/main').get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      const tmpl = data.whatsappMessageTemplate || '';
      console.log('\n[EVIDENCIA 1] Plantilla guardada en Firestore (solicitud_config/main):');
      console.log(JSON.stringify(tmpl));

      console.log('\n[EVIDENCIA 2] Code points de la plantilla guardada:');
      const codePoints = Array.from(tmpl).map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase());
      console.log(codePoints.slice(0, 30).join(' '));

      const hasFFFD = tmpl.includes('') || tmpl.includes('\uFFFD');
      console.log(`\n[EVIDENCIA 3] ¿Contiene carácter de reemplazo fffd ()? ${hasFFFD ? 'SÍ (¡ESTA ES LA CAUSA RAÍZ!)' : 'NO'}`);
    } else {
      console.log('\n[EVIDENCIA] El documento solicitud_config/main no existe en Firestore (usa constants.ts).');
    }
  } catch (err) {
    console.error('Error conectando a Firestore:', err.message);
  }
  console.log('==============================================');
}

runDiag();
