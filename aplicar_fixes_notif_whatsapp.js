const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO: Cuerpo Notificación + WhatsApp + Botón');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. solicitudes-service.ts
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let serviceContent = fs.readFileSync(servicePath, 'utf8');

const updatedCrearSolicitud = `export async function crearSolicitud(data: {
  businessName: string;
  phone: string;
  address: string;
  email?: string;
  category: string;
  subcategory?: string;
  description: string;
  socialMedia?: any;
  images?: any;
  products?: any;
  planId?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentReceiptUrl?: string;
  customFieldsData?: any;
  ipAddress?: string;
}): Promise<{ id: string; config: SolicitudFormConfig; whatsappResult: any; whatsappUrl: string }> {
  const db = await getAdminFirestore();
  const config = await getSolicitudConfig();

  if (!config.enabled) {
    throw new Error('El módulo de registro de negocios se encuentra temporalmente desactivado.');
  }

  // 1. Validar Plan en Servidor (precio oficial desde BD)
  const availablePlans = config.plans || DEFAULT_SOLICITUD_CONFIG.plans;
  const chosenPlan = availablePlans.find(p => p.id === data.planId) || availablePlans[0];
  
  const planId = chosenPlan.id;
  const planName = chosenPlan.name;
  const planPrice = Number(chosenPlan.price) || 0;
  const isFree = chosenPlan.isFree || planPrice === 0;

  const paymentStatus: PaymentStatus = isFree ? 'No aplica' : 'Pendiente de pago';
  const paymentMethod = isFree ? 'No aplica (Gratis)' : (data.paymentMethod || 'Por coordinar');

  const now = new Date().toISOString();
  const newDocRef = db.collection(SOLICITUDES_COLLECTION).doc();

  const nuevaSolicitud: SolicitudNegocio = {
    id: newDocRef.id,
    businessName: data.businessName,
    phone: data.phone,
    address: data.address,
    email: data.email || '',
    category: data.category,
    subcategory: data.subcategory || '',
    description: data.description,
    socialMedia: data.socialMedia || {},
    images: data.images || {},
    products: data.products || {},
    status: 'Recibido',
    planId,
    planName,
    planPrice,
    paymentMethod,
    paymentReference: data.paymentReference || '',
    paymentReceiptUrl: data.paymentReceiptUrl || '',
    paymentStatus,
    internalNotes: [],
    customFieldsData: data.customFieldsData || {},
    whatsappStatus: 'pending',
    ipAddress: data.ipAddress || '',
    createdAt: now,
    updatedAt: now
  };

  await newDocRef.set(nuevaSolicitud);

  // Resumen imágenes
  const imagenesPedidas = [];
  if (data.images?.noLogoCreateForMe) imagenesPedidas.push('Logo');
  if (data.images?.noBannerCreateForMe) imagenesPedidas.push('Banner');
  if (data.products?.noProductsPhotosCreateForMe) imagenesPedidas.push('Fotos de productos');
  const imagenesStr = imagenesPedidas.length > 0 ? imagenesPedidas.join(', ') : 'Ninguna';

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markix.app';
  const panelLink = adminUrl + '/superadmin/solicitudes-negocio?id=' + newDocRef.id;
  const valorStr = planPrice > 0 ? ('$' + planPrice.toLocaleString('es-CO') + ' COP') : 'Gratis';

  // 2. CONSTRUIR CUERPO COMPLETO PARA NOTIFICACIÓN SUPERADMIN (campo body)
  const lineasCuerpo = [
    '========================================',
    'DETALLE COMPLETO DE LA SOLICITUD DE NEGOCIO',
    '========================================',
    '🏢 Negocio: ' + data.businessName,
    '📞 Teléfono/WhatsApp: ' + data.phone,
    data.email ? '✉️ Correo: ' + data.email : null,
    '📍 Dirección: ' + data.address,
    '🏷️ Categoría: ' + data.category + (data.subcategory ? ' (' + data.subcategory + ')' : ''),
    '📝 Descripción: ' + data.description,
    '',
    '📦 Plan Seleccionado: ' + planName,
    '�� Valor: ' + valorStr,
    '💳 Método de Pago: ' + paymentMethod,
    data.paymentReference ? '🔢 Referencia Pago: ' + data.paymentReference : null,
    data.paymentReceiptUrl ? '🧾 Comprobante de Pago: ' + data.paymentReceiptUrl : null,
    '',
    '🎨 Creación de Recursos solicitada: ' + imagenesStr,
    data.images?.stylePreference ? '✨ Estilo preferido: ' + data.images.stylePreference : null,
    '',
    '--- ENLACES DE ARCHIVOS SUBIDOS ---',
    data.images?.logoUrl ? '🖼️ Logo: ' + data.images.logoUrl : null,
    data.images?.bannerUrl ? '🖼️ Banner: ' + data.images.bannerUrl : null,
    data.products?.templateFileUrl ? '📄 Catálogo: ' + data.products.templateFileUrl : null,
    (data.products?.productPhotosUrls && data.products.productPhotosUrls.length > 0) 
      ? '📸 Fotos (' + data.products.productPhotosUrls.length + '):\\n' + data.products.productPhotosUrls.join('\\n')
      : null,
    '',
    '🔗 Ver solicitud completa en el panel:',
    panelLink,
    '========================================'
  ].filter(line => line !== null).join('\\n');

  try {
    await db.collection('contactMessages').add({
      name: data.businessName,
      email: data.email || 'no-email@markix.app',
      phone: data.phone,
      whatsapp: data.phone,
      subject: 'Nueva Solicitud: ' + data.businessName + ' [' + planName + ']',
      body: lineasCuerpo,
      message: lineasCuerpo,
      solicitudId: newDocRef.id,
      module: 'solicitudes-negocio',
      read: false,
      isResolved: false,
      createdAt: now
    });
  } catch (e) {
    console.error('Error creando notificación superadmin:', e);
  }

  // 3. MENSAJE Y URL DE WHATSAPP AL CLIENTE (https://wa.me/...)
  let targetPhone = (config.adminWhatsAppNumber || '573228831634').replace(/[^0-9]/g, '');
  if (!targetPhone) targetPhone = '573228831634';
  if (targetPhone.length === 10 && !targetPhone.startsWith('57')) {
    targetPhone = '57' + targetPhone;
  }

  const resumenMensajeWa = [
    '🔔 *Nueva Solicitud de Negocio - Markix*',
    '',
    '🏢 *Negocio:* ' + data.businessName,
    '📞 *Teléfono:* ' + data.phone,
    '📍 *Dirección:* ' + data.address,
    '🏷️ *Categoría:* ' + data.category,
    '📦 *Plan:* ' + planName + ' (' + valorStr + ')',
    '💳 *Pago:* ' + paymentMethod,
    data.paymentReference ? '🔢 *Ref Pago:* ' + data.paymentReference : null,
    data.paymentReceiptUrl ? '🧾 *Comprobante:* ' + data.paymentReceiptUrl : null,
    '🎨 *Creación imágenes:* ' + imagenesStr,
    '',
    '🔗 *Enlace al Panel:*',
    panelLink
  ].filter(Boolean).join('\\n');

  // Limitar longitud para evitar cortes en wa.me
  const mensajeFinalWa = resumenMensajeWa.length > 1500 ? resumenMensajeWa.slice(0, 1450) + '\\n\\n🔗 ' + panelLink : resumenMensajeWa;
  const whatsappUrl = 'https://wa.me/' + targetPhone + '?text=' + encodeURIComponent(mensajeFinalWa);

  // 4. WHAPI en Servidor (bot interno de alertas)
  let whatsappResult = { success: false, error: 'No configurado' };
  if (config.adminWhatsAppNumber) {
    try {
      whatsappResult = await enviarWhatsAppSolicitud({
        toPhone: targetPhone,
        template: mensajeFinalWa,
        variables: {
          nombre: data.businessName,
          telefono: data.phone,
          categoria: data.category,
          imagenes: imagenesStr,
          enlace: panelLink
        }
      });

      await newDocRef.update({
        whatsappStatus: whatsappResult.success ? 'sent' : 'failed',
        whatsappError: whatsappResult.error || null
      });
    } catch (e: any) {
      console.warn('WHAPI Server-side dispatch warning:', e.message);
    }
  }

  return { id: newDocRef.id, config, whatsappResult, whatsappUrl };
}`;

