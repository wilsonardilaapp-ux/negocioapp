import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import fs from 'fs';

async function run() {
  console.log('=== [PASO 1] DIAGNÓSTICO: LISTADO GLOBAL /blog/global ===\n');

  // 1. Verificar si existe carpeta estática global
  const staticGlobal = 'src/app/(public)/blog/global';
  console.log(`1. ¿Existe ruta estática ${staticGlobal}?:`, fs.existsSync(staticGlobal) ? 'SÍ' : 'NO');

  // 2. Inspeccionar [businessId]/page.tsx
  const bPage = 'src/app/(public)/blog/[businessId]/page.tsx';
  if (fs.existsSync(bPage)) {
    console.log(`\n2. Inspección de ${bPage}:`);
    const content = fs.readFileSync(bPage, 'utf8');
    const lines = content.split('\n');
    
    // Dónde consulta los posts y de dónde saca el nombre del negocio
    lines.slice(0, 60).forEach((l, i) => console.log(`  L${i+1}: ${l}`));

    const queryIdx = lines.findIndex(l => l.includes('collection("blog_posts")') || l.includes("collection('blog_posts')"));
    if (queryIdx !== -1) {
      console.log('\n--- Consulta de posts en [businessId]/page.tsx: ---');
      lines.slice(queryIdx - 2, queryIdx + 20).forEach((l, i) => console.log(`  ${l}`));
    }
  }

  // 3. Consultar posts globales activos en Firestore
  const { getAdminFirestore } = await import('./src/firebase/server-init');
  const db = await getAdminFirestore();

  console.log('\n3. Posts globales activos en Firestore (sin businessId y con isActive = true):');
  const allPosts = await db.collection('blog_posts').get();
  let globalActives = 0;

  allPosts.forEach(d => {
    const data = d.data();
    const isGlobal = !data.businessId || data.businessId === 'undefined' || data.businessId === null;
    const isActive = data.isActive === true;
    if (isGlobal && isActive) {
      globalActives++;
      console.log(`  ✓ ID: ${d.id} | Slug: "${data.slug}" | Título: "${data.title}"`);
    }
  });
  console.log(`\nTotal posts globales activos encontrados: ${globalActives}`);

  console.log('\n=== FIN DIAGNÓSTICO ===');
}

run().catch(console.error);
