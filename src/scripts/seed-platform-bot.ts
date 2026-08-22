
/**
 * Script de ACTUALIZACIÓN, PURGA Y SINCRONIZACIÓN (seed) para businesses/platform-bot.
 *
 * Realiza una limpieza profunda de la subcolección 'products' para eliminar planes obsoletos
 * e inyecta la nueva estructura de planes híbridos oficiales de Markix.
 */

import { getAdminFirestore } from '@/firebase/server-init';

async function seedPlatformBot() {
  const db = await getAdminFirestore();
  const platformRef = db.collection('businesses').doc('platform-bot');

  console.log('🚀 Iniciando purga y sincronización total de datos para platform-bot...');

  // --- 1. PURGA TOTAL DE PRODUCTOS FANTASMA (Starter, Pro, Enterprise) ---
  const productsSubColRef = platformRef.collection('products');
  const oldProductsSnap = await productsSubColRef.get();
  
  if (!oldProductsSnap.empty) {
    const purgeBatch = db.batch();
    oldProductsSnap.forEach(doc => purgeBatch.delete(doc.ref));
    await purgeBatch.commit();
    console.log(`🧹 Se han eliminado ${oldProductsSnap.size} productos antiguos de la subcolección.`);
  }

  // --- 2. DEFINICIÓN DE LOS 4 PLANES HÍBRIDOS OFICIALES ---
  const officialPlans = [
    {
      id: 'plan-gratis',
      businessId: 'platform-bot',
      name: 'Plan Gratis / Inicio',
      price: 0,
      category: 'Planes',
      description: 'Plan Híbrido: Tarifa base $0/mes + 15% de comisión por cada pedido recibido a través de la plataforma.',
      stock: 9999,
      images: [],
      rating: 5,
      ratingCount: 1,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'plan-basico',
      businessId: 'platform-bot',
      name: 'Plan Básico',
      price: 19900,
      category: 'Planes',
      description: 'Plan Híbrido: Tarifa base $19.900/mes + 10% de comisión por cada pedido recibido. Incluye asistente WhatsApp WHAPI.',
      stock: 9999,
      images: [],
      rating: 5,
      ratingCount: 1,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'plan-estandar',
      businessId: 'platform-bot',
      name: 'Plan Estándar',
      price: 39900,
      category: 'Planes',
      description: 'Plan Híbrido: Tarifa base $39.900/mes + 9% de comisión por cada pedido recibido. Incluye asistente YCloud v2 y Fidelización.',
      stock: 9999,
      images: [],
      rating: 5,
      ratingCount: 1,
      updatedAt: new Date().toISOString()
    },
    {
      id: 'plan-profesional',
      businessId: 'platform-bot',
      name: 'Plan Profesional',
      price: 69900,
      category: 'Planes',
      description: 'Plan Híbrido: Tarifa base $69.900/mes + 8% de comisión por cada pedido recibido. Incluye Catálogo Ilimitado y Motor de Sugerencias IA.',
      stock: 9999,
      images: [],
      rating: 5,
      ratingCount: 1,
      updatedAt: new Date().toISOString()
    }
  ];

  // --- 3. ACTUALIZACIÓN DEL DOCUMENTO RAÍZ (Contexto del Bot) ---
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

  // --- 4. CONFIGURACIÓN DEL CHATBOT (Capa 1: main) ---
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

  // --- 5. FAQs Y RESPUESTAS (Capa 1: responses) ---
  const responsesRef = configRef.collection('responses');
  const oldResponses = await responsesRef.get();
  const respBatch = db.batch();
  oldResponses.forEach(doc => respBatch.delete(doc.ref));
  await respBatch.commit();

  const faqs = [
    {
      question: 'cuanto cuesta',
      answer: 'Markix ofrece un modelo híbrido justo. Contamos con 4 planes: 1) Gratis: $0 base + 15% comisión. 2) Básico: $19.900 base + 10% comisión. 3) Estándar: $39.900 base + 9% comisión. 4) Profesional: $69.900 base + 8% comisión.',
      isActive: true,
    },
    {
      question: 'comisiones',
      answer: 'Nuestras comisiones son por éxito: solo pagas cuando vendes. Van desde el 15% (Gratis) hasta el 8% (Profesional). El porcentaje se aplica sobre el valor total de los pedidos recibidos.',
      isActive: true,
    },
    {
      question: 'registro',
      answer: 'Es muy simple. Haz clic en "Empezar Gratis" arriba, ingresa tus datos y tu asistente virtual estará listo para atender a tus clientes en minutos.',
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

  // --- 6. SINCRONIZACIÓN ATÓMICA DE PRODUCTOS-PLAN ---
  const finalBatch = db.batch();

  // A. Actualizar Catálogo denormalizado (Para lecturas rápidas)
  finalBatch.set(platformRef.collection('publicData').doc('catalog'), {
    headerConfig: {
      businessInfo: {
        name: 'Markix Platform',
        address: 'Soporte Global Online',
        phone: '3228831634'
      }
    },
    products: officialPlans,
    updatedAt: new Date().toISOString()
  });

  // B. Actualizar subcolección 'products' (Para búsquedas individuales y RAG)
  officialPlans.forEach(plan => {
    const docRef = productsSubColRef.doc(plan.id);
    finalBatch.set(docRef, plan);
  });

  await finalBatch.commit();

  console.log('✅ Sincronización de platform-bot FINALIZADA. Productos fantasma eliminados.');
}

seedPlatformBot()
  .then(() => console.log('Proceso terminado.'))
  .catch((err) => console.error('❌ Error fatal en el seed:', err));
