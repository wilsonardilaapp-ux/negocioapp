const fs = require('fs');

// 1. Corregir public-product-card.tsx
const cardPath = 'src/components/catalogo/public-product-card.tsx';
let cardContent = fs.readFileSync(cardPath, 'utf8');
if (!cardContent.includes("from '@/constants/pricingPlans'")) {
  cardContent = cardContent.replace(
    "import type { Product } from '../../models/product';",
    "import type { Product } from '../../models/product';\nimport { calcularPrecioCliente, type PricingContext } from '@/constants/pricingPlans';"
  );
  fs.writeFileSync(cardPath, cardContent, 'utf8');
  console.log('✅ Import inyectado en public-product-card.tsx');
}

// 2. Corregir cart-drawer.tsx
const drawerPath = 'src/components/catalogo/cart-drawer.tsx';
let drawerContent = fs.readFileSync(drawerPath, 'utf8');
if (!drawerContent.includes("from '@/constants/pricingPlans'")) {
  drawerContent = drawerContent.replace(
    "import type { CartItem } from '@/models/cart';",
    "import type { CartItem } from '@/models/cart';\nimport type { PricingContext } from '@/constants/pricingPlans';"
  );
  fs.writeFileSync(drawerPath, drawerContent, 'utf8');
  console.log('✅ Import inyectado en cart-drawer.tsx');
}
