
import { getAdminFirestore } from '../firebase/server-init';

/**
 * Script de inicialización para el Bot de Plataforma (__platform__).
 * Ejecutar con: npx tsx src/scripts/seed-platform-bot.ts
 */
async function seedPlatformBot() {
  const db = await getAdminFirestore();
  const platformRef = db.collection('businesses').doc('__platform__');

  const existing = await platformRef.get();
  if (existing.exists && existing.data()?.isPlatformBot === true) {
    console.log('__platform__ ya existe y está marcado. No se sobreescribe. Saliendo.');
    return;
  }

  console.log('Iniciando creación de businesses/__platform__...');

  // --- 1. Documento raíz (Capa 2: datos del negocio) ---
  await platformRef.set({
    name: 'Markix',
    phone: '+57 322 883 1634',
    email: 'allseosoporte@gmail.com',
    description: 'El Empleado Digital con IA que trabaja por tu negocio las 24 horas',
    isPlatformBot: true,
    createdAt: new Date().toISOString(),
  });

  // --- 2. FAQs (Capa 1: respuestas manuales) ---
  const responsesRef = platformRef
    .collection('publicMenuChatbot')
    .doc('main')
    .collection('responses');

  const faqs = [
    {
      question: 'cuanto cuesta',
      answer: 'Ofrecemos tres planes principales: Plan Crecimiento (Gratis), Plan Profesional ($29 USD/mes) y Plan Empresarial ($99 USD/mes). También contamos con planes híbridos con comisión por venta según el volumen de tu negocio.',
      isActive: true,
    },
    {
      question: 'prueba gratis',
      answer: '¡Claro que sí! Puedes empezar hoy mismo con nuestro Plan Crecimiento totalmente gratis. No requiere tarjeta de crédito y te permite explorar las funcionalidades básicas de catálogos y pedidos.',
      isActive: true,
    },
    {
      question: 'como funciona',
      answer: 'Markix es tu Empleado Digital con IA que centraliza tu operación: atiende consultas en tu catálogo, recibe pedidos por WhatsApp, recomienda productos inteligentes, publica artículos en tu blog y gestiona tu inventario 24/7.',
      isActive: true,
    },
    {
      question: 'cancelar',
      answer: 'La flexibilidad es parte de nuestro servicio. Puedes cancelar tu suscripción en cualquier momento desde el panel de facturación en tu dashboard, sin multas ni contratos de permanencia.',
      isActive: true,
    },
    {
      question: 'contacto',
      answer: 'Estamos para ayudarte. Puedes escribirnos a nuestro WhatsApp de soporte +57 322 883 1634 o al correo oficial allseosoporte@gmail.com.',
      isActive: true,
    },
  ];

  for (const faq of faqs) {
    await responsesRef.add({
        ...faq,
        updatedAt: new Date().toISOString()
    });
  }

  // --- 3. Catálogo (Capa 3: planes presentados como productos) ---
  await platformRef.collection('publicData').doc('catalog').set({
    products: [
      {
        id: 'plan-free',
        name: 'Plan Crecimiento',
        price: 0,
        description: 'Ideal para emprendedores y nuevos negocios. Incluye catálogo digital básico, blog profesional y gestión centralizada de pedidos por WhatsApp.',
        category: 'Planes SaaS',
        images: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2026&auto=format&fit=crop'],
        rating: 5,
        ratingCount: 1,
      },
      {
        id: 'plan-pro',
        name: 'Plan Profesional',
        price: 29,
        description: 'Potencia tu negocio con Inteligencia Artificial. Incluye Asistente Virtual 24/7, Motor de sugerencias (Upsell/Cross-sell) y analíticas de tráfico detalladas.',
        category: 'Planes SaaS',
        images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'],
        rating: 5,
        ratingCount: 1,
      },
      {
        id: 'plan-enterprise',
        name: 'Plan Empresarial',
        price: 99,
        description: 'Control total y escalabilidad para grandes empresas. Incluye módulos de contabilidad, inventario Kardex, soporte dedicado 24/7 y acceso a la API.',
        category: 'Planes SaaS',
        images: ['https://images.unsplash.com/photo-1454165833767-027508658d61?q=80&w=2070&auto=format&fit=crop'],
        rating: 5,
        ratingCount: 1,
      },
    ],
    headerConfig: {
      businessInfo: {
        name: 'Markix Platform',
        address: 'Soporte Global Digital',
        phone: '+57 322 883 1634',
        email: 'allseosoporte@gmail.com'
      }
    },
    updatedAt: new Date().toISOString()
  });

  console.log('✅ Documento businesses/__platform__ y subcolecciones creados correctamente.');
}

seedPlatformBot()
  .then(() => {
    console.log('🚀 Seed exitoso.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error durante la ejecución del seed:', err);
    process.exit(1);
  });