// Reemplazar la función crearSolicitud en solicitudes-service.ts
const startMarker = 'export async function crearSolicitud(';
const endMarker = 'export async function reenviarWhatsAppSolicitud(';
const startIndex = serviceContent.indexOf(startMarker);
const endIndex = serviceContent.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  serviceContent = serviceContent.slice(0, startIndex) + updatedCrearSolicitud + '\n\n' + serviceContent.slice(endIndex);
  backupAndWrite(servicePath, serviceContent);
} else {
  console.error('[ERROR] No se pudieron encontrar los marcadores en solicitudes-service.ts');
}

// 2. route.ts: devolver whatsappUrl
const routePath = 'src/app/api/solicitudes-negocio/route.ts';
let routeContent = fs.readFileSync(routePath, 'utf8');

routeContent = routeContent.replace(
  'return NextResponse.json({\n      success: true,\n      solicitudId: resultado.id,',
  'return NextResponse.json({\n      success: true,\n      solicitudId: resultado.id,\n      whatsappUrl: resultado.whatsappUrl,'
);
backupAndWrite(routePath, routeContent);

// 3. public-form.tsx: Apertura síncrona de WhatsApp + Botón Verde WhatsApp + Botón respaldo
const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
let formContent = fs.readFileSync(formPath, 'utf8');

