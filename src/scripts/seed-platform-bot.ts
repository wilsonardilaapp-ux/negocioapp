/**
 * Script de UNA SOLA EJECUCIÓN (seed) para crear businesses/__platform__.
 *
 * Uso: ejecutar una vez con acceso a las credenciales de Firebase Admin
 * (las mismas que usa el proyecto en server-init.ts), luego eliminar o
 * mover este archivo fuera del build de producción. No es un endpoint
 * ni un componente de la app — es una herramienta de una sola vez.
 *
 * ANTES DE EJECUTAR:
 * - Reemplaza TODOS los valores marcados con TODO por tu información real.
 * - Revisa los precios de los planes: están en 0 como placeholder.
 *
 * Es idempotente: si __platform__ ya existe con isPlatformBot=true,
 * no lo sobreescribe (para no borrar datos que hayas cargado a mano después).
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

  // --- 1. Documento raíz (Capa 2: datos del negocio) ---
  await platformRef.set({
    name: 'Markix',
    phone: '+57 322 883 1634',
    email: 'aliseosoporte@gmail.com',
    description: 'El Empleado Digital con IA que trabaja por tu negocio las 24 horas',
    isPlatformBot: true,
    createdAt: new Date().toISOString(),
  });

  // --- 2. FAQs (Capa 1: responses) ---
  const responsesRef = platformRef
    .collection('publicMenuChatbot')
    .doc('main')
    .collection('responses');

  const faqs = [
    {
      question: 'cuanto cuesta',
      answer:
        'Tenemos planes Starter, Pro y Enterprise. TODO: resume aquí los precios reales o dirige al usuario a tu página de precios.',
      isActive: true,
    },
    {
      question: 'prueba gratis',
      answer: 'TODO: confirma tu política real de prueba gratuita (días, requiere tarjeta, etc).',
      isActive: true,
    },
    {
      question: 'como funciona',
      answer:
        'Markix es tu Empleado Digital con IA: atiende consultas, recibe pedidos, recomienda productos, publica contenido y trabaja 24/7 en tu catálogo.',
      isActive: true,
    },
    {
      question: 'cancelar',
      answer: 'TODO: agrega tu política real de cancelación de suscripción.',
      isActive: true,
    },
    {
      question: 'contacto',
      answer: 'Puedes escribirnos a aliseosoporte@gmail.com o al +57 322 883 1634.',
      isActive: true,
    },
  ];

  for (const faq of faqs) {
    await responsesRef.add(faq);
  }

  // --- 3. Catálogo (Capa 3: planes como "productos") ---
  await platformRef.collection('publicData').doc('catalog').set({
    products: [
      {
        name: 'Starter',
        price: 0, // TODO: precio real
        description: 'TODO: qué incluye el plan Starter',
      },
      {
        name: 'Pro',
        price: 0, // TODO: precio real
        description: 'TODO: qué incluye el plan Pro',
      },
      {
        name: 'Enterprise',
        price: null,
        description: 'Plan a medida — contactar a ventas',
      },
    ],
  });

  console.log('businesses/platform-bot creado correctamente.');
}

seedPlatformBot()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });