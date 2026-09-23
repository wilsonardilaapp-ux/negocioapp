const fs = require('fs');

// 1. ACTUALIZAR EN src/components/catalogo/cart-drawer.tsx
const drawerPath = 'src/components/catalogo/cart-drawer.tsx';
let drawerContent = fs.readFileSync(drawerPath, 'utf8');

drawerContent = drawerContent.replace(
  'Cargo de servicio Menfy incluido en los precios',
  'Cargo de servicio Markix incluido en los precios'
);

fs.writeFileSync(drawerPath, drawerContent, 'utf8');
console.log('✅ Texto actualizado a Markix en cart-drawer.tsx');

// 2. ARMONIZAR EN src/components/catalogo/public-product-card.tsx
const cardPath = 'src/components/catalogo/public-product-card.tsx';
let cardContent = fs.readFileSync(cardPath, 'utf8');

cardContent = cardContent.replace(
  /Servicio Menfy incl\./g,
  'Servicio Markix incl.'
);

cardContent = cardContent.replace(
  /tarifa de servicio Menfy/g,
  'tarifa de servicio Markix'
);

fs.writeFileSync(cardPath, cardContent, 'utf8');
console.log('✅ Textos armonizados a Markix en public-product-card.tsx');
