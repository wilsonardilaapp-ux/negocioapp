const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO MEJORA DE PLANES DE ACTIVACIÓN');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. types.ts
const typesPath = 'src/modules/solicitudes-negocio/types.ts';
let typesContent = fs.readFileSync(typesPath, 'utf8');

if (!typesContent.includes('badge?: string;')) {
  typesContent = typesContent.replace(
    'highlighted?: boolean;',
    'highlighted?: boolean;\n  badge?: string;\n  priceSuffix?: string;\n  features?: string[];'
  );
}

if (!typesContent.includes('commissionPercentage?: string;')) {
  typesContent = typesContent.replace(
    'paymentInstructions?: Record<string, string>;',
    'paymentInstructions?: Record<string, string>;\n  commissionPercentage?: string;'
  );
}
backupAndWrite(typesPath, typesContent);

// 2. constants.ts
const constantsPath = 'src/modules/solicitudes-negocio/constants.ts';
let constantsContent = fs.readFileSync(constantsPath, 'utf8');

const newDefaultPlans = `export const DEFAULT_PLANS = [
  {
    id: 'plan-gratis',
    name: 'Plan Activación Básica',
    description: 'Abre tu cuenta hoy sin costo de entrada y comienza a digitalizar tu negocio.',
    price: 0,
    currency: 'COP' as const,
    isFree: true,
    active: true,
    highlighted: false,
    badge: 'Gratis',
    priceSuffix: 'pago único',
    features: [
      'Abre tu cuenta hoy sin riesgo',
      'Empieza gratis'
    ]
  },
  {
    id: 'plan-pro',
    name: 'Plan Pro + Menú Interactivo',
    description: 'Catálogo con fotos, pedidos por WhatsApp y posicionamiento en el directorio.',
    price: 49000,
    currency: 'COP' as const,
    isFree: false,
    hotmartUrl: '',
    active: true,
    highlighted: true,
    badge: 'Más popular',
    priceSuffix: 'pago único',
    features: [
      'Menú interactivo listo para vender',
      'Activación en menos de 48 horas',
      'Pago único'
    ]
  },
  {
    id: 'plan-vip',
    name: 'Plan VIP Completo + Diseño',
    description: 'Creación profesional de logo, portada, fotos y configuración total de tu menú.',
    price: 99000,
    currency: 'COP' as const,
    isFree: false,
    hotmartUrl: '',
    active: true,
    highlighted: false,
    badge: '',
    priceSuffix: 'pago único',
    features: [
      'Diseño y menú completo',
      'Listo en menos de 2 horas',
      'Pago único'
    ]
  }
];`;

const startPlans = constantsContent.indexOf('export const DEFAULT_PLANS = [');
const endPlans = constantsContent.indexOf('export const DEFAULT_SOLICITUD_CONFIG:');

if (startPlans !== -1 && endPlans !== -1) {
  constantsContent = constantsContent.slice(0, startPlans) + newDefaultPlans + '\n\n' + constantsContent.slice(endPlans);
  if (!constantsContent.includes('commissionPercentage:')) {
    constantsContent = constantsContent.replace(
      'paymentInstructions: {',
      'commissionPercentage: "5",\n  paymentInstructions: {'
    );
  }
  backupAndWrite(constantsPath, constantsContent);
}

// 3. admin-editor.tsx
const editorPath = 'src/modules/solicitudes-negocio/components/admin-editor.tsx';
let editorContent = fs.readFileSync(editorPath, 'utf8');

// Agregar ChevronUp, ChevronDown en imports
if (!editorContent.includes('ChevronUp')) {
  editorContent = editorContent.replace(
    'Package',
    'Package, ChevronUp, ChevronDown'
  );
}

