const fs = require('fs');

const file = 'src/app/(admin)/superadmin/negocios/page.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] No existe ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

// 2. Bloque antiguo a reemplazar
const oldTarget = `                  const isJevCopilot = mod.id === 'jev-copiloto' || mod.id === 'jev_copiloto';
                  const planExtraItem = isJevCopilot && currentPlan && Array.isArray((currentPlan as any).extraLimits)
                      ? (currentPlan as any).extraLimits.find((item: any) => ((item.key || '').toLowerCase().includes('jev') || (item.key || '').toLowerCase().includes('copiloto')))
                      : null;
                  const jevPlanLimit = planExtraItem?.value || 0;

                  const base = mod.limit === -1 ? '∞' : (mod.limit || 0);
                  const total = isJevCopilot 
                      ? jevPlanLimit + extra 
                      : (mod.limit === -1 ? '∞' : (mod.limit || 0) + extra);`;

// 3. Bloque nuevo universal
const newUniversalBlock = `                  // Mapeo dinámico y universal de límites técnicos extra del Plan Híbrido
                  const planExtraItem = currentPlan && Array.isArray((currentPlan as any).extraLimits)
                      ? (currentPlan as any).extraLimits.find((item: any) => {
                          const k = (item.key || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                          const mName = (mod.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                          const mId = (mod.id || '').toLowerCase().replace(/[^a-z0-9]/g, "");
                          if (!k) return false;
                          return mName.includes(k) || k.includes(mName) || mId.includes(k) || k.includes(mId) ||
                            (mod.id === 'loyalty' && (k.includes('fideliza') || k.includes('loyalty') || k.includes('inteligencia'))) ||
                            (mod.id === 'chatbot-menu-publico' && (k.includes('chatbot') || k.includes('menu'))) ||
                            (mod.id === 'social-proof' && (k.includes('pruebasocial') || k.includes('socialproof'))) ||
                            (mod.id === 'inventario-kardex' && k.includes('kardex')) ||
                            (mod.id === 'alertas-vencimiento' && k.includes('vencimiento')) ||
                            (mod.id === 'reservas-agendamiento' && (k.includes('reserva') || k.includes('cita')));
                        })
                      : null;

                  const hasPlanLimit = planExtraItem && typeof planExtraItem.value === 'number';
                  const baseNum = hasPlanLimit ? planExtraItem.value : (mod.limit ?? -1);
                  const base = baseNum === -1 ? '∞' : baseNum;
                  const total = baseNum === -1 ? '∞' : baseNum + extra;`;

let updated = original;

const normalizeLF = str => str.replace(/\r\n/g, '\n');
const normOriginal = normalizeLF(original);
const normTarget = normalizeLF(oldTarget);

if (normOriginal.includes(normTarget)) {
  updated = normOriginal.replace(normTarget, newUniversalBlock);
} else {
  // Fallback con regex en caso de pequeñas variaciones de espacios
  const regex = /const isJevCopilot = mod\.id === 'jev-copiloto'[\s\S]*?\(mod\.limit === -1 \? '∞' : \(mod\.limit \|\| 0\) \+ extra\);/;
  updated = normOriginal.replace(regex, newUniversalBlock);
}

// 4. Guardar archivo modificado
fs.writeFileSync(file, updated, 'utf8');
console.log(`[CORREGIDO CON ÉXITO] ${file}`);

// 5. Auto-verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN DE LÍNEAS NUEVAS ---');
console.log('¿Contiene mapeo universal?:', check.includes('Mapeo dinámico y universal de límites técnicos extra'));
console.log('¿Mapea loyalty/fidelizacion?:', check.includes('k.includes(\'fideliza\')'));
console.log('¿Mapea chatbot-menu?:', check.includes('k.includes(\'chatbot\')'));
console.log('¿Existe archivo de respaldo .bak?:', fs.existsSync(backupFile));
