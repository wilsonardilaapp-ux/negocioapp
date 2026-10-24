const fs = require('fs');

const targetPath = 'src/modules/solicitudes-negocio/components/public-form.tsx';
const lines = fs.readFileSync(targetPath, 'utf8').split('\n');

// 1. Localizar inicio del mapeo y las líneas de (() => {
const mapLineIdx = lines.findIndex(l => l.includes('{activePlans.map(plan => {'));
const iifeStartIdx = lines.findIndex(l => l.includes('(() => {'));
const iifeEndIdx = lines.findIndex(l => l.includes('})()'));

console.log(`Línea map: ${mapLineIdx + 1}, Línea (() => {: ${iifeStartIdx + 1}, Línea })(): ${iifeEndIdx + 1}`);

if (mapLineIdx !== -1 && iifeStartIdx !== -1 && iifeEndIdx !== -1) {
  // A. Agregar las constantes limpias antes del return
  const variablesToAdd = [
    "                const displayName = (plan.id === 'plan-gratis' && (plan.name === 'Plan Activación Básica' || !plan.name)) ? 'Plan Básico' : plan.name;",
    "                const displayBadge = (plan.id === 'plan-vip' && (!plan.badge || plan.badge === '')) ? '⚡ EXPRESS' : plan.badge;",
    "                const isExpress = (displayBadge && displayBadge.includes('EXPRESS')) || plan.id === 'plan-vip';"
  ];
  lines.splice(mapLineIdx + 6, 0, ...variablesToAdd);

  // Recalcular índices tras la inserción
  const newIifeStart = lines.findIndex(l => l.includes('(() => {'));
  const newIifeEnd = lines.findIndex(l => l.includes('})()'));

  // B. Reemplazar (() => { ... })() por el JSX limpio directo
  const cleanHeaderJSX = [
    '                      <div className="flex items-start justify-between gap-2">',
    '                        <span className="font-bold text-base text-foreground leading-snug">{displayName}</span>',
    '                        {displayBadge && (',
    "                          <span className={'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm ' + (",
    '                            isExpress',
    "                              ? 'bg-[#7c3aed] text-white'",
    '                              : plan.highlighted',
    "                              ? 'bg-emerald-600 text-white'",
    "                              : 'bg-primary/10 text-primary'",
    '                          )}>',
    '                            {displayBadge}',
    '                          </span>',
    '                        )}',
    '                      </div>'
  ];

  // Reemplazar el rango
  lines.splice(newIifeStart, (newIifeEnd - newIifeStart + 1), ...cleanHeaderJSX);

  fs.writeFileSync(targetPath, lines.join('\n'), 'utf8');
  console.log('[OK] JSX reparado limpiamente. Error eliminado.');
} else {
  console.error('[ERROR] No se encontraron los índices exactos.');
}
