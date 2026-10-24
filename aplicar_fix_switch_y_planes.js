const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO: Switch al Editor + Nombres y Badges');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. types.ts -> agregar showCommissionNote
const typesPath = 'src/modules/solicitudes-negocio/types.ts';
let typesContent = fs.readFileSync(typesPath, 'utf8');
if (!typesContent.includes('showCommissionNote?: boolean;')) {
  typesContent = typesContent.replace(
    'commissionPercentage?: string;',
    'commissionPercentage?: string;\n  showCommissionNote?: boolean;'
  );
  backupAndWrite(typesPath, typesContent);
}

// 2. solicitudes-service.ts -> normalizar planes en getSolicitudConfig
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let serviceContent = fs.readFileSync(servicePath, 'utf8');

const oldGetConfig = `export async function getSolicitudConfig(): Promise<SolicitudFormConfig> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.doc(CONFIG_DOC).get();
    if (!snap.exists) return DEFAULT_SOLICITUD_CONFIG;
    const data = snap.data() as any;
    return {
      ...DEFAULT_SOLICITUD_CONFIG,
      ...data,
      plans: Array.isArray(data.plans) && data.plans.length > 0 ? data.plans : DEFAULT_SOLICITUD_CONFIG.plans,
      paymentInstructions: { ...DEFAULT_SOLICITUD_CONFIG.paymentInstructions, ...(data.paymentInstructions || {}) }
    };
  } catch (error) {
    console.error('Error al obtener solicitud config:', error);
    return DEFAULT_SOLICITUD_CONFIG;
  }
}`;

const newGetConfig = `export async function getSolicitudConfig(): Promise<SolicitudFormConfig> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.doc(CONFIG_DOC).get();
    if (!snap.exists) return DEFAULT_SOLICITUD_CONFIG;
    const data = snap.data() as any;

    // Normalizar planes existentes de Firestore
    let plans = Array.isArray(data.plans) && data.plans.length > 0 ? data.plans : DEFAULT_SOLICITUD_CONFIG.plans;
    plans = plans.map((p: any) => {
      let updatedPlan = { ...p };
      if (updatedPlan.id === 'plan-gratis' && (updatedPlan.name === 'Plan Activación Básica' || !updatedPlan.name)) {
        updatedPlan.name = 'Plan Básico';
      }
      if (updatedPlan.id === 'plan-vip' && (!updatedPlan.badge || updatedPlan.badge === '')) {
        updatedPlan.badge = '⚡ EXPRESS';
      }
      return updatedPlan;
    });

    return {
      ...DEFAULT_SOLICITUD_CONFIG,
      ...data,
      showCommissionNote: data.showCommissionNote !== false,
      plans,
      paymentInstructions: { ...DEFAULT_SOLICITUD_CONFIG.paymentInstructions, ...(data.paymentInstructions || {}) }
    };
  } catch (error) {
    console.error('Error al obtener solicitud config:', error);
    return DEFAULT_SOLICITUD_CONFIG;
  }
}`;

if (serviceContent.includes('export async function getSolicitudConfig()')) {
  const startIdx = serviceContent.indexOf('export async function getSolicitudConfig()');
  const endMarker = 'export async function saveSolicitudConfig(';
  const endIdx = serviceContent.indexOf(endMarker);
  if (startIdx !== -1 && endIdx !== -1) {
    serviceContent = serviceContent.slice(0, startIdx) + newGetConfig + '\n\n' + serviceContent.slice(endIdx);
    backupAndWrite(servicePath, serviceContent);
  }
}

// 3. public-form.tsx -> Eliminar el switch y renderizar nombres/badges garantizados
const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
let formContent = fs.readFileSync(formPath, 'utf8');

// Normalizar nombres y badges en el render de tarjetas
const oldCardNameBadge = `<div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-base text-foreground leading-snug">{plan.name}</span>
                        {plan.badge && (
                          <span className={'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ' + (plan.highlighted ? 'bg-emerald-600 text-white' : 'bg-primary/10 text-primary')}>
                            {plan.badge}
                          </span>
                        )}
                      </div>`;

const newCardNameBadge = `(() => {
                        const displayName = (plan.id === 'plan-gratis' && plan.name === 'Plan Activación Básica') ? 'Plan Básico' : plan.name;
                        const displayBadge = (plan.id === 'plan-vip' && (!plan.badge || plan.badge === '')) ? '⚡ EXPRESS' : plan.badge;
                        const isExpress = displayBadge?.includes('EXPRESS') || plan.id === 'plan-vip';

                        return (
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-base text-foreground leading-snug">{displayName}</span>
                            {displayBadge && (
                              <span className={'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm ' + (
                                isExpress
                                  ? 'bg-[#7c3aed] text-white'
                                  : plan.highlighted
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-primary/10 text-primary'
                              )}>
                                {displayBadge}
                              </span>
                            )}
                          </div>
                        );
                      })()`;

