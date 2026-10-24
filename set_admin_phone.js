const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!getApps().length) { initializeApp(); }
const db = getFirestore();

async function setPhone() {
  await db.doc('config/solicitudes_negocio').set({
    adminWhatsAppNumber: '573009632589', // <--- El número que recibirá las notificaciones
    enabled: true
  }, { merge: true });

  console.log('✅ Número de administrador configurado.');
}

setPhone();
