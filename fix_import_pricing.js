const fs = require('fs');
const filePath = 'src/components/catalogo/purchase-modal.tsx';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "import { calcularTarifaServicio, type PricingContext, type CanalPedido } from '@/constants/pricingPlans';",
  "import { calcularTarifaServicio, calcularPrecioCliente, type PricingContext, type CanalPedido } from '@/constants/pricingPlans';"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Import calcularPrecioCliente añadido.');