// Reemplazar la cabecera de la tarjeta si coincide
if (formContent.includes('<span className="font-bold text-base text-foreground leading-snug">{plan.name}</span>')) {
  const markerStart = '<div className="flex items-start justify-between gap-2">\n                        <span className="font-bold text-base text-foreground leading-snug">{plan.name}</span>';
  const markerEnd = '</div>\n\n                      <p className=';
  const sIdx = formContent.indexOf(markerStart);
  const eIdx = formContent.indexOf(markerEnd);
  if (sIdx !== -1 && eIdx !== -1) {
    formContent = formContent.slice(0, sIdx) + newCardNameBadge + '\n\n                      <p className=' + formContent.slice(eIdx + markerEnd.length);
  }
}

// Reemplazar la sección del footer: ELIMINAR EL SWITCH DE LA PÁGINA PÚBLICA y dejar solo el texto
const switchRegex = /<div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">[\s\S]*?✨ \$0 de mensualidad\. 0% de comisión por pedido\. Pagas una sola vez\.[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const publicCleanFooterText = `{config.showCommissionNote !== false && (
              <p className="text-xs text-center text-muted-foreground font-medium pt-3">
                ✨ $0 de mensualidad. 0% de comisión por pedido. Pagas una sola vez.
              </p>
            )}`;

if (switchRegex.test(formContent)) {
  formContent = formContent.replace(switchRegex, publicCleanFooterText);
} else {
  // Buscar cualquier bloque con showFooterNote
  const fallbackRegex = /<div className="pt-4 flex flex-col sm:flex-row[\s\S]*?showFooterNote[\s\S]*?<\/div>\s*<\/div>/;
  if (fallbackRegex.test(formContent)) {
    formContent = formContent.replace(fallbackRegex, publicCleanFooterText);
  }
}

backupAndWrite(formPath, formContent);

// 4. admin-editor.tsx -> Colocar el Switch en el Editor del Formulario
const editorPath = 'src/modules/solicitudes-negocio/components/admin-editor.tsx';
let editorContent = fs.readFileSync(editorPath, 'utf8');

const oldEditorPercentageLine = `<div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-3">
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
          </div>`;

const newEditorFooterControl = `<div className="pt-5 border-t border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
              <div>
                <p className="text-xs font-bold text-foreground">Mostrar nota al pie de los planes en el formulario</p>
                <p className="text-[11px] text-muted-foreground">Si está activo, los visitantes verán la frase destacada debajo de los planes.</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none" aria-label="Mostrar u ocultar texto del footer">
                  <input
                    type="checkbox"
                    checked={config.showCommissionNote !== false}
                    onChange={e => setConfig({ ...config, showCommissionNote: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div
                    style={{
                      width: '50px',
                      height: '26px',
                      backgroundColor: (config.showCommissionNote !== false) ? '#16a34a' : '#cbd5e1',
                      transition: 'background-color 0.3s ease'
                    }}
                    className="rounded-full relative p-0.5"
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        transform: (config.showCommissionNote !== false) ? 'translateX(24px)' : 'translateX(0px)',
                        transition: 'transform 0.3s ease'
                      }}
                      className="bg-white rounded-full shadow-md"
                    />
                  </div>
                </label>
                <span className="text-xs font-semibold text-foreground">
                  {(config.showCommissionNote !== false) ? 'Visible' : 'Oculto'}
                </span>
              </div>
            </div>

            <div className="px-4 py-2.5 rounded-lg bg-background border border-border/80">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Texto actual en el formulario:</strong> ✨ $0 de mensualidad. 0% de comisión por pedido. Pagas una sola vez.
              </p>
            </div>
          </div>`;

if (editorContent.includes(oldEditorPercentageLine)) {
  editorContent = editorContent.replace(oldEditorPercentageLine, newEditorFooterControl);
  backupAndWrite(editorPath, editorContent);
} else {
  // Búsqueda alternativa al final del tab de planes
  const markerEndPlansTab = "{/* TAB PAGOS */}";
  const regexEditorLine = /<div className="pt-4 border-t border-border flex flex-col[\s\S]*?por cada pedido\.<\/span>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
  if (regexEditorLine.test(editorContent)) {
    editorContent = editorContent.replace(regexEditorLine, newEditorFooterControl);
    backupAndWrite(editorPath, editorContent);
  }
}

console.log('==============================================');
console.log('CAMBIO APLICADO Y SINCRONIZADO CON ÉXITO');
console.log('==============================================');
