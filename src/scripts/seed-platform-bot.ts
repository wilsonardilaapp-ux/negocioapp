/**
 * Script de UNA SOLA EJECUCIÓN (seed) para crear businesses/platform-bot.
 *
 * Uso: ejecutar una vez con acceso a las credenciales de Firebase Admin.
 *
 * Es idempotente: si platform-bot ya existe con isPlatformBot=true,
 * no lo sobreescribe.
 */

import { getAdminFirestore } from '@/firebase/server-init';

async function seedPlatformBot() {
  const db = await getAdminFirestore();
  const platformRef = db.collection('businesses').doc('platform-bot');

  const existing = await platformRef.get();
  if (existing.exists && existing.data()?.isPlatformBot === true) {
    console.log('platform-bot ya existe y está marcado. No se sobreescribe. Saliendo.');
    return;
  }

  // --- 1. Documento raíz (Datos de plataforma) ---
  await platformRef.set({
    name: 'Markix Support',
    phone: '+57 322 883 1634',
    email: 'allseosoporte@gmail.com',
    description: 'El Empleado Digital con IA que trabaja por tu negocio las 24 horas. Markix automatiza tu catálogo, blog, reservas y fidelización.',
    isPlatformBot: true,
    category: 'Software SaaS',
    directoryEnabled: false, // Oculto del directorio público
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  // --- 2. Configuración del Chatbot (Capa 1: main) ---
  const configRef = platformRef.collection('publicMenuChatbot').doc('main');
  await configRef.set({
    assistantName: 'Asistente Markix',
    greetingMessage: '¡Hola! 👋 Soy el asistente oficial de Markix. ¿Te gustaría saber cómo podemos automatizar tu negocio hoy?',
    headerColor: '#4CAF50',
    buttonColor: '#4CAF50',
    secondaryColor: '#f8f9fa',
    textColor: '#000000',
    isActive: true,
    autoOpenDelay: 3,
    position: 'bottom-right'
  });

  // --- 3. FAQs (Capa 1: responses) ---
  const responsesRef = configRef.collection('responses');

  const faqs = [
    {
      question: 'cuanto cuesta',
      answer: 'Contamos con 4 planes híbridos (Pago base + % comisión por pedido). 1) Plan Gratis: $0/mes + 15%. 2) Plan Básico: $19.900/mes + 10%. 3) Plan Estándar: $39.900/mes + 9%. 4) Plan Profesional: $69.900/mes + 8%.',
      isActive: true,
    },
    {
      question: 'prueba gratis',
      answer: '¡Claro! El Plan Gratis / Inicio te permite arrancar sin costo fijo mensual, pagando solo el 15% de comisión por cada pedido exitoso que recibas.',
      isActive: true,
    },
    {
      question: 'como funciona',
      answer: 'Markix centraliza tu operación: creas un catálogo, activas un asistente con IA que atiende a tus clientes, gestionas reservas y recuperas ventas automáticas.',
      isActive: true,
    },
    {
      question: 'soporte',
      answer: 'Puedes escribirnos a allseosoporte@gmail.com o directamente a nuestro WhatsApp de soporte oficial.',
      isActive: true,
    },
    {
      question: 'registro',
      answer: 'Haz clic en el botón "Empezar Gratis" en la parte superior. Solo necesitas tu nombre y correo para activar tu primer negocio en minutos.',
      isActive: true,
    },
  ];

  for (const faq of faqs) {
    await responsesRef.add({
      ...faq,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // --- 4. Catálogo (Capa 3: planes como "productos" para la IA) ---
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
        description: 'Plan Híbrido: $0 de base mensual + 15% de comisión por cada pedido recibido.',
      },
      {
        id: 'plan-basico',
        name: 'Plan Básico',
        price: 19900,
        category: 'Planes',
        description: 'Plan Híbrido: $19.900 de base mensual + 10% de comisión por cada pedido recibido.',
      },
      {
        id: 'plan-estandar',
        name: 'Plan Estándar',
        price: 39900,
        category: 'Planes',
        description: 'Plan Híbrido: $39.900 de base mensual + 9% de comisión por cada pedido recibido.',
      },
      {
        id: 'plan-profesional',
        name: 'Plan Profesional',
        price: 69900,
        category: 'Planes',
        description: 'Plan Híbrido: $69.900 de base mensual + 8% de comisión por cada pedido recibido.',
      },
    ],
  });

  console.log('businesses/platform-bot (Tenant Markix) inicializado correctamente.');
}

seedPlatformBot()
  .then(() => {})
  .catch((err) => {
    console.error(err);
  });
