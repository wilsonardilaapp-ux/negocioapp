'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { 
    Loader2, 
    Receipt, 
    BarChart3, 
    History,
    Search,
    Eye,
    FileSpreadsheet,
    FileText
} from 'lucide-react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { trackingQueryService, type ChannelShare } from '@/services/billing/tracking-query-service';
import { subDays, startOfDay, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TrackingEvent } from '@/types/tracking';
import type { Invoice, VerticalType } from '@/types/billing';
import type { Business } from '@/models/business';
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#0f172a'];

const trackingChartConfig = {
  totalAmount: {
    label: "Recaudación ($)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function PedidosPorCanalPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [channelShares, setChannelShares] = useState<ChannelShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

  const [logEvents, setLogEvents] = useState<TrackingEvent[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [filterChannel, setFilterChannel] = useState('all');
  const [searchClient, setSearchClient] = useState('');

  const businessRef = useMemoFirebase(() => 
    (firestore && user?.uid ? doc(firestore, 'businesses', user.uid) : null),
    [user?.uid, firestore]
  );
  const { data: business } = useDoc<Business>(businessRef);
  const businessType = (business?.category || 'Retail') as VerticalType;

  useEffect(() => {
    if (!user?.uid) return;

    const fetchChannelShares = async () => {
      setIsLoadingShares(true);
      try {
        const endDate = new Date();
        const startDate = startOfDay(subDays(endDate, 30));
        const shares = await trackingQueryService.getChannelShare(user.uid, startDate, endDate);
        setChannelShares(shares);
      } catch (e) {
        console.error("[Tracking] Error fetching channel shares:", e);
      } finally {
        setIsLoadingShares(false);
      }
    };

    fetchChannelShares();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchLogs = async () => {
      setIsLogsLoading(true);
      try {
        const filters = {
          channel: filterChannel === 'all' ? undefined : filterChannel,
          limit: 100
        };
        const { events } = await trackingQueryService.getTrackingEvents(user.uid, filters);
        setLogEvents(events);
      } catch (e) {
        console.error("[Bitácora] Error fetching logs:", e);
      } finally {
        setIsLogsLoading(false);
      }
    };

    fetchLogs();
  }, [user?.uid, filterChannel]);

  const filteredLogs = useMemo(() => {
    let result = logEvents;

    if (filterChannel !== 'all') {
      result = result.filter(e => e.channel === filterChannel);
    }

    if (searchClient) {
      const term = searchClient.toLowerCase();
      result = result.filter(e => 
        e.customerName?.toLowerCase().includes(term) || 
        e.customerWhatsapp?.includes(term) ||
        e.invoiceId?.toLowerCase().includes(term) ||
        e.orderId?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [logEvents, searchClient, filterChannel]);

  const handleOpenDetail = async (invoiceId: string | null) => {
    if (!invoiceId || !user?.uid || !firestore) return;
    
    try {
      const docRef = doc(firestore, `businesses/${user.uid}/invoices`, invoiceId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSelectedInvoice({ id: snap.id, ...snap.data() } as Invoice);
        setIsDetailOpen(true);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el registro.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error técnico' });
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const handleExportExcel = () => {
    setIsExporting('excel');
    try {
      const wb = XLSX.utils.book_new();
      const summaryData = channelShares.map(s => ({
        'Canal': s.name,
        'Ventas': s.count,
        'Monto ($)': s.totalAmount,
        'Porcentaje (%)': `${s.percentage.toFixed(1)}%`
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Cuota de Mercado");

      const logData = filteredLogs.map(e => ({
        'Fecha': e.createdAt?.toDate ? format(e.createdAt.toDate(), "dd/MM/yyyy HH:mm") : '---',
        'Venta/Pedido': e.invoiceId || e.orderId || '---',
        'Canal': e.channel,
        'Cliente': e.customerName,
        'Monto ($)': e.total
      }));
      const wsLogs = XLSX.utils.json_to_sheet(logData);
      XLSX.utils.book_append_sheet(wb, wsLogs, "Bitácora");

      XLSX.writeFile(wb, `Reporte_Canales_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel generado" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al exportar' });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = () => {
    setIsExporting('pdf');
    try {
      const doc = new jsPDF();
      doc.text("Reporte de Origen de Pedidos", 14, 20);
      
      (doc as any).autoTable({
        startY: 30,
        head: [['Canal', 'Ventas', 'Total Recaudado', 'Cuota (%)']],
        body: channelShares.map(s => [s.name, s.count, formatCurrency(s.totalAmount), `${s.percentage.toFixed(1)}%`]),
      });

      doc.save(`Reporte_Canales_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado" });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al exportar' });
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Origen de los Pedidos</h1>
          <p className="text-muted-foreground">Analiza y genera herramientas de difusión con rastreo inteligente.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting !== null} className="gap-2 font-bold border-primary text-primary hover:bg-primary/5">
            <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting !== null} className="gap-2 font-bold border-primary text-primary hover:bg-primary/5">
            <FileText className="h-4 w-4 text-primary" /> PDF
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
           <Card className="lg:col-span-2">
             <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cuota de Mercado</CardTitle>
                    <CardDescription>Distribución de ingresos por canal (Últimos 30 días).</CardDescription>
                  </div>
                  <BarChart3 className="text-primary h-6 w-6" />
                </div>
             </CardHeader>
             <CardContent className="h-[350px]">
                {isLoadingShares ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                ) : channelShares.length > 0 ? (
                  <ChartContainer config={trackingChartConfig} className="h-full w-full">
                    <PieChart>
                      <Pie
                        data={channelShares}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="totalAmount"
                        nameKey="name"
                      >
                        {channelShares.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Legend verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground opacity-50">
                    <Receipt size={48} />
                  </div>
                )}
             </CardContent>
           </Card>

           <Card>
             <CardHeader><CardTitle>Desglose de Ventas</CardTitle></CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channelShares.map((share, i) => (
                      <TableRow key={share.name}>
                        <TableCell className="pl-4 py-2 flex items-center gap-2">
                           <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                           <span className="text-xs font-bold uppercase">{share.name}</span>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">{share.count}</TableCell>
                        <TableCell className="text-right pr-4 text-xs font-black text-primary">{formatCurrency(share.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </CardContent>
           </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <History className="text-primary h-5 w-5" />
              <CardTitle>Bitácora de Rastreo</CardTitle>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar cliente o pedido..." 
                    className="pl-10 h-10"
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                  />
              </div>
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Canal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="redes_sociales">Redes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="pl-6">ID</TableHead>
                   <TableHead>Canal</TableHead>
                   <TableHead>Cliente</TableHead>
                   <TableHead className="text-right">Total</TableHead>
                   <TableHead className="text-center">Fecha</TableHead>
                   <TableHead className="w-[100px]"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLogsLoading ? (
                   <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                 ) : filteredLogs.length > 0 ? ( 
                   filteredLogs.map(event => (
                     <TableRow key={event.trackingId}>
                        <TableCell className="pl-6 font-mono text-[10px]">{event.invoiceId?.slice(-8) || event.orderId?.slice(-8)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[9px] uppercase">{event.channel}</Badge>
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                              <span className="text-xs font-bold">{event.customerName}</span>
                              <span className="text-[10px] text-muted-foreground">{event.customerWhatsapp || 'N/A'}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs">{formatCurrency(event.total)}</TableCell>
                        <TableCell className="text-center text-[10px]">
                           {event.createdAt?.toDate ? format(event.createdAt.toDate(), "dd/MM/yyyy HH:mm") : '---'}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                            onClick={() => handleOpenDetail(event.invoiceId)}
                          >
                            <Eye size={14} />
                          </button>
                        </TableCell>
                     </TableRow>
                   ))
                 ) : (
                   <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground opacity-50">Sin registros</TableCell></TableRow>
                 )}
               </TableBody>
             </Table>
        </CardContent>
      </Card>

      <InvoiceDetailModal 
        invoice={selectedInvoice}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        businessType={businessType}
      />
    </div>
  );
}