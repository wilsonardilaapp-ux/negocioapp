const fs = require('fs');

console.log('==============================================');
console.log('DIAGNÓSTICO: Notificaciones y WhatsApp');
console.log('==============================================');

// 1. Ver qué campos lee InboxTab al mostrar el modal de detalle
const inboxTabPath = 'src/app/(admin)/superadmin/notifications/components/InboxTab.tsx';
if (fs.existsSync(inboxTabPath)) {
  const content = fs.readFileSync(inboxTabPath, 'utf8');
  console.log('\n--- [1] CAMPOS LEÍDOS EN InboxTab.tsx ---');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('message') || l.includes('body') || l.includes('description') || l.includes('DialogContent') || l.includes('selectedMessage')) {
      if (i > 150 && i < 350) console.log(`L${i + 1}: ${l}`);
    }
  });
}

// 2. Ver cómo guarda la notificación actualmente solicitudes-service.ts
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
if (fs.existsSync(servicePath)) {
  const content = fs.readFileSync(servicePath, 'utf8');
  console.log('\n--- [2] CÓDIGO ACTUAL DE NOTIFICACIÓN EN solicitudes-service.ts ---');
  const notifStart = content.indexOf("db.collection('contactMessages').add({");
  if (notifStart !== -1) {
    console.log(content.slice(notifStart, notifStart + 600));
  }
}

// 3. Ver cómo maneja el click handleSubmit en public-form.tsx
const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
if (fs.existsSync(formPath)) {
  const content = fs.readFileSync(formPath, 'utf8');
  console.log('\n--- [3] SUBMIT ACTUAL EN public-form.tsx ---');
  const submitIndex = content.indexOf('const handleSubmit = async');
  if (submitIndex !== -1) {
    console.log(content.slice(submitIndex, submitIndex + 500));
  }
}

console.log('\n==============================================');
