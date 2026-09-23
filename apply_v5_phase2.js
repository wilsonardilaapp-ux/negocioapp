const fs = require('fs');
const path = require('path');

function backupAndEdit(filePath, modifier) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(absPath, 'utf8');
  const bakPath = `${absPath}.bak`;
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, original, 'utf8');
    console.log(`🛡️ Respaldo creado: ${filePath}.bak`);
  }
  const modified = modifier(original);
  if (modified !== original) {
    fs.writeFileSync(absPath, modified, 'utf8');
    console.log(`✅ Modificado exitosamente (aditivo): ${filePath}`);
  } else {
    console.log(`ℹ️ Sin cambios requeridos: ${filePath}`);
  }
}

// 1. MODIFICAR src/app/(admin)/superadmin/hybrid-plans/page.tsx
backupAndEdit('src/app/(admin)/superadmin/hybrid-plans/page.tsx', (content) => {
  if (content.includes('tableCommissionRate')) return content;

  let updated = content;

  // defaultValues
  updated = updated.replace(
    /pricePerOrder:\s*0,\s*maxCommissionPerOrder:\s*0,/,
    `pricePerOrder: 0,\n      tableCommissionRate: 3,\n      maxCommissionPerOrder: 0,`
  );

  // reset con plan
  updated = updated.replace(
    /reset\({\s*\.\.\.plan,\s*features:\s*sortedFeatures,/,
    `reset({\n          ...plan,\n          tableCommissionRate: (plan as any).tableCommissionRate ?? 3,\n          features: sortedFeatures,`
  );

  // reset sin plan (crear nuevo)
  updated = updated.replace(
    /basePrice:\s*0,\s*pricePerOrder:\s*0,/,
    `basePrice: 0,\n          pricePerOrder: 0,\n          tableCommissionRate: 3,`
  );

  // Inyectar campo en pestaña Costos
  const targetEndOfCommission = `                    <Label className="text-xs">Valor de la Comisión</Label>
                    <Input type="number" step="0.01" {...register('pricePerOrder', { valueAsNumber: true })} />
                  </div>
                </div>
              </div>`;

  const newCommissionBlock = `${targetEndOfCommission}

              <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                <Label className="text-base font-bold">Comisión en Mesa (QR)</Label>
                <p className="text-xs text-muted-foreground">
                  Tarifa de servicio Menfy sumada a la cuenta del cliente en local por uso del QR (default: 3%).
                </p>
                <div className="flex gap-4 items-end">
                  <div className="w-48">
                    <Label className="text-xs font-semibold">Valor Comisión en Mesa (%)</Label>
                    <Input 
                      type="number" 
                      step="0.1" 
                      min="0"
                      {...register('tableCommissionRate', { valueAsNumber: true })} 
                      placeholder="3" 
                    />
                  </div>
                </div>
              </div>

              {/* Resumen en vivo exclusivo para Superadmin */}
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs font-semibold text-primary">
                Este plan cobra {watch('commissionType') === 'percent' ? \`\${watch('pricePerOrder') || 0}%\` : \`$\${watch('pricePerOrder') || 0}\`} en domicilio y {watch('tableCommissionRate') ?? 3}% en mesa
              </div>`;

  if (updated.includes(targetEndOfCommission)) {
    updated = updated.replace(targetEndOfCommission, newCommissionBlock);
  }

  return updated;
});

// 2. CREAR SCRIPT SEED PARA ACTUALIZAR FIRESTORE (hybrid_plans)
const seedContent = `import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from '../src/firebase/server-init';

async function seed() {
  console.log('🌱 Actualizando planes híbridos con tableCommissionRate: 3%...');
  const db = await getAdminFirestore();
  const snap = await db.collection('hybrid_plans').get();
  
  let updatedCount = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.tableCommissionRate === undefined || data.tableCommissionRate === null) {
      await doc.ref.update({
        tableCommissionRate: 3,
        tableCommissionType: 'percent'
      });
      console.log(\`  ✅ Plan '\${data.name || doc.id}' actualizado con 3% en mesa.\`);
      updatedCount++;
    } else {
      console.log(\`  ℹ️ Plan '\${data.name || doc.id}' ya tiene configurado: \${data.tableCommissionRate}% en mesa.\`);
    }
  }

  console.log(\`\\n🎉 Total planes actualizados: \${updatedCount} de \${snap.size}\`);
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error al actualizar planes:', err);
    process.exit(1);
  });
`;

fs.writeFileSync(path.resolve('scripts/seed_table_commissions.ts'), seedContent, 'utf8');

console.log('✅ Archivo scripts/seed_table_commissions.ts creado.');