// Modificar handleSubmit para abrir popup sincrónico
const oldSubmitStart = 'const handleSubmit = async (e: React.FormEvent) => {';
const newSubmitBlock = `const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (description.length > 150) {
      setErrorMessage('La descripción no puede superar los 150 caracteres.');
      return;
    }

    // Apertura síncrona dentro del click para evitar bloqueo de ventanas emergentes del navegador
    let popupWin: Window | null = null;
    try {
      popupWin = window.open('', '_blank');
    } catch (e) {
      console.warn('Popup bloqueado inicialmente:', e);
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('businessName', businessName);
      fd.append('phone', phone);
      fd.append('address', address);
      fd.append('email', email);
      fd.append('category', category);
      fd.append('subcategory', subcategory);
      fd.append('description', description);

      if (currentPlan) {
        fd.append('planId', currentPlan.id);
      }
      if (isPaidPlan) {
        fd.append('paymentMethod', selectedPaymentMethod || 'Por coordinar');
        fd.append('paymentReference', paymentReference);
        if (paymentReceipt) fd.append('paymentReceipt', paymentReceipt);
      }

      fd.append('social_instagram', socialInstagram);
      fd.append('social_facebook', socialFacebook);
      fd.append('social_tiktok', socialTiktok);
      fd.append('social_youtube', socialYoutube);

      fd.append('noLogoCreateForMe', String(noLogoCreateForMe));
      if (logoFile && !noLogoCreateForMe) fd.append('logoFile', logoFile);
      fd.append('noBannerCreateForMe', String(noBannerCreateForMe));
      if (bannerFile && !noBannerCreateForMe) fd.append('bannerFile', bannerFile);
      fd.append('stylePreference', stylePreference);

      if (templateFile) fd.append('templateFile', templateFile);
      fd.append('noProductsPhotosCreateForMe', String(noProductsPhotosCreateForMe));
      productPhotos.forEach(p => fd.append('productPhotos', p));

      fd.append('_hp_website', hpWebsite);

      const res = await fetch('/api/solicitudes-negocio', {
        method: 'POST',
        body: fd
      });

      const resJson = await res.json();
      if (!res.ok) {
        if (popupWin && !popupWin.closed) popupWin.close();
        throw new Error(resJson.error || 'Ocurrió un error al enviar el formulario.');
      }

      // Redirigir la ventana abierta a WhatsApp
      if (resJson.whatsappUrl) {
        if (popupWin && !popupWin.closed) {
          popupWin.location.href = resJson.whatsappUrl;
        } else {
          // Si el navegador bloqueó la ventana, intentar redirigir
          window.location.href = resJson.whatsappUrl;
        }
      }

      setSuccessData({
        message: resJson.message || config.confirmationMessage,
        id: resJson.solicitudId,
        plan: currentPlan,
        isPaid: isPaidPlan,
        paymentMethod: selectedPaymentMethod,
        whatsappUrl: resJson.whatsappUrl
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      if (popupWin && !popupWin.closed) popupWin.close();
      setErrorMessage(err.message || 'Error de conexión. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };`;

const submitStartIndex = formContent.indexOf(oldSubmitStart);
const submitEndMarker = 'if (loadingConfig) {';
const submitEndIndex = formContent.indexOf(submitEndMarker);

if (submitStartIndex !== -1 && submitEndIndex !== -1) {
  formContent = formContent.slice(0, submitStartIndex) + newSubmitBlock + '\n\n  ' + formContent.slice(submitEndIndex);
}

// Agregar botón WhatsApp en la pantalla de éxito
const successButtonsMarker = '<div>\n          <button\n            onClick={() => window.location.reload()}';
const successButtonsReplacement = `<div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {successData.whatsappUrl && (
            <a
              href={successData.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              Abrir WhatsApp
            </a>
          )}
          <button
            onClick={() => window.location.reload()}`;

formContent = formContent.replace(successButtonsMarker, successButtonsReplacement);

// Modificar el botón de envío al final
const submitButtonMarker = '<button\n          type="submit"\n          disabled={submitting}\n          style={{ backgroundColor: config.branding?.buttonColor || \'#0284c7\' }}';
const newSubmitButton = `<button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[50px] px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.99]"`;

formContent = formContent.replace(submitButtonMarker, newSubmitButton);

// Texto del botón
formContent = formContent.replace(
  "'Enviar información de mi negocio'",
  `'Enviar información de mi negocio por WhatsApp'`
);

// Agregar icono SVG de WhatsApp dentro del botón cuando no está submitting
formContent = formContent.replace(
  `: (\n            'Enviar información de mi negocio por WhatsApp'\n          )`,
  `: (
            <>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Enviar información de mi negocio por WhatsApp</span>
            </>
          )`
);

backupAndWrite(formPath, formContent);

console.log('==============================================');
console.log('CORRECCIONES APLICADAS CON ÉXITO');
console.log('==============================================');
