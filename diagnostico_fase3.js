const fs = require('fs');

console.log('=== [PASO 1.3] INSPECCIÓN ESPECÍFICA DE LOYALTY Y LIMITS ===\n');

// 1. Ver jevLimitsService.ts
console.log('1. Contenido de src/jev/jevLimitsService.ts:');
if (fs.existsSync('src/jev/jevLimitsService.ts')) {
  console.log(fs.readFileSync('src/jev/jevLimitsService.ts', 'utf8').slice(0, 1200));
}

// 2. Ver bulkRecoverChurnClients en src/actions/loyalty.ts
console.log('\n2. bulkRecoverChurnClients en src/actions/loyalty.ts:');
if (fs.existsSync('src/actions/loyalty.ts')) {
  const content = fs.readFileSync('src/actions/loyalty.ts', 'utf8');
  const lines = content.split('\n');
  const startIdx = lines.findIndex(l => l.includes('bulkRecoverChurnClients'));
  if (startIdx !== -1) {
    console.log(lines.slice(startIdx, startIdx + 45).join('\n'));
  }
}

// 3. Ver cómo se monta el widget en vencimientos/page.tsx (últimas 30 líneas)
console.log('\n3. Posición del Widget en src/app/(dashboard)/dashboard/vencimientos/page.tsx:');
if (fs.existsSync('src/app/(dashboard)/dashboard/vencimientos/page.tsx')) {
  const lines = fs.readFileSync('src/app/(dashboard)/dashboard/vencimientos/page.tsx', 'utf8').split('\n');
  console.log(lines.slice(-35).join('\n'));
}

// 4. Ver estructura final de src/app/(dashboard)/dashboard/loyalty/page.tsx (últimas 35 líneas)
console.log('\n4. Fin de src/app/(dashboard)/dashboard/loyalty/page.tsx:');
if (fs.existsSync('src/app/(dashboard)/dashboard/loyalty/page.tsx')) {
  const lines = fs.readFileSync('src/app/(dashboard)/dashboard/loyalty/page.tsx', 'utf8').split('\n');
  console.log(lines.slice(-35).join('\n'));
}

// 5. Ver cómo maneja la pestaña Memoria JEV en JevCopilotWidgetRetencion.tsx
console.log('\n5. Pestañas en JevCopilotWidgetRetencion.tsx:');
if (fs.existsSync('src/jev/JevCopilotWidgetRetencion.tsx')) {
  const content = fs.readFileSync('src/jev/JevCopilotWidgetRetencion.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (/<Tabs|<TabsList|<TabsTrigger|value="preguntas"|value="memoria"/i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
}

console.log('\n=== FIN DIAGNÓSTICO FASE 3 ===');
