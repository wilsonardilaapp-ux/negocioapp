const fs = require('fs');
const filePath = 'src/components/catalogo/purchase-modal.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Inyectar import de pricingPlans
if (!content.includes('from \'@/constants/pricingPlans\'')) {
  content = content.replace(
    "import type { Order, OrderItem, OrderStatus, TipoEntrega } from '@/models/order';",
    "import type { Order, OrderItem, OrderStatus, TipoEntrega } from '@/models/order';\nimport { calcularTarifaServicio, type PricingContext, type CanalPedido } from '@/constants/pricingPlans';"
  );
}

// 2. Desestructurar planContext en la firma del componente
content = content.replace(
  "externalCoupon = null\n}: PurchaseModalProps) {",
  "externalCoupon = null,\n  planContext\n}: PurchaseModalProps) {"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ PurchaseModal corregido con import y prop destructurada.');
