const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const targetFile = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx');
const backupFile = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx.bak');

console.log('====================================================');
console.log('🚀 FASE 6: CONECTANDO PRUEBA SOCIAL EN CATÁLOGO PÚBLICO');
console.log('====================================================\n');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ Error: El archivo ${targetFile} no existe.`);
  process.exit(1);
}

// 1. Respaldo .bak
fs.copyFileSync(targetFile, backupFile);
console.log('📦 Respaldo creado: src/app/(public)/catalog/[businessId]/page.tsx.bak');

let content = fs.readFileSync(targetFile, 'utf8');

// 2. Imports aditivos
if (!content.includes('getSocialProofMetrics')) {
  const marker = "import { validateAndResolveRef } from '@/actions/share-cards-actions';";
  if (content.includes(marker)) {
    content = content.replace(
      marker,
      `${marker}\nimport { getSocialProofMetrics } from '@/actions/social-proof-actions';\nimport type { SocialProofCatalogMetrics } from '@/models/social-proof';`
    );
    console.log('✅ Imports de social-proof agregados a page.tsx');
  }
}

// 3. Declaración de estado y useEffect para cargar métricas
if (!content.includes('socialProofData')) {
  const stateMarker = 'const [isLoading, setIsLoading] = useState(true);';
  if (content.includes(stateMarker)) {
    content = content.replace(
      stateMarker,
      `${stateMarker}\n    const [socialProofData, setSocialProofData] = useState<SocialProofCatalogMetrics | null>(null);`
    );
  }

  const effectMarker = '}, [slug, firestore, isNetworkEnabled]);';
  if (content.includes(effectMarker)) {
    const socialProofEffect = `\n\n    useEffect(() => {\n        if (!pageData.resolvedBusinessId) return;\n        getSocialProofMetrics(pageData.resolvedBusinessId)\n            .then(data => setSocialProofData(data))\n            .catch(err => console.error('Error cargando métricas de prueba social:', err));\n    }, [pageData.resolvedBusinessId]);`;
    content = content.replace(effectMarker, `${effectMarker}${socialProofEffect}`);
    console.log('✅ Estado y useEffect de métricas inyectados.');
  }
}

// 4. Inyectar prop socialProof en PublicProductCard
const cardRenderMarker = `planContext={pricingContext}\n                                      onView={() => setSelectedProduct(product)}`;
if (content.includes(cardRenderMarker) && !content.includes('socialProof=')) {
  content = content.replace(
    cardRenderMarker,
    `planContext={pricingContext}\n                                      socialProof={socialProofData?.metrics?.[product.id]}\n                                      onView={() => setSelectedProduct(product)}`
  );
  console.log('✅ Prop socialProof inyectada en <PublicProductCard />.');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('\n✅ Integración completada con éxito en el catálogo público.');
