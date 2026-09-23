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

// 1. EXTENDER src/models/hybrid-plan.ts (ADITIVO)
backupAndEdit('src/models/hybrid-plan.ts', (content) => {
  if (content.includes('mesaOrdersCount?:')) return content;

  return content.replace(
    /commissionType:\s*'fixed'\s*\|\s*'percent';/,
    `commissionType: 'fixed' | 'percent';\n  mesaOrdersCount?: number;\n  mesaOrdersValue?: number;\n  mesaCommission?: number;\n  deliveryOrdersCount?: number;\n  deliveryOrdersValue?: number;\n  deliveryCommission?: number;\n  dueDate?: string;\n  isOverdue?: boolean;\n  isSuspended?: boolean;`
  );
});

// 2. MODIFICAR src/app/(admin)/superadmin/hybrid-billing/page.tsx
backupAndEdit('src/app/(admin)/superadmin/hybrid-billing/page.tsx', (content) => {
  if (content.includes('billingAutoSuspension')) return content;

  let updated = content;

  // Importar setDoc o updateDoc y AlertDialog si es necesario
  updated = updated.replace(
    /import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@\/components\/ui\/card';/,
    `import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';\nimport { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';\nimport { ShieldAlert, ShieldCheck } from 'lucide-react';`
  );

  // Estados de suspensión y diálogo
  const stateTarget = `const [selectedWeek, setSelectedWeek] = useState<'1' | '2' | '3' | '4'>('1');`;
  const stateAddition = `${stateTarget}
  const [billingAutoSuspension, setBillingAutoSuspension] = useState<boolean>(false);
  const [suspendingBusiness, setSuspendingBusiness] = useState<{ id: string; name: string; isSuspended: boolean } | null>(null);`;

  updated = updated.replace(stateTarget, stateAddition);

  // Cargar estado de billingAutoSuspension desde Firestore
  const fetchConfigBlock = `useEffect(() => {
    if (!firestore) return;
    const fetchSuspensionConfig = async () => {
      try {
        const cfgRef = doc(firestore, 'globalConfig', 'billing');
        const snap = await getDoc(cfgRef);
        if (snap.exists() && snap.data().billingAutoSuspension !== undefined) {
          setBillingAutoSuspension(Boolean(snap.data().billingAutoSuspension));
        }
      } catch (e) {}
    };
    fetchSuspensionConfig();
  }, [firestore]);`;

  updated = updated.replace(
    /const businessesQuery = useMemoFirebase/,
    `${fetchConfigBlock}\n\n  const businessesQuery = useMemoFirebase`
  );

  // Toggle de configuración de suspensión automática
  const toggleAutoSuspensionFn = `const handleToggleAutoSuspension = async () => {
    if (!firestore) return;
    const newValue = !billingAutoSuspension;
    setBillingAutoSuspension(newValue);
    try {
      const cfgRef = doc(firestore, 'globalConfig', 'billing');
      await setDocumentNonBlocking(cfgRef, { billingAutoSuspension: newValue }, { merge: true });
      toast({
        title: \`Suspensión \${newValue ? 'AUTOMÁTICA activada' : 'MANUAL activada'}\`,
        description: newValue 
          ? 'Los restaurantes con facturas vencidas se suspenderán solos.' 
          : 'Tú decides manualmente cuándo suspender o reactivar.'
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleConfirmSuspension = async () => {
    if (!firestore || !suspendingBusiness || !user) return;
    const nextStatus = suspendingBusiness.isSuspended ? 'active' : 'suspended';
    try {
      const bRef = doc(firestore, 'businesses', suspendingBusiness.id);
      await setDocumentNonBlocking(bRef, { status: nextStatus }, { merge: true });
      
      // Registrar en log
      const logRef = doc(collection(firestore, 'suspensionLog'));
      await setDocumentNonBlocking(logRef, {
        businessId: suspendingBusiness.id,
        businessName: suspendingBusiness.name,
        action: nextStatus === 'suspended' ? 'suspend' : 'reactivate',
        mode: 'manual',
        userId: user.uid,
        userEmail: user.email,
        timestamp: new Date().toISOString()
      });

      toast({
        title: nextStatus === 'suspended' ? 'Restaurante suspendido' : 'Restaurante reactivado',
        description: \`El estado de "\${suspendingBusiness.name}" ha sido actualizado.\`
      });

      // Actualizar estado local en billingResults
      setBillingResults(prev => prev.map(r => r.businessId === suspendingBusiness.id ? { ...r, isSuspended: nextStatus === 'suspended' } : r));
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setSuspendingBusiness(null);
    }
  };`;

  updated = updated.replace(
    /const parseAmount =/,
    `${toggleAutoSuspensionFn}\n\n  const parseAmount =`
  );

  // Cálculo discriminando canal Mesa vs Domicilio
  const calcTarget = `let variableAmount = 0;
        const commissionConfig = parseAmount(plan.pricePerOrder);

        if (plan.commissionType === 'percent') {
          const comisionCalculada = totalSalesValue * (commissionConfig / 100);
          const tope = parseAmount(plan.maxCommissionPerOrder);
          variableAmount = (tope > 0 && orderCount > 0) ? Math.min(comisionCalculada, tope * orderCount) : comisionCalculada;
        } else {
          variableAmount = orderCount * commissionConfig;
        }`;

  const calcNew = `let mesaOrdersCount = 0;
        let mesaOrdersValue = 0;
        let mesaCommission = 0;
        let deliveryOrdersCount = 0;
        let deliveryOrdersValue = 0;
        let deliveryCommission = 0;

        const tableCommissionRate = parseAmount(plan.tableCommissionRate) || 3;
        const deliveryCommissionConfig = parseAmount(plan.pricePerOrder);

        for (const order of currentMonthOrders) {
          const isMesa = order.channel === 'mesa' || order.origin === 'qr';
          const orderTotal = Number(order.total || 0);

          if (isMesa) {
            mesaOrdersCount++;
            mesaOrdersValue += orderTotal;
            mesaCommission += orderTotal * (tableCommissionRate / 100);
          } else {
            deliveryOrdersCount++;
            deliveryOrdersValue += orderTotal;
            if (plan.commissionType === 'percent') {
              deliveryCommission += orderTotal * (deliveryCommissionConfig / 100);
            } else {
              deliveryCommission += deliveryCommissionConfig;
            }
          }
        }

        mesaCommission = Math.round(mesaCommission);
        deliveryCommission = Math.round(deliveryCommission);
        let variableAmount = mesaCommission + deliveryCommission;

        const dueDateObj = new Date(referenceDate.getTime() + 5 * 24 * 60 * 60 * 1000);
        const isOverdue = dueDateObj.getTime() < Date.now();
        const isSuspended = business.status === 'suspended';`;

  updated = updated.replace(calcTarget, calcNew);

  // Inyectar campos de canal y vencimiento en billingResult
  updated = updated.replace(
    /variableAmount,/,
    `variableAmount,\n          mesaOrdersCount,\n          mesaOrdersValue,\n          mesaCommission,\n          deliveryOrdersCount,\n          deliveryOrdersValue,\n          deliveryCommission,\n          dueDate: dueDateObj.toISOString(),\n          isOverdue,\n          isSuspended,`
  );

  // Inyectar el switch de suspensión en la cabecera
  const headerCardTarget = `<CardDescription>Gestión de comisiones para planes híbridos (Zentry)</CardDescription>`;
  const headerCardNew = `${headerCardTarget}
          </div>
          <div className="flex items-center gap-3 bg-background/80 p-2.5 rounded-xl border shadow-sm">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-foreground">
                Suspensión: {billingAutoSuspension ? 'AUTOMÁTICA' : 'MANUAL'}
              </span>
              <span className="text-[10px] text-muted-foreground" title="Automática: los restaurantes con factura vencida se bloquean solos. Manual: tú decides cuándo suspender.">
                {billingAutoSuspension ? 'Bloqueo automático si vence' : 'Control manual por admin'}
              </span>
            </div>
            <Switch 
              checked={billingAutoSuspension} 
              onCheckedChange={handleToggleAutoSuspension}
              className="data-[state=checked]:bg-destructive"
            />`;

  updated = updated.replace(headerCardTarget, headerCardNew);

  // Inyectar columna/botón de Suspender/Reactivar en la tabla
  const actionsCellTarget = `<Button \n                            variant="outline" \n                            size="sm" \n                            className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"\n                            onClick={() => handleSendWhatsApp(res)}\n                        >\n                            <WhatsAppIcon className="mr-2 h-4 w-4" />\n                            Enviar Cobro\n                        </Button>`;

  const actionsCellNew = `<div className="flex items-center justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                            onClick={() => handleSendWhatsApp(res)}
                        >
                            <WhatsAppIcon className="mr-1.5 h-3.5 w-3.5" />
                            Enviar
                        </Button>
                        <Button
                            variant={res.isSuspended ? "default" : "destructive"}
                            size="sm"
                            className="text-xs"
                            onClick={() => setSuspendingBusiness({ id: res.businessId, name: res.businessName, isSuspended: Boolean(res.isSuspended) })}
                        >
                            {res.isSuspended ? 'Reactivar' : 'Suspender'}
                        </Button>
                      </div>`;

  updated = updated.replace(actionsCellTarget, actionsCellNew);

  // Inyectar el Modal de Confirmación de Suspensión al final del componente
  const endOfJsxTarget = `</div>\n  );\n}`;
  const modalBlock = `
      {/* Modal de confirmación de suspensión manual */}
      <AlertDialog open={!!suspendingBusiness} onOpenChange={(open) => !open && setSuspendingBusiness(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              {suspendingBusiness?.isSuspended ? '¿Reactivar restaurante?' : '¿Suspender restaurante?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendingBusiness?.isSuspended
                ? \`El restaurante "\${suspendingBusiness?.name}" volverá a estar disponible para recibir pedidos en su carta y QR.\`
                : \`Al suspender a "\${suspendingBusiness?.name}", su carta pública y código QR dejarán de estar disponibles inmediatamente hasta que reactives el servicio.\`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSuspension}
              className={suspendingBusiness?.isSuspended ? "bg-primary" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {suspendingBusiness?.isSuspended ? 'Sí, reactivar' : 'Sí, suspender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}`;

  updated = updated.replace(endOfJsxTarget, modalBlock);

  return updated;
});

console.log('\n🎉 Fase 6 aplicada.');
