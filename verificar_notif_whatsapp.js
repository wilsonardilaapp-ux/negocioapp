const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO AJUSTES DE NOTIFICACIÓN Y WHATSAPP');
console.log('==============================================');

// 1. Verificar body en solicitudes-service.ts
const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
const hasBody = service.includes('body: lineasCuerpo');
const hasWaUrl = service.includes('whatsappUrl');
console.log(`[SERVICE] Guarda campo body en contactMessages: ${hasBody ? 'SÍ' : 'NO'}`);
console.log(`[SERVICE] Genera URL de WhatsApp: ${hasWaUrl ? 'SÍ' : 'NO'}`);

// 2. Verificar route.ts
const route = fs.readFileSync('src/app/api/solicitudes-negocio/route.ts', 'utf8');
const returnsWaUrl = route.includes('whatsappUrl: resultado.whatsappUrl');
console.log(`[API ROUTE] Retorna whatsappUrl en JSON: ${returnsWaUrl ? 'SÍ' : 'NO'}`);

// 3. Verificar public-form.tsx
const form = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const hasPopup = form.includes('popupWin');
const hasGreenBtn = form.includes('bg-[#25D366]');
const hasSuccessWaBtn = form.includes('Abrir WhatsApp');
console.log(`[FORM] Apertura síncrona anti-popup: ${hasPopup ? 'SÍ' : 'NO'}`);
console.log(`[FORM] Botón verde WhatsApp #25D366: ${hasGreenBtn ? 'SÍ' : 'NO'}`);
console.log(`[FORM] Botón de respaldo en pantalla éxito: ${hasSuccessWaBtn ? 'SÍ' : 'NO'}`);

console.log('==============================================');
