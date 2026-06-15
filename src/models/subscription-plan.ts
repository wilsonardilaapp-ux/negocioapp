
import { z } from 'zod';

export const PlanLimitsSchema = z.object({
  products: z.number({ description: "Número de productos permitidos. -1 para ilimitado." }),
  blogPosts: z.number({ description: "Número de posts de blog permitidos. -1 para ilimitado." }),
  landingPages: z.number({ description: "Número de landing pages permitidas. -1 para ilimitado." }),
  promotions: z.number({ description: "Número de promociones permitidas. -1 para ilimitado." }).default(0),
  coupons: z.number({ description: "Número de cupones permitidos. -1 para ilimitado." }).default(0),
  orders: z.number({ description: "Número de pedidos permitidos por mes. -1 para ilimitado." }).default(-1),
  suggestions: z.number({ description: "Número de reglas de sugerencia permitidas. -1 para ilimitado." }).default(0),
});
export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const SubscriptionPlanSchema = z.object({
  id: z.string().min(1, { message: "El ID es requerido." }).describe("ID único del plan (ej. 'pro'). Será el ID del documento."),
  name: z.string().min(1, { message: "El nombre es requerido." }).describe("Nombre del plan para mostrar al usuario (ej. 'Plan Profesional')."),
  description: z.string().min(1, { message: "La descripción es requerida." }).describe("Descripción corta del plan."),
  price: z.number().min(0, { message: "El precio debe ser 0 o mayor." }).describe("Precio mensual en USD (ej. 29)."),
  stripePriceId: z.string().min(1, { message: "El ID de precio de Stripe es requerido." }).regex(/^price_/, { message: "Debe ser un ID de precio de Stripe válido (ej. price_...)." }).describe("El ID del precio correspondiente en Stripe."),
  isMostPopular: z.boolean().optional().describe("Marcar para destacar el plan."),
  isActive: z.boolean().default(true).describe("Define si el plan está disponible para nuevas suscripciones."),
  features: z.array(z.object({ 
    value: z.string().min(1, 'La característica no puede estar vacía.'),
    displayOrder: z.number().optional()
  })).describe("Lista de características clave para la página de precios."),
  limits: PlanLimitsSchema,
});

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;

export const DefaultSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Plan Gratuito',
    description: 'Para empezar y probar la plataforma.',
    price: 0,
    stripePriceId: 'price_free_placeholder',
    isMostPopular: false,
    isActive: true,
    features: [
      { value: '10 productos en catálogo', displayOrder: 0 },
      { value: '5 posts de blog', displayOrder: 1 },
      { value: '1 Landing Page', displayOrder: 2 },
      { value: 'Soporte base', displayOrder: 3 },
      { value: 'Pedidos por mes : 21', displayOrder: 4 },
      { value: 'Sugerencias: 2', displayOrder: 5 },
    ],
    limits: {
      products: 10,
      blogPosts: 5,
      landingPages: 1,
      promotions: 2,
      coupons: 2,
      orders: 21,
      suggestions: 2,
    }
  },
  {
    id: 'pro',
    name: 'Plan Profesional',
    description: 'Ideal para negocios en crecimiento.',
    price: 29,
    stripePriceId: 'price_pro_placeholder',
    isMostPopular: true,
    isActive: true,
    features: [
      { value: 'Productos ilimitados', displayOrder: 0 },
      { value: 'Posts de blog ilimitados', displayOrder: 1 },
      { value: 'Landing Pages ilimitadas', displayOrder: 2 },
      { value: 'Soporte prioritario', displayOrder: 3 },
      { value: 'Módulo de Sugerencias IA', displayOrder: 4 },
    ],
    limits: {
      products: -1,
      blogPosts: -1,
      landingPages: -1,
      promotions: -1,
      coupons: -1,
      orders: -1,
      suggestions: -1,
    }
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    description: 'Soluciones avanzadas para grandes empresas.',
    price: 99,
    stripePriceId: 'price_enterprise_placeholder',
    isMostPopular: false,
    isActive: true,
    features: [
      { value: 'Todo lo del plan PRO', displayOrder: 0 },
      { value: 'Acceso a la API', displayOrder: 1 },
      { value: 'Soporte dedicado 24/7', displayOrder: 2 },
      { value: 'Onboarding personalizado', displayOrder: 3 },
      { value: 'Multi-usuario (próximamente)', displayOrder: 4 },
    ],
    limits: {
      products: -1,
      blogPosts: -1,
      landingPages: -1,
      promotions: -1,
      coupons: -1,
      orders: -1,
      suggestions: -1,
    }
  },
];
