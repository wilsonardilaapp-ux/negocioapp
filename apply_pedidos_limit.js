const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/pedidos/page.tsx';
if (!fs.existsSync(file)) {
  console.error(`[ERROR] Archivo no encontrado: ${file}`);
  process.exit(1);
}

// 1. Respaldo de seguridad (.bak)
const original = fs.readFileSync(file, 'utf8');
const backupFile = `${file}.bak`;
fs.writeFileSync(backupFile, original, 'utf8');
console.log(`[RESPALDO CREADO] ${backupFile}`);

let updated = original;

// 2. Definir constante ordersLimitReached
const anchorSub = 'const { plan, limits, ordersCount, isLoading: isSubscriptionLoading } = useSubscription();';
const newLimitConst = '\n  const ordersLimitReached = limits.orders !== -1 && ordersCount >= limits.orders;';

if (updated.includes(anchorSub) && !updated.includes('ordersLimitReached')) {
  updated = updated.replace(anchorSub, `${anchorSub}${newLimitConst}`);
}

// 3. Agregar disabled al botón Importar
const oldButton = '<Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)} className="font-bold border-primary text-primary hover:bg-primary/5">';
const newButton = '<Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)} disabled={ordersLimitReached} title={ordersLimitReached ? "Límite de pedidos alcanzado para tu plan" : undefined} className="font-bold border-primary text-primary hover:bg-primary/5">';

if (updated.includes(oldButton)) {
  updated = updated.replace(oldButton, newButton);
} else {
  console.warn('[ADVERTENCIA] No se encontró la firma exacta del botón Importar.');
}

// 4. Guardar cambios
fs.writeFileSync(file, updated, 'utf8');
console.log(`[MODIFICADO CON ÉXITO] ${file}`);

// 5. Verificación
const check = fs.readFileSync(file, 'utf8');
console.log('\n--- VERIFICACIÓN ---');
console.log('¿Contiene ordersLimitReached?:', check.includes('ordersLimitReached'));
console.log('¿Botón Importar tiene disabled={ordersLimitReached}?:', check.includes('disabled={ordersLimitReached}'));
