const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/billing/ProductCatalog.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Respaldo .bak
const bakPath = `${filePath}.bak`;
if (!fs.existsSync(bakPath)) {
  fs.writeFileSync(bakPath, content, 'utf8');
  console.log(`🛡️ Respaldo creado: ${bakPath}`);
}

// 1. Asegurar useState para el manejo de error de imagen
if (!content.includes('useState')) {
  content = content.replace(
    "import React,",
    "import React, { useState },"
  );
}

// 2. Inyectar componente de imagen con placeholder de cubo gris definido
const productImageComponent = `
function ProductItemImage({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const rawImage = product.images?.[0] || (product as any).image || (product as any).imageUrl;
  const hasValidImage = Boolean(rawImage && typeof rawImage === 'string' && rawImage.trim() !== '' && !imgError);

  if (hasValidImage) {
    return (
      <Image 
        src={rawImage} 
        alt={product.name} 
        fill 
        sizes="(max-width: 768px) 50vw, 20vw"
        className="object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500">
      <Package size={44} strokeWidth={1.5} className="opacity-80" />
    </div>
  );
}
`;

if (!content.includes('function ProductItemImage')) {
  content = content.replace(
    "export default function ProductCatalog({",
    `${productImageComponent}\nexport default function ProductCatalog({`
  );
}

// 3. Reemplazar el bloque de render de la imagen en la tarjeta
const oldImageBlock = `<div className="relative aspect-square bg-muted">
                  {product.images?.[0] ? (
                    <Image 
                      src={product.images[0]} 
                      alt={product.name} 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground/20">
                      <Package size={40} />
                    </div>
                  )}
                  {product.stock < 5 && (`;

const newImageBlock = `<div className="relative aspect-square bg-muted overflow-hidden">
                  <ProductItemImage product={product} />
                  {product.stock < 5 && (`;

if (content.includes(oldImageBlock)) {
  content = content.replace(oldImageBlock, newImageBlock);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Placeholder de cubo gris visible implementado en Terminal POS.');
} else {
  // Reemplazo puntual por regex
  content = content.replace(
    /<div className="relative aspect-square bg-muted">[\s\S]*?\{product\.stock < 5 && \(/,
    newImageBlock
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Placeholder de cubo gris visible implementado (vía regex) en Terminal POS.');
}

