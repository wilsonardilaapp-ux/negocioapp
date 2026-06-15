'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Calculator, 
  Loader2, 
  Building2, 
  Calendar as CalendarIcon, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, getDocs, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { HybridPlan, HybridBillingResult } from '@/models/hybrid-plan';
import type { Business } from '@/models/business';
import type { Order } from '@/models/order';
import type { GlobalPaymentConfig } from '@/models/global-payment-config';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function HybridBillingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [billingResults, setBillingResults] = useState<HybridBillingResult[]>([]);

  // Data fetching
  const hybridPlansQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'hybrid_plans'), [firestore]);
  const { data: hybridPlans } = useCollection<HybridPlan>(hybridPlansQuery);

  const businessesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'businesses'), [firestore]);
  const { data: businesses, isLoading: loadingBusinesses } = useCollection<Business>(businessesQuery);

  const paymentConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'payment_methods'), [firestore]);
  const { data: paymentConfig } = useDoc<GlobalPaymentConfig>(paymentConfigRef);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateBilling = async () => {
    if (!firestore || !businesses || !hybridPlans) return;
    setIsCalculating(true);
    const results: HybridBillingResult[] = [];

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      for (const business of businesses) {
        // Encontrar si el negocio tiene un plan híbrido asignado
        const plan = hybridPlans.find(p => p.name === business.planName);
        if (!plan) continue;

        // Consultar pedidos del negocio este mes
        const ordersRef = collection(firestore, `businesses/${business.id}/orders`);
        const ordersSnap = await getDocs(ordersRef);
        const orders = ordersSnap.docs.map(doc => doc.data() as Order);
        
        // Filtrar por fecha (este mes)
        const currentMonthOrders = orders.filter(o => o.orderDate >= startOfMonth);
        
        const orderCount = currentMonthOrders.length;
        const totalValue = currentMonthOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
        
        let variableAmount = 0;
        if (plan.commissionType === 'percent') {
          variableAmount = totalValue * (plan.pricePerOrder / 100);
        } else {
          variableAmount = orderCount * plan.pricePerOrder;
        }

        results.push({
          businessId: business.id,
          businessName: business.name,
          ownerEmail: business.ownerEmail,
          phone: business.phone,
          planName: plan.name,
          basePrice: plan.basePrice,
          orderCount,
          ordersTotalValue: totalValue,
          variableAmount,
          totalAmount: plan.basePrice + variableAmount,
          status: 'pending',
          paymentMethod: 'Nequi',
          commissionType: plan.commissionType || 'fixed',
          maxCommissionPerOrder: Number(plan.maxCommissionPerOrder) || 0,
        });
      }

      setBillingResults(results);
      toast({ 
        title: 'Cálculo completado', 
        description: `Se procesaron ${results.length} negocios con planes híbridos.` 
      });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al calcular cobros', variant: 'destructive' });
    } finally {
      setIsCalculating(false);
    }
  };

  const toggleStatus = (businessId: string) => {
    setBillingResults(prev => prev.map(res => 
      res.businessId === businessId 
        ? { ...res, status: res.status === 'pending' ? 'paid' : 'pending' } 
        : res
    ));
  };

  const handleSendWhatsApp = (res: HybridBillingResult) => {
    if (!res.phone) {
      toast({ variant: 'destructive', title: 'Error', description: 'El negocio no tiene un número de teléfono registrado.' });
      return;
    }

    const currentMonth = format(new Date(), 'MMMM', { locale: es });
    let paymentDetails = "";
    
    if (paymentConfig) {
        if (paymentConfig.nequi.enabled) paymentDetails += `\n📲 Nequi: ${paymentConfig.nequi.accountNumber}`;
        if (paymentConfig.bancolombia.enabled) paymentDetails += `\n🏦 Bancolombia: ${paymentConfig.bancolombia.accountNumber}`;
    }

    const message = `Hola *${res.businessName}*! 👋 

Aquí está tu resumen de Menfy para el mes de *${currentMonth}*:

📊 *Resumen de actividad:*
- Pedidos realizados: ${res.orderCount}
- Valor en ventas: ${formatCurrency(res.ordersTotalValue)}

💰 *Desglose de cobro:*
- Tarifa base: ${formatCurrency(res.basePrice)}
- Comisiones variables: ${formatCurrency(res.variableAmount)}
-------------------------
💵 *TOTAL A PAGAR: ${formatCurrency(res.totalAmount)}*

📍 *Métodos de pago:*${paymentDetails || '\nConsulta los datos bancarios con el administrador.'}

Gracias por confiar en nosotros! 🚀`;

    const cleanPhone = res.phone.replace(/\D/g, '');
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const totalBilling = billingResults.reduce((sum, r) => sum + r.totalAmount, 0);
  const paidBilling = billingResults.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.totalAmount, 0);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center bg-muted/30">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="text-primary" />
              Panel de Cobros Masivos
            </CardTitle>
            <CardDescription>Gestión de comisiones para planes híbridos (Menfy)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={calculateBilling} disabled={isCalculating || loadingBusinesses} className="shadow-sm">
                {isCalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {billingResults.length > 0 ? 'Recalcular Todo' : 'Iniciar Cálculo del Mes'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recaudado</CardHeader>
          <CardContent><div className="text-2xl font-black text-primary">{formatCurrency(paidBilling)}</div></CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardHeader className="pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Por Recaudar</CardHeader>
          <CardContent><div className="text-2xl font-black text-orange-600">{formatCurrency(totalBilling - paidBilling)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Negocios Activos</CardHeader>
          <CardContent><div className="text-2xl font-bold">{billingResults.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Período</CardHeader>
          <CardContent className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <div className="text-xl font-bold capitalize">{format(new Date(), 'MMMM yyyy', { locale: es })}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0 pt-6">
            <div className="flex justify-between items-center">
                <CardTitle>Listado de Facturación</CardTitle>
                <div className="flex gap-2 items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"/> Pagado</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"/> Pendiente</div>
                </div>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plan Híbrido</TableHead>
                  <TableHead className="text-center">Pedidos (Mes)</TableHead>
                  <TableHead className="text-right">Base / Comisión</TableHead>
                  <TableHead className="text-right font-black">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingResults.length > 0 ? billingResults.map(res => (
                  <TableRow key={res.businessId} className={cn(res.status === 'paid' && "bg-green-50/30")}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {res.businessName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{res.ownerEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="font-medium">{res.planName}</Badge></TableCell>
                    <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                            <span className="font-bold">{res.orderCount}</span>
                            <span className="text-[10px] text-muted-foreground">{formatCurrency(res.ordersTotalValue)} en ventas</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex flex-col text-xs">
                            <span>Base: {formatCurrency(res.basePrice)}</span>
                            <span className="text-orange-600">Var: {formatCurrency(res.variableAmount)}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary">
                        {formatCurrency(res.totalAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                            <Switch 
                                checked={res.status === 'paid'} 
                                onCheckedChange={() => toggleStatus(res.businessId)}
                                className="data-[state=checked]:bg-green-500"
                            />
                            <span className={cn("text-[10px] font-bold uppercase", res.status === 'paid' ? "text-green-600" : "text-orange-600")}>
                                {res.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                            onClick={() => handleSendWhatsApp(res)}
                        >
                            <WhatsAppIcon className="mr-2 h-4 w-4" />
                            Enviar Cobro
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="bg-muted p-4 rounded-full"><AlertCircle className="w-8 h-8" /></div>
                        <p className="font-medium">No se han calculado cobros para este período todavía.</p>
                        <Button variant="ghost" onClick={calculateBilling}>Iniciar proceso ahora <ArrowRight className="ml-2 w-4 h-4"/></Button>
                      </div>
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

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function WhatsAppIcon(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.068-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
        </svg>
    );
}
