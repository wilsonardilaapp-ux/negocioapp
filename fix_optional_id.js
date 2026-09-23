const fs = require('fs');
const filePath = 'src/app/(public)/catalog/[businessId]/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "p.id.toLowerCase() === planKey ||",
  "(p.id && p.id.toLowerCase() === planKey) ||"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Verificación segura de p.id aplicada.');