// Reemplazar funciones de manejo de plan
const oldPlanFuncsStart = 'const handlePlanChange = (index: number, field: keyof PlanActivacion, value: any) => {';
const newPlanFuncs = `const handlePlanChange = (index: number, field: keyof PlanActivacion, value: any) => {
    let updated = [...(config.plans || [])];

    if (field === 'highlighted') {
      const isChecking = Boolean(value);
      updated = updated.map((p, i) => {
        if (i === index) {
          return {
            ...p,
            highlighted: isChecking,
            badge: isChecking ? (p.badge || 'Más popular') : (p.badge === 'Más popular' ? '' : p.badge)
          };
        }
        return { ...p, highlighted: false };
      });
      setConfig({ ...config, plans: updated });
      return;
    }

    updated[index] = { ...updated[index], [field]: value };
    if (field === 'isFree' && value === true) {
      updated[index].price = 0;
    }
    setConfig({ ...config, plans: updated });
  };

  const handleAddFeature = (planIndex: number) => {
    const updated = [...(config.plans || [])];
    const plan = updated[planIndex];
    const currentFeats = plan.features || [];
    if (currentFeats.length >= 8) return;
    updated[planIndex] = { ...plan, features: [...currentFeats, ''] };
    setConfig({ ...config, plans: updated });
  };

  const handleFeatureChange = (planIndex: number, featIndex: number, val: string) => {
    const updated = [...(config.plans || [])];
    const feats = [...(updated[planIndex].features || [])];
    feats[featIndex] = val.slice(0, 70);
    updated[planIndex] = { ...updated[planIndex], features: feats };
    setConfig({ ...config, plans: updated });
  };

  const handleRemoveFeature = (planIndex: number, featIndex: number) => {
    const updated = [...(config.plans || [])];
    const feats = (updated[planIndex].features || []).filter((_, i) => i !== featIndex);
    updated[planIndex] = { ...updated[planIndex], features: feats };
    setConfig({ ...config, plans: updated });
  };

  const handleMoveFeature = (planIndex: number, featIndex: number, direction: 'up' | 'down') => {
    const updated = [...(config.plans || [])];
    const feats = [...(updated[planIndex].features || [])];
    const targetIdx = direction === 'up' ? featIndex - 1 : featIndex + 1;
    if (targetIdx < 0 || targetIdx >= feats.length) return;
    const temp = feats[featIndex];
    feats[featIndex] = feats[targetIdx];
    feats[targetIdx] = temp;
    updated[planIndex] = { ...updated[planIndex], features: feats };
    setConfig({ ...config, plans: updated });
  };

  const addPlan = () => {
    const newPlan: PlanActivacion = {
      id: 'plan-' + Date.now(),
      name: 'Nuevo Plan',
      description: 'Descripción del plan',
      price: 29000,
      currency: 'COP',
      isFree: false,
      hotmartUrl: '',
      active: true,
      highlighted: false,
      badge: '',
      priceSuffix: 'pago único',
      features: []
    };
    setConfig({ ...config, plans: [...(config.plans || []), newPlan] });
  };`;

const oldPlanFuncsEnd = 'if (loading) {';
const startIdxFns = editorContent.indexOf(oldPlanFuncsStart);
const endIdxFns = editorContent.indexOf(oldPlanFuncsEnd);

if (startIdxFns !== -1 && endIdxFns !== -1) {
  editorContent = editorContent.slice(0, startIdxFns) + newPlanFuncs + '\n\n  ' + editorContent.slice(endIdxFns);
}

