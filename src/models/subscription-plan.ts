import { z } from 'zod';

export const PlanLimitsSchema = z.object({
  products: z.number({ description: "Número de productos permitidos. -1 para ilimitado." }),
  blogPosts: z.number({ description: "Número de posts de blog permitidos. -1 para ilimitado." }),
  landingPages: z.number({ description: "Número de landing pages permitidas. -1 para ilimitado." }),
});
export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const SubscriptionPlanSchema = z.object({
  id: z.string().min(1, { message: "El ID es requerido." }).describe("ID único del plan (ej. 'pro'). Será el ID del documento."),
  name: z.string().min(1, { message: "El nombre es requerido." }).describe("Nombre del plan para mostrar al usuario (ej. 'Plan Profesional')."),
  description: z.string().min(1, { message: "La descripción es requerida." }).describe("Descripción corta del plan."),
  price: z.number().min(0, { message: "El precio debe ser 0 o mayor." }).describe("Precio mensual en USD (ej. 29)."),
  stripePriceId: z.string().min(1, { message: "El ID de precio de Stripe es requerido." }).regex(/^price_/, { message: "Debe ser un ID de precio de Stripe válido (ej. price_...)." }).describe("El ID del precio correspondiente en Stripe."),
  isMostPopular: z.boolean().optional().describe("Marcar para destacar el plan."),
  features: z.array(z.string()).describe("Lista de características clave para la página de precios."),
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
    features: [
      '10 productos en catálogo',
      '5 posts de blog',
      '1 Landing Page',
      'Soporte base',
    ],
    limits: {
      products: 10,
      blogPosts: 5,
      landingPages: 1,
    }
  },
  {
    id: 'pro',
    name: 'Plan Profesional',
    description: 'Ideal para negocios en crecimiento.',
    price: 29,
    stripePriceId: 'price_pro_placeholder',
    isMostPopular: true,
    features: [
      'Productos ilimitados',
      'Posts de blog ilimitados',
      'Landing Pages ilimitadas',
      'Soporte prioritario',
      'Módulo de Sugerencias IA'
    ],
    limits: {
      products: -1,
      blogPosts: -1,
      landingPages: -1,
    }
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    description: 'Soluciones avanzadas para grandes empresas.',
    price: 99,
    stripePriceId: 'price_enterprise_placeholder',
    isMostPopular: false,
    features: [
      'Todo lo del plan PRO',
      'Acceso a la API',
      'Soporte dedicado 24/7',
      'Onboarding personalizado',
      'Multi-usuario (próximamente)',
    ],
    limits: {
      products: -1,
      blogPosts: -1,
      landingPages: -1,
    }
  },
];
