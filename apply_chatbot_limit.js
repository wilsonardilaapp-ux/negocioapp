const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] No existe ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

let updated = original;

// 2. Import de LimitBanner
if (!updated.includes('LimitBanner')) {
  updated = updated.replace(
    "import { useSubscription } from '@/hooks/useSubscription';",
    "import { useSubscription } from '@/hooks/useSubscription';\nimport { LimitBanner } from '@/components/dashboard/LimitBanner';"
  );
}

// 3. Destructuración y cálculo dinámico de chatbotLimit
const subAnchor = 'const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();';
const newSubBlock = `const { isModuleAuthorized, isLoading: isSubLoading, plan, planDetails, allHybridPlans } = useSubscription();

  // --- RESOLUCIÓN DINÁMICA DE LÍMITE DE CHATBOT (PLAN HÍBRIDO) ---
  const chatbotLimit = useMemo(() => {
    const activePlan = planDetails || (allHybridPlans?.[0] as any);
    const extraLimits = activePlan?.extraLimits;
    if (Array.isArray(extraLimits)) {
      const item = extraLimits.find((el: any) => 
        /chatbot|menu/i.test(el.key || '')
      );
      if (item && typeof item.value === 'number') {
        return item.value;
      }
    }
    return 150; // Límite base predeterminado
  }, [planDetails, allHybridPlans]);

  const totalResponsesCount = rawResponses?.length ?? 0;
  const isChatbotLimitReached = chatbotLimit !== -1 && totalResponsesCount >= chatbotLimit;`;

if (updated.includes(subAnchor) && !updated.includes('chatbotLimit = useMemo')) {
  updated = updated.replace(subAnchor, newSubBlock);
}

// 4. Inyección del LimitBanner y la barra de límite bajo el <header>
const headerCloseAnchor = `      </header>`;
const bannerInjection = `      </header>

      <LimitBanner 
        current={totalResponsesCount} 
        limit={chatbotLimit} 
        label="respuestas de chatbot" 
        plan={typeof plan === 'string' ? plan : (plan as any)?.name || 'Plan'} 
      />

      <div className="flex items-center gap-2 rounded-2xl border bg-secondary/50 p-3 text-xs text-muted-foreground shadow-sm">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <span>Límite de Chatbot Menú del plan: <strong className="text-foreground font-bold">{totalResponsesCount} / {chatbotLimit === -1 ? '∞' : chatbotLimit}</strong></span>
      </div>`;

if (updated.includes(headerCloseAnchor) && !updated.includes('Límite de Chatbot Menú del plan:')) {
  updated = updated.replace(headerCloseAnchor, bannerInjection);
}

// 5. Proteger botones de Importar y Nueva Respuesta
const btnImportOld = '<Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={!isGlobalActive} className="font-bold border-primary text-primary hover:bg-primary/5">';
const btnImportNew = '<Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={!isGlobalActive || isChatbotLimitReached} title={isChatbotLimitReached ? "Límite de respuestas de chatbot alcanzado para tu plan" : undefined} className="font-bold border-primary text-primary hover:bg-primary/5">';

if (updated.includes(btnImportOld)) {
  updated = updated.replace(btnImportOld, btnImportNew);
}

const btnAddOld = '<Button onClick={() => handleOpenResponseDialog()} disabled={!isGlobalActive} className="font-bold shadow-md">';
const btnAddNew = '<Button onClick={() => handleOpenResponseDialog()} disabled={!isGlobalActive || isChatbotLimitReached} title={isChatbotLimitReached ? "Límite de respuestas de chatbot alcanzado para tu plan" : undefined} className="font-bold shadow-md">';

if (updated.includes(btnAddOld)) {
  updated = updated.replace(btnAddOld, btnAddNew);
}

// 6. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 7. Auto-verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN FINAL ---');
console.log('¿Importa LimitBanner?:', check.includes('LimitBanner'));
console.log('¿Calcula chatbotLimit?:', check.includes('chatbotLimit = useMemo'));
console.log('¿Tiene indicador "Límite de Chatbot Menú del plan"?:', check.includes('Límite de Chatbot Menú del plan:'));
console.log('¿Botón Nueva Respuesta tiene límite disabled?:', check.includes('!isGlobalActive || isChatbotLimitReached'));
console.log('¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
