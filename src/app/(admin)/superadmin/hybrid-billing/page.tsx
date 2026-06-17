
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calculator, 
  Loader2, 
  Building2, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  DollarSign, 
  RefreshCw,
  ArrowRight,
  FileDown
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, getDocs, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { HybridPlan, HybridBillingResult } from '@/models/hybrid-plan';
import type { Business } from '@/models/business';
import type { Order } from '@/models/order';
import type { GlobalPaymentConfig } from '@/models/global-payment-config';
import { format, isSameMonth, parseISO, startOfMonth, setMonth, setYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Re-declare for TypeScript since jspdf-autotable extends jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const MONTHS = [
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

const YEARS = Array.from({ length: 2040 - 2024 + 1 }, (_, i) => (2024 + i).toString());

export default function HybridBillingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCalculating, setIsCalculating] = useState(false);
  const [billingResults, setBillingResults] = useState<HybridBillingResult[]>([]);
  
  // Período seleccionado
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

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

  // Helpers robustos
  const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const clean = val.replace(/[^0-9.-]/g, '');
      return parseFloat(clean) || 0;
    }
    return 0;
  };

  const parseAnyDate = (val: any): Date | null => {
    if (!val) return null;
    try {
      if (typeof val?.toDate === 'function') return val.toDate();
      if (val?.seconds) return new Date(val.seconds * 1000);
      if (typeof val === 'string') return parseISO(val);
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  };

  const calculateBilling = async () => {
    if (!firestore || !businesses || !hybridPlans) return;
    setIsCalculating(true);
    
    const resultsMap = new Map<string, HybridBillingResult>();

    try {
      // Usamos el período seleccionado
      const referenceDate = setYear(setMonth(new Date(), parseInt(selectedMonth)), parseInt(selectedYear));
      const referenceMonth = startOfMonth(referenceDate);

      for (const business of businesses) {
        const businessKey = business.name.toLowerCase().trim();

        const plan = hybridPlans.find(p => p.name === business.planName || p.id === business.planName);
        if (!plan) continue;

        const ordersRef = collection(firestore, `businesses/${business.id}/orders`);
        const ordersSnap = await getDocs(ordersRef);
        const allOrders = ordersSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
        
        const currentMonthOrders = allOrders.filter(o => {
            const orderDate = parseAnyDate(o.orderDate);
            if (!orderDate) return false;
            const matchesMonth = isSameMonth(orderDate, referenceMonth);
            const notCancelled = o.orderStatus !== 'Cancelado';
            return matchesMonth && notCancelled;
        });
        
        const orderCount = currentMonthOrders.length;
        const totalSalesValue = currentMonthOrders.reduce((sum, o) => sum + parseAmount(o.subtotal), 0);

        let variableAmount = 0;
        const commissionConfig = parseAmount(plan.pricePerOrder);

        if (plan.commissionType === 'percent') {
          const comisionCalculada = totalSalesValue * (commissionConfig / 100);
          const tope = parseAmount(plan.maxCommissionPerOrder);
          variableAmount = (tope > 0 && orderCount > 0) ? Math.min(comisionCalculada, tope * orderCount) : comisionCalculada;
        } else {
          variableAmount = orderCount * commissionConfig;
        }

        const billingResult: HybridBillingResult = {
          businessId: business.id,
          businessName: business.name,
          ownerEmail: business.ownerEmail,
          phone: business.phone,
          planName: plan.name,
          basePrice: parseAmount(plan.basePrice),
          orderCount,
          ordersTotalValue: totalSalesValue,
          variableAmount,
          totalAmount: parseAmount(plan.basePrice) + variableAmount,
          status: 'pending',
          paymentMethod: 'Nequi',
          commissionType: plan.commissionType || 'fixed',
          maxCommissionPerOrder: parseAmount(plan.maxCommissionPerOrder),
        };

        const existing = resultsMap.get(businessKey);
        if (!existing || billingResult.orderCount > existing.orderCount) {
          resultsMap.set(businessKey, billingResult);
        }
      }

      setBillingResults(Array.from(resultsMap.values()));
      toast({ 
        title: 'Cálculo completado', 
        description: `Se procesaron ${resultsMap.size} negocios para ${MONTHS[parseInt(selectedMonth)].label} ${selectedYear}.` 
      });
    } catch (e: any) {
      console.error("[Billing Error]", e);
      toast({ title: 'Error al calcular cobros', description: e.message, variant: 'destructive' });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (billingResults.length === 0) {
      toast({ variant: 'destructive', title: 'Sin datos', description: 'Realiza el cálculo primero para poder descargar el PDF.' });
      return;
    }

    const doc = new jsPDF();
    const monthLabel = MONTHS[parseInt(selectedMonth)].label;
    const periodLabel = `${monthLabel} ${selectedYear}`;
    const generationDate = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Título y Período
    doc.setFontSize(18);
    doc.text('Panel de Cobros Masivos', 14, 20);
    doc.setFontSize(12);
    doc.text(`Período: ${periodLabel}`, 14, 30);
    doc.text(`Fecha de generación: ${generationDate}`, 14, 37);

    // Resumen de KPIs
    const totalBilling = billingResults.reduce((sum, r) => sum + r.totalAmount, 0);
    const paidBilling = billingResults.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.totalAmount, 0);
    
    doc.setFontSize(11);
    doc.text(`Recaudado: ${formatCurrency(paidBilling)}`, 14, 50);
    doc.text(`Por Recaudar: ${formatCurrency(totalBilling - paidBilling)}`, 14, 57);
    doc.text(`Negocios Activos: ${billingResults.length}`, 14, 64);

    // Tabla de Cobros
    const tableData = billingResults.map(res => [
      res.businessName,
      res.planName,
      res.orderCount,
      `${formatCurrency(res.basePrice)} / ${res.commissionType === 'percent' ? res.variableAmount > 0 ? (res.variableAmount / (res.ordersTotalValue || 1) * 100).toFixed(1) + '%' : '0%' : formatCurrency(res.variableAmount)}`,
      formatCurrency(res.totalAmount),
      res.status === 'paid' ? 'Pagado' : 'Pendiente'
    ]);

    doc.autoTable({
      startY: 75,
      head: [['Empresa', 'Plan Híbrido', 'Pedidos', 'Base / Comisión', 'Total', 'Estado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [74, 175, 80] },
      styles: { fontSize: 9 }
    });

    // Pie de página
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(10);
    doc.text('Generado por Menfy - SuperAdmin', 14, finalY + 15);

    doc.save(`Cobros-Hibridos-${monthLabel}-${selectedYear}.pdf`);
    toast({ title: 'Reporte Generado', description: 'El PDF se ha descargado correctamente.' });
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

    const currentMonthLabel = MONTHS[parseInt(selectedMonth)].label;
    let paymentDetails = "";
    if (paymentConfig) {
        if (paymentConfig.nequi?.enabled) paymentDetails += `\n📲 Nequi: ${paymentConfig.nequi.accountNumber}`;
        if (paymentConfig.bancolombia?.enabled) paymentDetails += `\n🏦 Bancolombia: ${paymentConfig.bancolombia.accountNumber}`;
    }

    const message = `Hola *${res.businessName}*! 👋 

Aquí está tu resumen de facturación para el mes de *${currentMonthLabel} ${selectedYear}*:

📊 *Actividad del Mes:*
- Pedidos realizados: ${res.orderCount}
- Valor total ventas: ${formatCurrency(res.ordersTotalValue)}

💰 *Desglose de Cobro:*
- Tarifa base plan: ${formatCurrency(res.basePrice)}
- Comisiones variables: ${formatCurrency(res.variableAmount)}
-------------------------
💵 *TOTAL A PAGAR: ${formatCurrency(res.totalAmount)}*

📍 *Métodos de pago:*${paymentDetails || '\nConsulta los datos bancarios con el administrador.'}

Gracias por tu puntualidad! 🚀`;

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
            <CardDescription>Gestión de comisiones para planes híbridos (Zentry)</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            {/* SELECTORES DE MES Y AÑO */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleDownloadPDF} disabled={billingResults.length === 0} className="shadow-sm">
                <FileDown className="w-4 h-4 mr-2" />
                Descargar PDF
            </Button>

            <Button onClick={calculateBilling} disabled={isCalculating || loadingBusinesses} className="shadow-sm">
                {isCalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {billingResults.length > 0 ? 'Recalcular Todo' : 'Iniciar Cálculo'}
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
            <div className="text-xl font-bold capitalize">
              {MONTHS[parseInt(selectedMonth)].label} {selectedYear}
            </div>
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
                            <span className="font-bold text-lg">{res.orderCount}</span>
                            <span className="text-[10px] text-muted-foreground">{formatCurrency(res.ordersTotalValue)} en ventas</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex flex-col text-xs">
                            <span>Base: {formatCurrency(res.basePrice)}</span>
                            <span className="text-orange-600 font-semibold">Comisión: {formatCurrency(res.variableAmount)}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-lg">
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
                        <p className="font-medium">No se han calculado cobros para el período seleccionado.</p>
                        <Button variant="ghost" onClick={calculateBilling}>Iniciar cálculo ahora <ArrowRight className="ml-2 w-4 h-4"/></Button>
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

function WhatsAppIcon(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.068-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
        </svg>
    );
}
