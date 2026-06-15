'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Loader2, Download, Building2, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { HybridPlan, HybridBillingResult } from '@/models/hybrid-plan';
import type { Business } from '@/models/business';
import type { Order } from '@/models/order';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function HybridBillingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [billingResults, setBillingResults] = useState<HybridBillingResult[]>([]);

  const hybridPlansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'hybrid_plans'), [firestore]);
  const { data: hybridPlans } = useCollection<HybridPlan>(hybridPlansQuery);

  const businessesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'businesses'), [firestore]);
  const { data: businesses, isLoading: loadingBusinesses } = useCollection<Business>(businessesQuery);

  const calculateBilling = async () => {
    if (!firestore || !businesses || !hybridPlans) return;
    setIsCalculating(true);
    const results: HybridBillingResult[] = [];

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      for (const business of businesses) {
        // Encontrar si el negocio tiene un plan híbrido asignado (buscamos por nombre de plan por simplicidad en este MVP)
        const plan = hybridPlans.find(p => p.name === business.planName);
        if (!plan) continue;

        // Consultar pedidos del negocio este mes
        const ordersRef = collection(firestore, `businesses/${business.id}/orders`);
        const ordersSnap = await getDocs(ordersRef);
        const orders = ordersSnap.docs.map(doc => doc.data() as Order);
        
        // Filtrar por fecha (este mes)
        const currentMonthOrders = orders.filter(o => o.orderDate >= startOfMonth);
        
        const orderCount = currentMonthOrders.length;
        const totalValue = currentMonthOrders.reduce((sum, o) => sum + o.subtotal, 0);
        
        let variableAmount = 0;
        if (plan.commissionType === 'percent') {
          variableAmount = totalValue * (plan.pricePerOrder / 100);
        } else {
          variableAmount = orderCount * plan.pricePerOrder;
        }

        results.push({
          businessId: business.id,
          businessName: business.name,
          planName: plan.name,
          basePrice: plan.basePrice,
          orderCount,
          ordersTotalValue: totalValue,
          variableAmount,
          totalAmount: plan.basePrice + variableAmount
        });
      }

      setBillingResults(results);
      toast({ title: 'Cálculo completado', description: `Se procesaron ${results.length} negocios con planes híbridos.` });
    } catch (e) {
      toast({ title: 'Error al calcular cobros', variant: 'destructive' });
    } finally {
      setIsCalculating(false);
    }
  };

  const totalBilling = billingResults.reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Facturación de Planes Híbridos</CardTitle>
            <CardDescription>Calcula la facturación mensual basada en transacciones reales.</CardDescription>
          </div>
          <Button onClick={calculateBilling} disabled={isCalculating || loadingBusinesses}>
            {isCalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
            Calcular Cobros del Mes
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">Negocios Procesados</CardHeader>
          <CardContent><div className="text-2xl font-bold">{billingResults.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">Período</CardHeader>
          <CardContent className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <div className="text-xl font-bold capitalize">{format(new Date(), 'MMMM yyyy', { locale: es })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm font-medium text-muted-foreground">Proyección de Ingresos Totales</CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">${totalBilling.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Resultados Detallados</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Negocio</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Variable</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingResults.length > 0 ? billingResults.map(res => (
                  <TableRow key={res.businessId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {res.businessName}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{res.planName}</Badge></TableCell>
                    <TableCell className="text-right">{res.orderCount} ($ {res.ordersTotalValue.toLocaleString()})</TableCell>
                    <TableCell className="text-right">$ {res.basePrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">$ {res.variableAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">$ {res.totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Haz clic en "Calcular" para generar los resultados de este mes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
