const fs = require('fs');

// 1. Leer desde el respaldo original intacto
const bakPath = 'src/app/(admin)/superadmin/hybrid-billing/page.tsx.bak';
let content = fs.readFileSync(bakPath, 'utf8');

// 2. Inyectar estados para la modalidad de cobro
const stateTarget = `const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());\n  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());`;
const stateAddition = `${stateTarget}
  const [billingPeriodType, setBillingPeriodType] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [selectedFortnight, setSelectedFortnight] = useState<'1' | '2'>('1');
  const [selectedWeek, setSelectedWeek] = useState<'1' | '2' | '3' | '4'>('1');`;

content = content.replace(stateTarget, stateAddition);

// 3. Filtrar negocios no híbridos
const loopBusinessTarget = `for (const business of businesses) {
        const businessKey = business.name.toLowerCase().trim();

        const plan = hybridPlans.find(p => p.name === business.planName || p.id === business.planName);
        if (!plan) continue;`;

const loopBusinessNew = `for (const business of businesses) {
        // FASE 5: Ignorar negocios de planes fijos en este panel
        if (business.planType && business.planType !== 'hibrido') continue;

        const businessKey = business.name.toLowerCase().trim();

        const plan = hybridPlans.find(p => p.name === business.planName || p.id === business.planName);
        if (!plan) continue;`;

content = content.replace(loopBusinessTarget, loopBusinessNew);

// 4. Filtrar pedidos por período (mensual, quincenal, semanal)
const ordersFilterTarget = `const currentMonthOrders = allOrders.filter(o => {
            const orderDate = parseAnyDate(o.orderDate);
            if (!orderDate) return false;
            const matchesMonth = isSameMonth(orderDate, referenceMonth);
            const notCancelled = o.orderStatus !== 'Cancelado';
            return matchesMonth && notCancelled;
        });`;

const ordersFilterNew = `const currentMonthOrders = allOrders.filter(o => {
            const orderDate = parseAnyDate(o.orderDate);
            if (!orderDate) return false;
            const matchesMonth = isSameMonth(orderDate, referenceMonth);
            const notCancelled = o.orderStatus !== 'Cancelado';
            if (!matchesMonth || !notCancelled) return false;

            if (billingPeriodType === 'monthly') return true;
            const day = orderDate.getDate();
            if (billingPeriodType === 'biweekly') {
              return selectedFortnight === '1' ? day <= 15 : day > 15;
            }
            if (billingPeriodType === 'weekly') {
              if (selectedWeek === '1') return day >= 1 && day <= 7;
              if (selectedWeek === '2') return day >= 8 && day <= 14;
              if (selectedWeek === '3') return day >= 15 && day <= 21;
              return day >= 22;
            }
            return true;
        });`;

content = content.replace(ordersFilterTarget, ordersFilterNew);

// 5. Base proporcional según modalidad
content = content.replace(
  /basePrice:\s*parseAmount\(plan\.basePrice\),[\s\S]*?totalAmount:\s*parseAmount\(plan\.basePrice\)\s*\+\s*variableAmount,/,
  `basePrice: (() => {
            let b = parseAmount(plan.basePrice);
            if (billingPeriodType === 'biweekly') return Math.round(b / 2);
            if (billingPeriodType === 'weekly') return Math.round(b / 4);
            return b;
          })(),
          orderCount,
          ordersTotalValue: totalSalesValue,
          variableAmount,
          totalAmount: (() => {
            let b = parseAmount(plan.basePrice);
            if (billingPeriodType === 'biweekly') b = Math.round(b / 2);
            if (billingPeriodType === 'weekly') b = Math.round(b / 4);
            return b + variableAmount;
          })(),`
);

// 6. Mensajes de WhatsApp según modalidad (con llave de cierre correcta)
const oldMsgFull = `const message = \`Hola *\${res.businessName}*! 👋 

Aquí está tu resumen de facturación para el mes de *\${currentMonthLabel} \${selectedYear}*:

📊 *Actividad del Mes:*
- Pedidos realizados: \${res.orderCount}
- Valor total ventas: \${formatCurrency(res.ordersTotalValue)}

💰 *Desglose de Cobro:*
- Tarifa base plan: \${formatCurrency(res.basePrice)}
- Comisiones variables: \${formatCurrency(res.variableAmount)}
-------------------------
💵 *TOTAL A PAGAR: \${formatCurrency(res.totalAmount)}*

📍 *Métodos de pago:*\${paymentDetails || '\\nConsulta los datos bancarios con el administrador.'}

Gracias por tu puntualidad! 🚀\`;`;

