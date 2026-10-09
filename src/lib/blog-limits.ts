/**
 * Utilidades unificadas para límites de Blog Posts
 */

export interface BlogLimitResult {
  limit: number;
  used: number;
  isUnlimited: boolean;
  canCreate: boolean;
}

/**
 * Normaliza y extrae el límite de blog posts desde cualquier objeto de límites
 * Soporta: "Blog Posts", "blog_posts", "blogPosts", "blog-posts"
 */
export function extractBlogLimitValue(limitsObj: any): { limit: number; isUnlimited: boolean } {
  if (!limitsObj || typeof limitsObj !== 'object') {
    console.warn('[blog-limits] Objeto de límites no válido o inexistente. Usando fallback seguro (0).', limitsObj);
    return { limit: 0, isUnlimited: false };
  }

  // Buscar claves normalizadas
  const rawValue =
    limitsObj.blogPosts !== undefined ? limitsObj.blogPosts :
    limitsObj['Blog Posts'] !== undefined ? limitsObj['Blog Posts'] :
    limitsObj.blog_posts !== undefined ? limitsObj.blog_posts :
    limitsObj['blog-posts'] !== undefined ? limitsObj['blog-posts'] :
    undefined;

  // Regla estricta: isUnlimited = true SOLO si es explícitamente null o -1
  if (rawValue === null || rawValue === -1) {
    return { limit: -1, isUnlimited: true };
  }

  const parsed = Number(rawValue);

  if (rawValue === undefined || isNaN(parsed) || parsed === 0) {
    if (parsed === 0) {
      return { limit: 0, isUnlimited: false };
    }
    console.warn('[blog-limits] Clave de blog posts inexistente o no definida. Usando fallback seguro (0).', limitsObj);
    return { limit: 0, isUnlimited: false };
  }

  return { limit: parsed, isUnlimited: false };
}

/**
 * Función de servidor para consultar el límite y uso de blog posts de un negocio
 */
export async function getBusinessBlogLimitServer(db: any, businessId: string): Promise<BlogLimitResult> {
  // 1. Contar posts actuales del negocio
  const postsSnap = await db.collection('blog_posts')
    .where('businessId', '==', businessId)
    .count()
    .get();
  const used = postsSnap.data().count;

  // 2. Obtener datos del negocio y suscripción
  const businessRef = db.collection('businesses').doc(businessId);
  const businessSnap = await businessRef.get();
  const businessData = businessSnap.exists ? businessSnap.data() : null;

  const subSnap = await businessRef.collection('subscription').doc('current').get();
  const subData = subSnap.exists ? subSnap.data() : null;

  const planIdOrName = subData?.plan || businessData?.planName || '';

  let planLimits: any = null;

  if (planIdOrName) {
    // Buscar en hybrid_plans
    const hybridSnap = await db.collection('hybrid_plans').doc(planIdOrName).get();
    if (hybridSnap.exists) {
      planLimits = hybridSnap.data()?.limits;
    } else {
      const querySnap = await db.collection('hybrid_plans').where('name', '==', planIdOrName).limit(1).get();
      if (!querySnap.empty) {
        planLimits = querySnap.docs[0].data()?.limits;
      } else {
        const querySlug = await db.collection('hybrid_plans').where('slug', '==', planIdOrName).limit(1).get();
        if (!querySlug.empty) {
          planLimits = querySlug.docs[0].data()?.limits;
        }
      }
    }

    // Si no está en hybrid_plans, buscar en plans regulares
    if (!planLimits) {
      const regSnap = await db.collection('plans').doc(planIdOrName).get();
      if (regSnap.exists) {
        planLimits = regSnap.data()?.limits;
      } else {
        const queryReg = await db.collection('plans').where('name', '==', planIdOrName).limit(1).get();
        if (!queryReg.empty) {
          planLimits = queryReg.docs[0].data()?.limits;
        }
      }
    }
  }

  const { limit: baseLimit, isUnlimited } = extractBlogLimitValue(planLimits);

  if (isUnlimited) {
    return { limit: -1, used, isUnlimited: true, canCreate: true };
  }

  // Sumar límites extra si existen
  const extras = businessData?.limitesExtra || {};
  const extraVal = Number(extras.blogPosts || extras['Blog Posts'] || extras.blog_posts || 0);
  const totalLimit = Math.max(0, baseLimit + extraVal);

  return {
    limit: totalLimit,
    used,
    isUnlimited: false,
    canCreate: used < totalLimit,
  };
}
