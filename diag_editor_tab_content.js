const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-editor.tsx', 'utf8');
const lines = content.split('\n');

const tabStart = lines.findIndex(l => l.includes("{activeTab === 'plans' &&"));
const tabEnd = lines.findIndex(l => l.includes("{activeTab === 'payments' &&"));

console.log(`[ADMIN EDITOR] Contenido de Pestaña Planes: Líneas ${tabStart + 1} a ${tabEnd + 1}`);
console.log(lines.slice(tabStart, tabStart + 15).join('\n'));