// Reemplazar JSX de la pestaña plans
const oldPlansTabStart = "{activeTab === 'plans' && (";
const newPlansTab = `{activeTab === 'plans' && (
        <div className="space-y-6 bg-card p-6 rounded-2xl border border-border">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold">Configuración de Planes de Activación</h2>
              <p className="text-xs text-muted-foreground">Personaliza precios, características, enlaces de Hotmart y el plan destacado.</p>
            </div>
            <button type="button" onClick={addPlan} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Agregar Plan
            </button>
          </div>

          <div className="space-y-6">
            {config.plans?.map((plan, idx) => (
              <div key={plan.id || idx} className={'p-5 rounded-2xl border transition-all space-y-4 ' + (plan.highlighted ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-muted/20')}>
                {/* 1. Activo & Eliminar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={'plan-active-' + idx} checked={plan.active !== false} onChange={e => handlePlanChange(idx, 'active', e.target.checked)} className="w-4 h-4 rounded text-primary cursor-pointer" />
                    <label htmlFor={'plan-active-' + idx} className="text-xs font-bold cursor-pointer">Activo en el formulario</label>
                  </div>
                  <button type="button" onClick={() => removePlan(idx)} className="text-muted-foreground hover:text-destructive p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 2, 3, 4: Nombre, Precio, Gratuito */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Nombre del Plan</label>
                    <input type="text" value={plan.name} onChange={e => handlePlanChange(idx, 'name', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Precio (COP)</label>
                    <input type="number" disabled={plan.isFree} value={plan.price} onChange={e => handlePlanChange(idx, 'price', Number(e.target.value))} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background disabled:opacity-50" />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="checkbox" checked={plan.isFree} onChange={e => handlePlanChange(idx, 'isFree', e.target.checked)} className="w-4 h-4 rounded text-primary" />
                      ¿Es Plan Gratuito ($0)?
                    </label>
                  </div>
                </div>

                {/* 5. Descripción corta con contador (máx 120 chars) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold">Descripción corta</label>
                    <span className="text-[10px] text-muted-foreground font-mono">{(plan.description || '').length}/120</span>
                  </div>
                  <input type="text" maxLength={120} value={plan.description || ''} onChange={e => handlePlanChange(idx, 'description', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                </div>

                {/* 6. JUSTO DEBAJO DE DESCRIPCIÓN: CARACTERÍSTICAS */}
                <div className="p-3.5 rounded-xl border border-border bg-background space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-foreground">Características del Plan ({(plan.features || []).length}/8)</label>
                    {(plan.features || []).length < 8 && (
                      <button type="button" onClick={() => handleAddFeature(idx)} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Agregar característica
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {(plan.features || []).map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          maxLength={70}
                          placeholder="Beneficio o característica..."
                          value={feat}
                          onChange={e => handleFeatureChange(idx, fIdx, e.target.value)}
                          className="flex-1 text-xs h-8 px-2.5 rounded border border-input bg-background"
                        />
                        <button type="button" disabled={fIdx === 0} onClick={() => handleMoveFeature(idx, fIdx, 'up')} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" disabled={fIdx === (plan.features || []).length - 1} onClick={() => handleMoveFeature(idx, fIdx, 'down')} className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleRemoveFeature(idx, fIdx)} className="p-1 rounded text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!plan.features || plan.features.length === 0) && (
                      <p className="text-[11px] text-muted-foreground italic py-1">Sin características añadidas.</p>
                    )}
                  </div>
                </div>

                {/* 7, 8, 9, 10: Hotmart, Etiqueta, Destacado, Texto junto al precio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Enlace de Pago Hotmart (Opcional)</label>
                    <input type="text" placeholder="https://pay.hotmart.com/..." value={plan.hotmartUrl || ''} onChange={e => handlePlanChange(idx, 'hotmartUrl', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Etiqueta (Badge libre)</label>
                    <input type="text" placeholder="Ej: Más popular, Gratis, Recomendado..." value={plan.badge || ''} onChange={e => handlePlanChange(idx, 'badge', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input type="checkbox" id={'plan-highlight-' + idx} checked={Boolean(plan.highlighted)} onChange={e => handlePlanChange(idx, 'highlighted', e.target.checked)} className="w-4 h-4 rounded text-emerald-600 cursor-pointer" />
                    <label htmlFor={'plan-highlight-' + idx} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-pointer">
                      Plan destacado (Solo 1 a la vez, borde verde)
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Texto junto al precio</label>
                    <input type="text" placeholder="pago único" value={plan.priceSuffix || 'pago único'} onChange={e => handlePlanChange(idx, 'priceSuffix', e.target.value)} className="w-full text-xs h-9 px-2.5 rounded-lg border border-input bg-background" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Línea editable de porcentaje bajo las tarjetas */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-3">
            <label className="text-xs font-bold whitespace-nowrap">Porcentaje por pedido (%):</label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="text"
                placeholder="5"
                value={config.commissionPercentage || '5'}
                onChange={e => setConfig({ ...config, commissionPercentage: e.target.value })}
                className="w-20 text-xs h-9 px-2.5 rounded-lg border border-input bg-background font-mono text-center"
              />
              <span className="text-xs text-muted-foreground">$0 de mensualidad. Solo el {config.commissionPercentage || '5'}% por cada pedido.</span>
            </div>
          </div>
        </div>
      )}`;

const oldPlansTabEnd = "{activeTab === 'payments' && <AdminPaymentsTab />}";
const tabStartPlansIdx = editorContent.indexOf(oldPlansTabStart);
const tabEndPlansIdx = editorContent.indexOf(oldPlansTabEnd);

