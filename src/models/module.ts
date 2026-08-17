export type Module = {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive';
    createdAt: string;
    limit?: number; // Límite de registros permitidos
    updatedAt?: string;
};

/**
 * Fuente de verdad única para los módulos base del sistema SaaS.
 * Se utiliza para el seeder y para inyectar opciones en el modal de gestión de negocios.
 */
export const DEFAULT_MODULES = [
  { id: 'catalogo', name: 'Catálogo de Productos', description: 'Permite a los negocios gestionar un catálogo digital con carrito de WhatsApp.', limit: -1 },
  { id: 'blog', name: 'Blog Profesional', description: 'Módulo de artículos y noticias para SEO y fidelización.', limit: 5 },
  { id: 'promotions', name: 'Promociones y Ofertas', description: 'Gestión de banners promocionales y cupones de descuento.', limit: 2 },
  { id: 'whapi-whatsapp', name: 'WHAPI (WhatsApp)', description: 'Proveedor de WhatsApp para envío de notificaciones y chatbot.', limit: -1 },
  { id: 'ycloud-whatsapp', name: 'YCloud (WhatsApp)', description: 'Proveedor de WhatsApp API v2 oficial para envío de notificaciones y chatbot.', limit: -1 },
  { id: 'google-analytics', name: 'Google Analytics', description: 'Integración de métricas avanzadas para la landing page.', limit: -1 },
  { id: 'business-directory', name: 'Directorio de Negocios', description: 'Módulo para listar el negocio en el directorio público de la plataforma.', limit: -1 },
  { id: 'chatbot-menu-publico', name: 'Chatbot Menú Público', description: 'Asistente virtual para el menú público que responde preguntas de los visitantes sobre productos, precios, horarios y promociones del negocio.', limit: -1 },
  { id: 'loyalty', name: 'Fidelización e Inteligencia (IA)', description: 'Sistema de puntos, ranking VIP, reseñas y recuperación automática de clientes mediante IA por WhatsApp.', limit: -1 },
  { id: 'contabilidad', name: 'Contabilidad', description: 'Módulo integral de gestión contable, plan de cuentas y asientos para el negocio.', limit: -1 },
  { id: 'inventario-kardex', name: 'Inventario Kardex', description: 'Control detallado de inventario, movimientos de entrada/salida y valución de stock.', limit: -1 },
  { id: 'pistola-escaner', name: 'Pistola Escáner', description: 'Configuración y gestión de lectores de códigos de barras para puntos de venta y bodega.', limit: -1 },
  { id: 'reservas-agendamiento', name: 'Reservas y Citas', description: 'Sistema de agendamiento online, gestión de profesionales y recordatorios automáticos.', limit: 30 },
];
