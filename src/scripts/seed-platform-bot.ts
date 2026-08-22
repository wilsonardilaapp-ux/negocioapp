/**
 * Script de ACTUALIZACIÓN Y SINCRONIZACIÓN (seed) para businesses/platform-bot.
 *
 * Este script permite la sobrescritura forzada para garantizar que el catálogo
 * de la plataforma siempre esté sincronizado con los precios oficiales de Markix.
 */

import { getAdminFirestore } from '@/firebase/server-init';

async function seedPlatformBot() {
  const db = await getAdminFirestore();
  const platformRef = db.collection('businesses').doc('platform-bot');

  console.log('🚀 Iniciando sincronización forzada de datos para platform-bot...');

  // --- 1. Documento raíz (Datos de plataforma) ---
  // Actualizamos la descripción para que la IA tenga contexto claro del modelo híbrido
  await platformRef.set({
    name: 'Markix Support',
    phone: '+57 322 883 1634',
    email: 'allseosoporte@gmail.com',
    description: 'El Empleado Digital con IA que trabaja por tu negocio las 24 horas. Markix automatiza tu catálogo, blog, reservas y fidelización mediante un modelo híbrido de pago base + comisión por venta.',
    isPlatformBot: true,
    category: 'Software SaaS',
    directoryEnabled: false, 
    status: 'active',
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // --- 2. Configuración del Chatbot (Capa 1: main) ---
  const configRef = platformRef.collection('publicMenuChatbot').doc('main');
  await configRef.set({
    assistantName: 'Asistente Markix',
    greetingMessage: '¡Hola! 👋 Soy el asistente oficial de Markix. ¿Te gustaría saber cómo nuestros planes híbridos pueden automatizar tu negocio hoy?',
    headerColor: '#4CAF50',
    buttonColor: '#4CAF50',
    secondaryColor: '#f8f9fa',
    textColor: '#000000',
    isActive: true,
    autoOpenDelay: 3,
    position: 'bottom-right',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // --- 3. FAQs (Capa 1: responses) ---
  const responsesRef = configRef.collection('responses');
  
  // Purgar respuestas antiguas para evitar duplicados o info vieja
  const oldResponses = await responsesRef.get();
  const batch = db.batch();
  oldResponses.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  const faqs = [
    {
      question: 'cuanto cuesta',
      answer: 'Contamos con 4 planes híbridos diseñados para crecer contigo: 1) Plan Gratis: $0 base + 15% comisión. 2) Plan Básico: $19.900 base + 10% comisión. 3) Plan Estándar: $39.900 base + 9% comisión. 4) Plan Profesional: $69.900 base + 8% comisión.',
      isActive: true,
    },
    {
      question: 'comisiones',
      answer: 'Markix utiliza un modelo de éxito: pagas una pequeña tarifa base y una comisión por cada pedido generado. Si tú no vendes, nosotros no ganamos. Las comisiones van desde el 15% en el plan gratis hasta el 8% en el profesional.',
      isActive: true,
    },
    {
      question: 'registro',
      answer: 'Puedes empezar ahora mismo haciendo clic en el botón "Empezar Gratis" en la parte superior. Solo necesitas tu nombre y correo para activar tu asistente virtual en minutos.',
      isActive: true,
    },
    {
      question: 'plan basico',
      answer: 'El Plan Básico cuesta $19.900 pesos mensuales e incluye una comisión del 10% por pedido. Es ideal para negocios que ya tienen un flujo constante de ventas y quieren profesionalizar su atención.',
      isActive: true,
    }
  ];

  for (const faq of faqs) {
    await responsesRef.add({
      ...faq,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // --- 4. Catálogo de Planes (Capa 3: "productos" para la IA) ---
  // Sobrescribimos el catálogo completo para eliminar Starter/Pro antiguos
  await platformRef.collection('publicData').doc('catalog').set({
    headerConfig: {
      businessInfo: {
        name: 'Markix Platform',
        address: 'Soporte Global Online',
        phone: '3228831634'
      }
    },
    products: [
      {
        id: 'plan-gratis',
        name: 'Plan Gratis / Inicio',
        price: 0,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $0/mes + 15% de comisión por cada pedido recibido a través de la plataforma.',
      },
      {
        id: 'plan-basico',
        name: 'Plan Básico',
        price: 19900,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $19.900/mes + 10% de comisión por cada pedido recibido. Incluye asistente WhatsApp WHAPI.',
      },
      {
        id: 'plan-estandar',
        name: 'Plan Estándar',
        price: 39900,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $39.900/mes + 9% de comisión por cada pedido recibido. Incluye asistente YCloud v2 y Fidelización.',
      },
      {
        id: 'plan-profesional',
        name: 'Plan Profesional',
        price: 69900,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $69.900/mes + 8% de comisión por cada pedido recibido. Incluye Catálogo Ilimitado y Motor de Sugerencias IA.',
      },
    ],
    updatedAt: new Date().toISOString()
  });

  console.log('✅ Sincronización de businesses/platform-bot finalizada con éxito. Planes actualizados.');
}

seedPlatformBot()
  .then(() => {
      console.log('Proceso terminado.');
  })
  .catch((err) => {
    console.error('❌ Error fatal en el seed:', err);
  });