if (tabStartPlansIdx !== -1 && tabEndPlansIdx !== -1) {
  editorContent = editorContent.slice(0, tabStartPlansIdx) + newPlansTab + '\n\n      ' + editorContent.slice(tabEndPlansIdx);
  backupAndWrite(editorPath, editorContent);
}

// 4. public-form.tsx: Modificar solo el bloque de planes
const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
let formContent = fs.readFileSync(formPath, 'utf8');

// Agregar estado expandedPlans
if (!formContent.includes('expandedPlans')) {
  formContent = formContent.replace(
    "const [selectedPlanId, setSelectedPlanId] = useState<string>('');",
    "const [selectedPlanId, setSelectedPlanId] = useState<string>('');\n  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});"
  );
}

const oldPublicPlansStart = "{config.blocks?.plans?.enabled !== false && activePlans.length > 0 && (";
const newPublicPlans = `{config.blocks?.plans?.enabled !== false && activePlans.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {config.blocks?.plans?.title || 'Planes de Activación'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {config.blocks?.plans?.description || 'Elige el plan que mejor se adapte a tu negocio.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
              {activePlans.map(plan => {
                const isSelected = selectedPlanId === plan.id;
                const isExpanded = Boolean(expandedPlans[plan.id]);
                const features = plan.features || [];
                const hasMore = features.length > 3 || (plan.description && plan.description.length > 80);
                const visibleFeatures = isExpanded ? features : features.slice(0, 3);

                return (
                  <label
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      if (plan.isFree || plan.price === 0) {
                        setSelectedPaymentMethod('');
                        setPaymentReference('');
                        setPaymentReceipt(null);
                      }
                    }}
                    className={'relative p-5 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all h-full ' + (plan.highlighted ? 'border-emerald-500 shadow-sm bg-emerald-500/5 ring-1 ring-emerald-500/30' : isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/30')}
                  >
                    <input type="radio" name="activation_plan" value={plan.id} checked={isSelected} readOnly className="sr-only" />
                    
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-base text-foreground leading-snug">{plan.name}</span>
                        {plan.badge && (
                          <span className={'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ' + (plan.highlighted ? 'bg-emerald-600 text-white' : 'bg-primary/10 text-primary')}>
                            {plan.badge}
                          </span>
                        )}
                      </div>

                      <p className={'text-xs text-muted-foreground leading-relaxed ' + (isExpanded ? '' : 'line-clamp-3')}>
                        {plan.description}
                      </p>

                      {/* Características con check SVG limpio (sin emojis) */}
                      {visibleFeatures.length > 0 && (
                        <ul className="space-y-1.5 pt-1 text-xs">
                          {visibleFeatures.map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2 text-muted-foreground">
                              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span className="leading-tight text-foreground/90">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {hasMore && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPlans(prev => ({ ...prev, [plan.id]: !prev[plan.id] }));
                          }}
                          className="text-[11px] font-bold text-primary hover:underline pt-1 block cursor-pointer"
                        >
                          {isExpanded ? 'Ver menos' : 'Ver más'}
                        </button>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-border/60">
                      <p className="text-xl font-black text-foreground font-mono">
                        {plan.isFree || plan.price === 0 ? '$0 COP' : ('$' + plan.price.toLocaleString('es-CO') + ' COP')}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {plan.priceSuffix || 'pago único'}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Línea de porcentaje editable bajo las tarjetas */}
            <p className="text-xs text-center text-muted-foreground pt-2">
              $0 de mensualidad. Solo el <strong className="text-foreground">{config.commissionPercentage || '5'}%</strong> por cada pedido.
            </p>
          </div>
        )}`;

const oldPublicPlansEnd = "<PublicPaymentBlock";
const startPublicPlansIdx = formContent.indexOf(oldPublicPlansStart);
const endPublicPlansIdx = formContent.indexOf(oldPublicPlansEnd);

if (startPublicPlansIdx !== -1 && endPublicPlansIdx !== -1) {
  formContent = formContent.slice(0, startPublicPlansIdx) + newPublicPlans + '\n\n        ' + formContent.slice(endPublicPlansIdx);
  backupAndWrite(formPath, formContent);
}

console.log('==============================================');
console.log('MEJORA DE PLANES COMPLETADA CON ÉXITO');
console.log('==============================================');
