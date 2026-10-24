const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function checkConfig() {
  const serviceFile = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
  console.log('--- REVISANDO CONFIGURACIÓN ---');
}
checkConfig();