const newMsgFull = `let message = '';
    if (billingPeriodType === 'weekly') {
      const weekRange = selectedWeek === '1' ? '1 al 7' : selectedWeek === '2' ? '8 al 14' : selectedWeek === '3' ? '15 al 21' : '22 al fin de mes';
      message = \`Hola *\${res.businessName}*, adjuntamos el reporte de la semana (\${weekRange} de \${currentMonthLabel} \${selectedYear}):
• Base Plan: \${formatCurrency(res.basePrice)}
• Comisiones (\${res.orderCount} pedidos): \${formatCurrency(res.variableAmount)}
• TOTAL A TRANSFERIR: \${formatCurrency(res.totalAmount)}

Recuerda que estas comisiones ya fueron cobradas al cliente final en los pedidos.
Por favor transfiere a Nequi \${paymentDetails || ''} antes del martes 6:00 PM.\`;
    } else if (billingPeriodType === 'biweekly') {
      const fortRange = selectedFortnight === '1' ? '1 al 15' : '16 al fin de mes';
      message = \`Hola *\${res.businessName}*, adjuntamos el reporte de la quincena (\${fortRange} de \${currentMonthLabel} \${selectedYear}):
• Base Plan: \${formatCurrency(res.basePrice)}
• Comisiones (\${res.orderCount} pedidos): \${formatCurrency(res.variableAmount)}
• TOTAL A TRANSFERIR: \${formatCurrency(res.totalAmount)}

Recuerda que estas comisiones ya fueron cobradas al cliente final en los pedidos.
Por favor transfiere a Nequi \${paymentDetails || ''} antes del vencimiento establecido.\`;
    } else {
      message = \`Hola *\${res.businessName}*! 👋 

Aquí está tu resumen de facturación para el mes de *\${currentMonthLabel} \${selectedYear}*:

📊 *Actividad del Mes:*
- Pedidos realizados: \${res.orderCount}
- Valor total ventas: \${formatCurrency(res.ordersTotalValue)}

💰 *Desglose de Cobro:*
- Tarifa base plan: \${formatCurrency(res.basePrice)}
- Comisiones variables: \${formatCurrency(res.variableAmount)}
-------------------------
💵 *TOTAL A PAGAR: \${formatCurrency(res.totalAmount)}*

📍 *Métodos de pago:*\${paymentDetails || '\\nConsulta los datos bancarios con el administrador.'}

Gracias por tu puntualidad! 🚀\`;
    }`;

content = content.replace(oldMsgFull, newMsgFull);

// 7. Selectores en JSX
const selectorsTarget = `{/* SELECTORES DE MES Y AÑO */}`;
const selectorsNew = `{/* TOGGLE MODALIDAD DE COBRO (FASE 5) */}
            <Select value={billingPeriodType} onValueChange={(val: any) => setBillingPeriodType(val)}>
              <SelectTrigger className="w-[125px] font-bold">
                <SelectValue placeholder="Modalidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="biweekly">Quincenal</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>

            {billingPeriodType === 'biweekly' && (
              <Select value={selectedFortnight} onValueChange={(val: any) => setSelectedFortnight(val)}>
                <SelectTrigger className="w-[185px]">
                  <SelectValue placeholder="Quincena" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ra Quincena (1 al 15)</SelectItem>
                  <SelectItem value="2">2da Quincena (16 al fin)</SelectItem>
                </SelectContent>
              </Select>
            )}

            {billingPeriodType === 'weekly' && (
              <Select value={selectedWeek} onValueChange={(val: any) => setSelectedWeek(val)}>
                <SelectTrigger className="w-[175px]">
                  <SelectValue placeholder="Semana" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semana 1 (1 al 7)</SelectItem>
                  <SelectItem value="2">Semana 2 (8 al 14)</SelectItem>
                  <SelectItem value="3">Semana 3 (15 al 21)</SelectItem>
                  <SelectItem value="4">Semana 4 (22 al fin)</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* SELECTORES DE MES Y AÑO */}`;

content = content.replace(selectorsTarget, selectorsNew);

// 8. Etiqueta de vencimiento en la tabla
content = content.replace(
  `{res.status === 'paid' ? 'Pagado' : 'Pendiente'}`,
  `{res.status === 'paid' ? 'Pagado' : 'Pendiente · vence martes 6:00 PM'}`
);

// 9. Período en la tarjeta resumen
content = content.replace(
  `{MONTHS[parseInt(selectedMonth)].label} {selectedYear}`,
  `{billingPeriodType === 'weekly' ? \`Semana \${selectedWeek} · \` : billingPeriodType === 'biweekly' ? \`Quincena \${selectedFortnight} · \` : ''}{MONTHS[parseInt(selectedMonth)].label} {selectedYear}`
);

fs.writeFileSync('src/app/(admin)/superadmin/hybrid-billing/page.tsx', content, 'utf8');
console.log('✅ Archivo corregido y sincronizado.');
