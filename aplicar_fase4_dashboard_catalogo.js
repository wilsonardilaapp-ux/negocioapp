const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const targetFile = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
const backupFile = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx.bak');

console.log('====================================================');
console.log('🚀 APLICANDO FASE 4: INTEGRACIÓN EN DASHBOARD CATÁLOGO');
console.log('====================================================\n');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ Error: El archivo ${targetFile} no existe.`);
  process.exit(1);
}

// 1. Respaldo .bak
fs.copyFileSync(targetFile, backupFile);
console.log('📦 Respaldo creado exitosamente: src/app/(dashboard)/dashboard/catalogo/page.tsx.bak');

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Agregar imports aditivos
if (!content.includes('SocialProofGlobalSwitch')) {
  const importMarker = "import ShareCatalog from '../../../../components/catalogo/share-catalog';";
  if (content.includes(importMarker)) {
    content = content.replace(
      importMarker,
      `${importMarker}\nimport SocialProofGlobalSwitch from '@/components/catalogo/SocialProofGlobalSwitch';\nimport ProductSocialProofMenu from '@/components/catalogo/ProductSocialProofMenu';`
    );
    console.log('✅ Imports de SocialProof agregados a la cabecera.');
  }
}

// 3. Inyectar SocialProofGlobalSwitch en CardHeader
const headerTitleMarker = '<CardTitle>Tus Productos</CardTitle>';
if (content.includes(headerTitleMarker) && !content.includes('<SocialProofGlobalSwitch')) {
  content = content.replace(
    headerTitleMarker,
    `<div className="flex flex-wrap items-center gap-3">\n                            <CardTitle>Tus Productos</CardTitle>\n                            {user && (\n                                <SocialProofGlobalSwitch \n                                    businessId={user.uid} \n                                    initialEnabled={businessData?.socialProofEnabled !== false} \n                                />\n                            )}\n                        </div>`
  );
  console.log('✅ Switch global inyectado junto al título.');
}

// 4. Inyectar ProductSocialProofMenu en la barra de acciones de cada tarjeta de producto
const deleteButtonMarker = '<Button variant="destructive" size="sm" className="w-full" onClick={() => setProductToDelete(product)}>\n                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar\n                                </Button>';
if (content.includes(deleteButtonMarker) && !content.includes('<ProductSocialProofMenu')) {
  content = content.replace(
    deleteButtonMarker,
    `${deleteButtonMarker}\n                                {user && (\n                                    <ProductSocialProofMenu \n                                        product={product} \n                                        businessId={user.uid} \n                                    />\n                                )}`
  );
  console.log('✅ Menú de control por producto inyectado en las tarjetas de producto.');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('\n✅ FASE 4 aplicada exitosamente en dashboard/catalogo/page.tsx');
