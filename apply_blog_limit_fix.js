const fs = require('fs');
const path = require('path');

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Respaldo creado: ${backupPath}`);
  }
}

console.log('🚀 Iniciando aplicación quirúrgica de la solución...\n');

// 1. CREAR src/lib/blog-limits.ts (ARCHIVO NUEVO)
const blogLimitsLibPath = path.join('src', 'lib', 'blog-limits.ts');
const blogLimitsContent = `/**
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
`;

fs.writeFileSync(blogLimitsLibPath, blogLimitsContent, 'utf8');
console.log(`✅ Archivo creado: ${blogLimitsLibPath}`);

// 2. ACTUALIZAR src/hooks/useSubscription.ts (NORMALIZACIÓN DE CLAVE)
const subHookPath = path.join('src', 'hooks', 'useSubscription.ts');
backupFile(subHookPath);
let subHookContent = fs.readFileSync(subHookPath, 'utf8');

// Insertar import si no existe
if (!subHookContent.includes('extractBlogLimitValue')) {
  subHookContent = `import { extractBlogLimitValue } from '@/lib/blog-limits';\n` + subHookContent;
}

// Asegurar normalización al computar baseLimits
const oldBaseLimits = 'const baseLimits = details?.limits ?? defaultLimits;';
const newBaseLimits = `const baseLimits = details?.limits ?? defaultLimits;
    const blogLimitParsed = extractBlogLimitValue(details?.limits ?? defaultLimits);`;

if (subHookContent.includes(oldBaseLimits) && !subHookContent.includes('blogLimitParsed')) {
  subHookContent = subHookContent.replace(oldBaseLimits, newBaseLimits);
}

// Reemplazar la asignación de blogPosts en mergedLimits
const oldMergedBlogPosts = 'blogPosts: baseLimits.blogPosts === -1 ? -1 : (baseLimits.blogPosts + (extras.blogPosts || 0)),';
const newMergedBlogPosts = `blogPosts: blogLimitParsed.isUnlimited ? -1 : (blogLimitParsed.limit + (Number(extras.blogPosts || extras['Blog Posts'] || extras.blog_posts || 0))),`;

if (subHookContent.includes(oldMergedBlogPosts)) {
  subHookContent = subHookContent.replace(oldMergedBlogPosts, newMergedBlogPosts);
}

fs.writeFileSync(subHookPath, subHookContent, 'utf8');
console.log(`✅ Archivo actualizado: ${subHookPath}`);

// 3. ACTUALIZAR src/app/(dashboard)/dashboard/blog/create/page.tsx
const blogCreatePath = path.join('src', 'app', '(dashboard)', 'dashboard', 'blog', 'create', 'page.tsx');
backupFile(blogCreatePath);
let blogCreateContent = fs.readFileSync(blogCreatePath, 'utf8');

// Asegurar que limits.blogPosts se evalúe correctamente sin depender de isFree
// Reemplazar el bloqueo de límite alcanzado
blogCreateContent = blogCreateContent.replace(
  /if \(isFree && !canAddBlogPosts\(totalPosts\)\) \{/g,
  `const isUnlimitedPosts = limits.blogPosts === -1;\n    const isLimitReached = !isUnlimitedPosts && totalPosts >= limits.blogPosts;\n    if (isLimitReached) {`
);

// Reemplazar el useEffect preventivo
blogCreateContent = blogCreateContent.replace(
  /if \(!isLoading && isFree && !canAddBlogPosts\(totalPosts\)\)/g,
  `if (!isLoading && limits.blogPosts !== -1 && !canAddBlogPosts(totalPosts))`
);

// Reemplazar la descripción de la barra de progreso
const oldProgressText = `{isFree \n                                    ? \`Has creado \${totalPosts} de \${limits.blogPosts} posts permitidos.\`\n                                    : 'Tu plan incluye posts ilimitados ∞'}`;
const newProgressText = `{limits.blogPosts === -1\n                                    ? 'Tu plan incluye posts ilimitados ∞'\n                                    : \`Has creado \${totalPosts} de \${limits.blogPosts} posts permitidos.\`}`;

blogCreateContent = blogCreateContent.replace(oldProgressText, newProgressText);

// Si los saltos de línea variaban, reemplazar con regex flexible
blogCreateContent = blogCreateContent.replace(
  /\{isFree\s*\?\s*`Has creado \$\{totalPosts\} de \$\{limits\.blogPosts\} posts permitidos\.`\s*:\s*'Tu plan incluye posts ilimitados ∞'\}/g,
  `{limits.blogPosts === -1 ? 'Tu plan incluye posts ilimitados ∞' : \`Has creado \${totalPosts} de \${limits.blogPosts} posts permitidos.\`}`
);

// Reemplazar la barra de progreso
blogCreateContent = blogCreateContent.replace(
  /<Progress value=\{isFree \? \(totalPosts \/ limits\.blogPosts\) \* 100 : 100\} \/>/g,
  `<Progress value={limits.blogPosts === -1 ? 100 : Math.min(100, (totalPosts / Math.max(1, limits.blogPosts)) * 100)} />`
);

// Deshabilitar el botón Guardar Post si se alcanzó el límite
blogCreateContent = blogCreateContent.replace(
  /<Button type="submit" disabled=\{isPending\}>/g,
  `<Button type="submit" disabled={isPending || (limits.blogPosts !== -1 && totalPosts >= limits.blogPosts)}>`
);

fs.writeFileSync(blogCreatePath, blogCreateContent, 'utf8');
console.log(`✅ Archivo actualizado: ${blogCreatePath}`);

// 4. ACTUALIZAR src/app/(dashboard)/dashboard/blog/page.tsx (DESHABILITAR BOTÓN "Crear Nuevo Post")
const blogPagePath = path.join('src', 'app', '(dashboard)', 'dashboard', 'blog', 'page.tsx');
backupFile(blogPagePath);
let blogPageContent = fs.readFileSync(blogPagePath, 'utf8');

// Deshabilitar botón efectivamente si canCreate es falso
const oldCreateButton = `<Button asChild disabled={!canCreate}>
            <Link href="/dashboard/blog/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Nuevo Post
            </Link>
          </Button>`;

const newCreateButton = `{canCreate ? (
            <Button asChild>
              <Link href="/dashboard/blog/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Nuevo Post
              </Link>
            </Button>
          ) : (
            <Button disabled title="Límite de posts alcanzado para tu plan">
              <PlusCircle className="mr-2 h-4 w-4" />
              Límite Alcanzado
            </Button>
          )}`;

if (blogPageContent.includes(oldCreateButton)) {
  blogPageContent = blogPageContent.replace(oldCreateButton, newCreateButton);
} else {
  // Reemplazo tolerante de espacios
  blogPageContent = blogPageContent.replace(
    /<Button asChild disabled=\{!canCreate\}>\s*<Link href="\/dashboard\/blog\/create">\s*<PlusCircle className="mr-2 h-4 w-4" \/>\s*Crear Nuevo Post\s*<\/Link>\s*<\/Button>/g,
    newCreateButton
  );
}

fs.writeFileSync(blogPagePath, blogPageContent, 'utf8');
console.log(`✅ Archivo actualizado: ${blogPagePath}`);

// 5. ACTUALIZAR src/actions/blog.ts (VALIDACIÓN EN BACKEND)
const blogActionsPath = path.join('src', 'actions', 'blog.ts');
backupFile(blogActionsPath);
let blogActionsContent = fs.readFileSync(blogActionsPath, 'utf8');

// Agregar import
if (!blogActionsContent.includes('getBusinessBlogLimitServer')) {
  blogActionsContent = `import { getBusinessBlogLimitServer } from '@/lib/blog-limits';\n` + blogActionsContent;
}

// Agregar validación por negocio en createPost
const backendValidationTarget = `    if (!rawData.title || !rawData.content || !rawData.imageUrl) {
        return { success: false, error: 'Título, contenido y URL de imagen son requeridos.' };
    }`;

const backendValidationCode = `    if (!rawData.title || !rawData.content || !rawData.imageUrl) {
        return { success: false, error: 'Título, contenido y URL de imagen son requeridos.' };
    }

    // Validación de límite del negocio si aplica
    if (rawData.businessId) {
        try {
            const limitInfo = await getBusinessBlogLimitServer(firestore, rawData.businessId);
            if (!limitInfo.isUnlimited && limitInfo.used >= limitInfo.limit) {
                return {
                    success: false,
                    error: \`Has alcanzado el límite de posts de tu plan (\${limitInfo.used}/\${limitInfo.limit}). Actualiza tu plan para crear más artículos.\`
                };
            }
        } catch (limitErr: any) {
            console.error('[blog-actions] Error al verificar límite del negocio:', limitErr);
        }
    }`;

if (blogActionsContent.includes(backendValidationTarget) && !blogActionsContent.includes('getBusinessBlogLimitServer(firestore')) {
  blogActionsContent = blogActionsContent.replace(backendValidationTarget, backendValidationCode);
}

fs.writeFileSync(blogActionsPath, blogActionsContent, 'utf8');
console.log(`✅ Archivo actualizado: ${blogActionsPath}`);

console.log('\n🎉 ¡Todos los cambios han sido aplicados con éxito!');
