const fs = require('fs');

console.log('==============================================');
console.log('CORRIGIENDO SINTAXIS EXACTA EN public-form.tsx');
console.log('==============================================');

const targetPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// Reemplazar el mapeo de planes por una versión 100% limpia sin IIFE desbalanceada
const startMarker = '{activePlans.map(plan => {';
const endMarker = 'return (\n                  <label\n                    key={plan.id}';

const cleanCardRender = `{activePlans.map(plan => {
                const isSelected = selectedPlanId === plan.id;
                const isExpanded = Boolean(expandedPlans[plan.id]);
                const features = plan.features || [];
                const hasMore = features.length > 3 || (plan.description && plan.description.length > 80);
                const visibleFeatures = isExpanded ? features : features.slice(0, 3);

                // Normalización de Nombre y Badge
                const displayName = (plan.id === 'plan-gratis' && (plan.name === 'Plan Activación Básica' || !plan.name))
                  ? 'Plan Básico'
                  : plan.name;

                const displayBadge = (plan.id === 'plan-vip' && (!plan.badge || plan.badge === ''))
                  ? '⚡ EXPRESS'
                  : plan.badge;

                const isExpress = (displayBadge && displayBadge.includes('EXPRESS')) || plan.id === 'plan-vip';

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
              })}`;

const plansBlockStart = content.indexOf('{activePlans.map(plan => {');
const plansBlockEnd = content.indexOf('{/* BLOQUE MÉTODOS DE PAGO CONECTADO */}');

if (plansBlockStart !== -1 && plansBlockEnd !== -1) {
  // Encontrar el cierre previo a BLOQUE MÉTODOS DE PAGO
  const sliceBefore = content.slice(0, plansBlockStart);
  const sliceAfter = content.slice(plansBlockEnd);

  const cleanMiddle = cleanCardRender + '\n            </div>\n\n            {config.showCommissionNote !== false && (\n              <p className="text-xs text-center text-muted-foreground font-medium pt-3">\n                ✨ $0 de mensualidad. 0% de comisión por pedido. Pagas una sola vez.\n              </p>\n            )}\n          </div>\n        )}\n\n        ';

  content = sliceBefore + cleanMiddle + sliceAfter;
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('[OK] public-form.tsx corregido con sintaxis JSX pura y sin errores.');
} else {
  console.error('[ERROR] No se encontraron los marcadores del bloque.');
}

console.log('==============================================');
