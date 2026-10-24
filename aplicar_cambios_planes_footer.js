const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO CAMBIOS EXACTOS DE PLANES Y FOOTER');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. Modificar constants.ts
const constantsPath = 'src/modules/solicitudes-negocio/constants.ts';
let constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Cambio 2: Plan Básico
constantsContent = constantsContent.replace(
  "name: 'Plan Activación Básica',",
  "name: 'Plan Básico',"
);

// Cambio 1: Badge ⚡ EXPRESS en Plan VIP
constantsContent = constantsContent.replace(
  "id: 'plan-vip',\n    name: 'Plan VIP Completo + Diseño',",
  "id: 'plan-vip',\n    name: 'Plan VIP Completo + Diseño',\n    badge: '⚡ EXPRESS',"
);

backupAndWrite(constantsPath, constantsContent);

// 2. Modificar public-form.tsx
const formPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
let formContent = fs.readFileSync(formPath, 'utf8');

// Agregar estado showFooterNote
if (!formContent.includes('showFooterNote')) {
  formContent = formContent.replace(
    "const [selectedPlanId, setSelectedPlanId] = useState<string>('');",
    "const [selectedPlanId, setSelectedPlanId] = useState<string>('');\n  const [showFooterNote, setShowFooterNote] = useState(true);"
  );
}

// Estilo del badge morado para ⚡ EXPRESS y Plan VIP
const oldBadgeRender = `{plan.badge && (
                          <span className={'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ' + (plan.highlighted ? 'bg-emerald-600 text-white' : 'bg-primary/10 text-primary')}>
                            {plan.badge}
                          </span>
                        )}`;

const newBadgeRender = `{plan.badge && (
                          <span className={'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap ' + (
                            (plan.badge.includes('EXPRESS') || plan.id === 'plan-vip')
                              ? 'bg-[#7c3aed] text-white'
                              : plan.highlighted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-primary/10 text-primary'
                          )}>
                            {plan.badge}
                          </span>
                        )}`;

if (formContent.includes(oldBadgeRender)) {
  formContent = formContent.replace(oldBadgeRender, newBadgeRender);
}

// Reemplazar la línea del footer por el nuevo texto y el toggle switch
const oldFooterNote = `<p className="text-xs text-center text-muted-foreground pt-2">
              $0 de mensualidad. Solo el <strong className="text-foreground">{config.commissionPercentage || '5'}%</strong> por cada pedido.
            </p>`;

const newFooterWithSwitch = `<div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none" aria-label="Mostrar u ocultar condiciones">
                <input
                  type="checkbox"
                  checked={showFooterNote}
                  onChange={e => setShowFooterNote(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  style={{
                    width: '50px',
                    height: '26px',
                    backgroundColor: showFooterNote ? '#16a34a' : '#cbd5e1',
                    transition: 'background-color 0.3s ease'
                  }}
                  className="rounded-full relative p-0.5"
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      transform: showFooterNote ? 'translateX(24px)' : 'translateX(0px)',
                      transition: 'transform 0.3s ease'
                    }}
                    className="bg-white rounded-full shadow-md"
                  />
                </div>
              </label>

              <div
                style={{
                  transition: 'opacity 0.3s ease, max-height 0.3s ease',
                  maxHeight: showFooterNote ? '100px' : '0px',
                  opacity: showFooterNote ? 1 : 0
                }}
                className="overflow-hidden"
              >
                <p className="text-xs text-center text-muted-foreground font-medium">
                  ✨ $0 de mensualidad. 0% de comisión por pedido. Pagas una sola vez.
                </p>
              </div>
            </div>`;

if (formContent.includes(oldFooterNote)) {
  formContent = formContent.replace(oldFooterNote, newFooterWithSwitch);
} else {
  // Búsqueda flexible en caso de ligeras variaciones de espacios
  const regexFooter = /<p className="text-xs text-center text-muted-foreground pt-2">[\s\S]*?por cada pedido\.[\s\S]*?<\/p>/;
  if (regexFooter.test(formContent)) {
    formContent = formContent.replace(regexFooter, newFooterWithSwitch);
  }
}

backupAndWrite(formPath, formContent);

console.log('==============================================');
console.log('CAMBIOS APLICADOS CON ÉXITO');
console.log('==============================================');
