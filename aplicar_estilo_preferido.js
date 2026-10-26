const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function backupFile(filePath) {
  const bak = filePath + '.bak';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(filePath, bak);
  }
}

console.log('--- 1. MODIFICANDO admin-inbox.tsx ---');
const inboxPath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');
backupFile(inboxPath);
let inboxContent = fs.readFileSync(inboxPath, 'utf8');

const anchorRecursos = `<p><strong>🎨 Creación de Recursos solicitada:</strong> {recursos.join(', ')}</p>
                );
              })()}`;

const nuevoRecursosYEstilo = `<p><strong>🎨 Creación de Recursos solicitada:</strong> {recursos.join(', ')}</p>
                );
              })()}
              {selectedItem.images?.stylePreference && (
                <p><strong>✨ Estilo preferido:</strong> {selectedItem.images.stylePreference}</p>
              )}`;

if (inboxContent.includes(anchorRecursos) && !inboxContent.includes('Estilo preferido:')) {
  inboxContent = inboxContent.replace(anchorRecursos, nuevoRecursosYEstilo);
  fs.writeFileSync(inboxPath, inboxContent, 'utf8');
  console.log('✓ admin-inbox.tsx actualizado con campo Estilo preferido');
} else {
  console.log('• admin-inbox.tsx ya contiene o no requirió cambios');
}

console.log('--- 2. MODIFICANDO solicitudes-service.ts ---');
const servicePath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/services/solicitudes-service.ts');
backupFile(servicePath);
let serviceContent = fs.readFileSync(servicePath, 'utf8');

// Añadir al mensaje de WhatsApp inicial
const waCreacionAnchor = `String.fromCodePoint(0x1F3A8) + ' *Creación imágenes:* ' + imagenesStr,`;
const waCreacionConEstilo = `String.fromCodePoint(0x1F3A8) + ' *Creación imágenes:* ' + imagenesStr,
    data.images?.stylePreference ? '✨ *Estilo preferido:* ' + data.images.stylePreference : null,`;

if (serviceContent.includes(waCreacionAnchor) && !serviceContent.includes('Estilo preferido:*')) {
  serviceContent = serviceContent.replace(waCreacionAnchor, waCreacionConEstilo);
}

// Añadir {estilo} a reenviarWhatsAppSolicitud
const reenviarAnchor = `plantilla = plantilla.replace(/{comprobante}/g, solicitud.paymentReceiptUrl ? 'Adjuntado' : 'No');`;
const reenviarConEstilo = `plantilla = plantilla.replace(/{comprobante}/g, solicitud.paymentReceiptUrl ? 'Adjuntado' : 'No');
  plantilla = plantilla.replace(/{estilo}/g, solicitud.images?.stylePreference || 'No especificado');
  plantilla = plantilla.replace(/{estilo_preferido}/g, solicitud.images?.stylePreference || 'No especificado');`;

if (serviceContent.includes(reenviarAnchor) && !serviceContent.includes('replace(/{estilo}/g')) {
  serviceContent = serviceContent.replace(reenviarAnchor, reenviarConEstilo);
}

// Añadir variable estilo a la llamada de enviarWhatsAppSolicitud en reenviar
const callAnchor = `categoria: solicitud.category,\n      imagenes: imagenesStr,\n      enlace: panelLink`;
const callConEstilo = `categoria: solicitud.category,\n      imagenes: imagenesStr,\n      estilo: solicitud.images?.stylePreference || 'No especificado',\n      enlace: panelLink`;
if (serviceContent.includes(callAnchor)) {
  serviceContent = serviceContent.replace(callAnchor, callConEstilo);
}

fs.writeFileSync(servicePath, serviceContent, 'utf8');
console.log('✓ solicitudes-service.ts actualizado con Estilo en WhatsApp');

console.log('--- 3. MODIFICANDO whatsapp-service.ts ---');
const waServicePath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/services/whatsapp-service.ts');
backupFile(waServicePath);
let waServiceContent = fs.readFileSync(waServicePath, 'utf8');

// Agregar a la interfaz
if (!waServiceContent.includes('estilo?: string;')) {
  waServiceContent = waServiceContent.replace(
    'imagenes: string;\n    enlace: string;',
    'imagenes: string;\n    estilo?: string;\n    enlace: string;'
  );
}

// Agregar reemplazo en el mensaje
if (!waServiceContent.includes('replace(/{estilo}/g')) {
  waServiceContent = waServiceContent.replace(
    `mensaje = mensaje.replace(/{enlace}/g, params.variables.enlace || '');`,
    `mensaje = mensaje.replace(/{estilo}/g, params.variables.estilo || 'No especificado');
    mensaje = mensaje.replace(/{estilo_preferido}/g, params.variables.estilo || 'No especificado');
    mensaje = mensaje.replace(/{enlace}/g, params.variables.enlace || '');`
  );
}

fs.writeFileSync(waServicePath, waServiceContent, 'utf8');
console.log('✓ whatsapp-service.ts actualizado con variable {estilo}');

console.log('--- 4. MODIFICANDO admin-editor.tsx ---');
const editorPath = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-editor.tsx');
backupFile(editorPath);
let editorContent = fs.readFileSync(editorPath, 'utf8');

const labelAnchor = `Plantilla WhatsApp (Variables: {'{nombre}'}, {'{nombre_completo}'}, {'{telefono}'}, {'{plan}'}, {'{valor}'}, {'{metodo_pago}'}, {'{comprobante}'}, {'{enlace}'})`;
const labelConEstilo = `Plantilla WhatsApp (Variables: {'{nombre}'}, {'{nombre_completo}'}, {'{telefono}'}, {'{plan}'}, {'{valor}'}, {'{metodo_pago}'}, {'{comprobante}'}, {'{estilo}'}, {'{enlace}'})`;

if (editorContent.includes(labelAnchor)) {
  editorContent = editorContent.replace(labelAnchor, labelConEstilo);
  fs.writeFileSync(editorPath, editorContent, 'utf8');
  console.log('✓ admin-editor.tsx actualizado con {estilo} en label');
}

console.log('--- 5. VALIDACIÓN DE TIPOS CON TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error detectado en TypeScript.');
}
