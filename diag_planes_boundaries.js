const fs = require('fs');

console.log('==============================================');
console.log('DIAGNÓSTICO: LÍMITES DE LA SECCIÓN DE PLANES');
console.log('==============================================');

// 1. public-form.tsx
const formContent = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const formLines = formContent.split('\n');
const planStartForm = formLines.findIndex(l => l.includes("config.blocks?.plans?.enabled !== false"));
const planEndForm = formLines.findIndex(l => l.includes("<PublicPaymentBlock"));

console.log(`[PUBLIC FORM] Bloque de Planes: Líneas ${planStartForm + 1} a ${planEndForm}`);
console.log(formLines.slice(planStartForm, planStartForm + 10).join('\n'));

// 2. admin-editor.tsx
const editorContent = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-editor.tsx', 'utf8');
const editorLines = editorContent.split('\n');
const planStartEditor = editorLines.findIndex(l => l.includes("activeTab === 'plans'"));
const planEndEditor = editorLines.findIndex(l => l.includes("activeTab === 'payments'"));

console.log(`\n[ADMIN EDITOR] Pestaña de Planes: Líneas ${planStartEditor + 1} a ${planEndEditor}`);
console.log(editorLines.slice(planStartEditor, planStartEditor + 10).join('\n'));

console.log('==============================================');
