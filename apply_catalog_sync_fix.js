const fs = require('fs');
const path = require('path');

function backupAndEdit(filePath, modifier) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) return;
  const original = fs.readFileSync(absPath, 'utf8');
  const bakPath = `${absPath}.bak`;
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, original, 'utf8');
    console.log(`🛡️ Respaldo creado: ${filePath}.bak`);
  }
  const modified = modifier(original);
  if (modified !== original) {
    fs.writeFileSync(absPath, modified, 'utf8');
    console.log(`✅ Modificado exitosamente: ${filePath}`);
  }
}

// 1. MODIFICAR src/app/(public)/catalog/[businessId]/page.tsx
backupAndEdit('src/app/(public)/catalog/[businessId]/page.tsx', (content) => {
  let updated = content;

  // Añadir consulta a subcolección real de productos
  const oldPromiseAll = `const hybridPlansRef = collection(firestore, 'hybrid_plans');
                const [catalogSnap, paymentSnap, couponsSnap, businessSnap, hybridPlansSnap] = await Promise.all([
                    getDoc(publicCatalogRef),
                    getDoc(paymentSettingsRef),
                    getDocs(couponsQuery),
                    getDoc(businessRef),
                    getDocs(hybridPlansRef),
                ]);`;

  const newPromiseAll = `const hybridPlansRef = collection(firestore, 'hybrid_plans');
                const productsSubcollectionRef = collection(firestore, 'businesses', businessId, 'products');
                const [catalogSnap, paymentSnap, couponsSnap, businessSnap, hybridPlansSnap, productsSubSnap] = await Promise.all([
                    getDoc(publicCatalogRef),
                    getDoc(paymentSettingsRef),
                    getDocs(couponsQuery),
                    getDoc(businessRef),
                    getDocs(hybridPlansRef),
                    getDocs(productsSubcollectionRef),
                ]);`;

  updated = updated.replace(oldPromiseAll, newPromiseAll);

  // Asignar los productos reales de la subcolección
  const oldDataAssign = `const data = catalogSnap.data();
                const businessData = businessSnap.exists() ? (businessSnap.data() as Business) : null;`;

  const newDataAssign = `const data = catalogSnap.data();
                const businessData = businessSnap.exists() ? (businessSnap.data() as Business) : null;
                const subcollectionProducts = productsSubSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
                const finalProducts = subcollectionProducts.length > 0 ? subcollectionProducts : ((data.products as Product[]) || []);`;

  updated = updated.replace(oldDataAssign, newDataAssign);

  // Usar finalProducts en setPageData
  updated = updated.replace(
    /products:\s*data\.products\s*as\s*Product\[\],/,
    `products: finalProducts,`
  );

  return updated;
});

// 2. MODIFICAR src/app/(dashboard)/dashboard/catalogo/page.tsx (sincronizar tras importación masiva)
backupAndEdit('src/app/(dashboard)/dashboard/catalogo/page.tsx', (content) => {
  let updated = content;

  const targetImportToast = `toast({ 
                title: 'Importación finalizada',`;

  const syncAfterImport = `// Sincronizar catálogo público tras importación
            const allCurrentSnap = await getDocs(collection(firestore, \`businesses/\${user.uid}/products\`));
            const allCurrentProds = allCurrentSnap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
            updatePublicCatalog(allCurrentProds, headerConfig);

            toast({ 
                title: 'Importación finalizada',`;

  if (!updated.includes('allCurrentProds') && updated.includes(targetImportToast)) {
    updated = updated.replace(targetImportToast, syncAfterImport);
  }

  return updated;
});

// 3. SCRIPT SEED PARA VOLCAR LOS 36 PRODUCTOS A publicData/catalog
const syncScriptContent = `import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from './src/firebase/server-init';

async function syncAll() {
  const db = await getAdminFirestore();
  const businessId = '5vbHBuJHb9Uklh2OoOl8kin7iZA2';

  console.log('🔄 Sincronizando productos para el negocio:', businessId);
  const productsSnap = await db.collection('businesses').doc(businessId).collection('products').get();
  const products = productsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

  console.log(\`📦 Encontrados \${products.length} productos en la subcolección real.\`);

  const publicCatalogRef = db.collection('businesses').doc(businessId).collection('publicData').doc('catalog');
  await publicCatalogRef.set({
    products: products,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log(\`✅ \${products.length} productos sincronizados exitosamente en publicData/catalog.\`);
}

syncAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
`;

fs.writeFileSync('scripts/sync_catalog.ts', syncScriptContent, 'utf8');
console.log('✅ Script scripts/sync_catalog.ts creado.');
