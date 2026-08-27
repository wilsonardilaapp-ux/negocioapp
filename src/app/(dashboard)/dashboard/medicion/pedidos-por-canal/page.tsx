'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { 
    Loader2, 
    Receipt, 
    BarChart3, 
    History,
    Search,
    Eye,
    FileSpreadsheet,
    FileText,
    Smartphone,
    Globe,
    Instagram,
    Facebook,
    QrCode,
    HelpCircle,
    Table as TableIcon,
    Download,
    Copy,
    Check,
    CheckCircle2,
    Info,
    MousePointer2,
    Zap,
    ArrowLeft
} from 'lucide-react';
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from '@/firebase';
import { doc, getDoc, collection, query, where, limit, orderBy } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import type { Order } from '@/models/order';
import type { Business } from '@/models/business';
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { cn, normalizePhoneNumber } from "@/lib/utils";

// --- CONFIGURACIÓN DE GRÁFICAS (SHADCN CHARTS) ---
const chartConfig = {
  presencial: { label: "Presencial", color: "#3b82f6" },
  online: { label: "Online", color: "#10b981" },
  whatsapp_link: { label: "Link WhatsApp", color: "#22c55e" },
  catalogo_web: { label: "Catálogo Web", color: "#6366f1" },
  qr: { label: "Código QR", color: "#f59e0b" },
  redes_sociales: { label: "Redes Sociales", color: "#ec4899" },
  import_manual: { label: "Importación", color: "#94a3b8" },
  web: { label: "Web", color: "#64748b" },
} satisfies ChartConfig;

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f43f5e"];

export default function PedidosPorCanalPage() {
  const { user, profile } = useUser();
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customTableNumber, setCustomTableNumber] = useState('');

  const businessRef = useMemoFirebase(() => 
    (firestore && user?.uid ? doc(firestore, 'businesses', user.uid) : null),
    [user?.uid, firestore]
  );
  const { data: business } = useDoc<Business>(businessRef);
  const businessType = (business?.category || 'Retail') as VerticalType;

  const ordersQuery = useMemoFirebase(() => 
    user ? collection(firestore, `businesses/${user.uid}/orders`) : null, 
  [firestore, user]);
  const { data: allOrders, isLoading: loadingOrders } = useCollection<Order>(ordersQuery);

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

  const marketingStats = useMemo(() => {
    if (!allOrders) return [];
    const counts: Record<string, number> = {};
    let total = 0;

    allOrders.forEach(o => {
        const origin = o.origin || 'web';
        counts[origin] = (counts[origin] || 0) + 1;
        total++;
    });

    return Object.entries(counts).map(([name, count]) => ({
        name: name.toUpperCase().replace('_', ' '),
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  }, [allOrders]);

  const filteredLogs = useMemo(() => {
    return logEvents.filter(e => {
        const term = searchClient.toLowerCase();
        const clientNameMatch = e.customerName?.toLowerCase().includes(term);
        const invoiceIdMatch = e.invoiceId?.toLowerCase().includes(term);
        const channelMatch = filterChannel === 'all' || e.channel === filterChannel;
        return (clientNameMatch || invoiceIdMatch) && channelMatch;
    });
  }, [logEvents, searchClient, filterChannel]);

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "Enlace copiado", description: "El link con tracking está listo para usar." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadQR = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
        const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        toast({ variant: 'destructive', title: "Error al generar QR" });
    }
  };

  const handleOpenDetail = async (invoiceId: string | null) => {
    if (!invoiceId || !user?.uid || !firestore) return;
    try {
      const docRef = doc(firestore, `businesses/${user.uid}/invoices`, invoiceId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSelectedInvoice({ id: snap.id, ...snap.data() } as Invoice);
        setIsDetailOpen(true);
      }
    } catch (e) { console.error(e); }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const handleExportExcel = () => {
    setIsExporting('excel');
    try {
      const wb = XLSX.utils.book_new();

      // Hoja 1: Facturación Real (POS vs Online)
      const wsShares = XLSX.utils.json_to_sheet(channelShares.map(s => ({
        'Canal de Venta': s.name,
        'Ventas Realizadas (#)': s.count,
        'Monto Recaudado ($)': s.totalAmount,
        'Cuota de Participación (%)': `${s.percentage.toFixed(1)}%`
      })));
      XLSX.utils.book_append_sheet(wb, wsShares, "Facturación Real");

      // Hoja 2: Marketing y Tráfico (Leads)
      const wsMarketing = XLSX.utils.json_to_sheet(marketingStats.map(s => ({
        'Origen de Tráfico': s.name,
        'Pedidos Iniciados (#)': s.count,
        'Cuota de Interés (%)': `${s.percentage.toFixed(1)}%`
      })));
      XLSX.utils.book_append_sheet(wb, wsMarketing, "Marketing y Leads");

      // Hoja 3: Bitácora Detallada
      const wsLogs = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
        'Factura / Consecutivo': log.consecutiveNumber || 'N/A',
        'Canal Operativo': log.channel?.toUpperCase(),
        'Fuente de Tráfico': log.source?.toUpperCase(),
        'Cliente': log.customerName,
        'Monto Total ($)': log.total,
        'Fecha y Hora': log.createdAt?.toDate ? format(log.createdAt.toDate(), "dd/MM/yyyy HH:mm") : 'N/A'
      })));
      XLSX.utils.book_append_sheet(wb, wsLogs, "Bitácora de Rastreo");

      XLSX.writeFile(wb, `Reporte_Canales_Venta_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel generado", description: "El reporte multibook ha sido descargado." });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Error al exportar", description: "No se pudo generar el archivo Excel." });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = () => {
    setIsExporting('pdf');
    try {
      const doc = new jsPDF();
      const businessNameHeader = business?.name || 'Markix Business';
      const userEmail = user?.email || 'N/A';
      const now = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

      // 1. Encabezado Corporativo
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text("REPORTE EJECUTIVO: ORIGEN DE PEDIDOS", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Negocio: ${businessNameHeader.toUpperCase()}`, 14, 30);
      doc.text(`Generado por: ${userEmail}`, 14, 35);
      doc.text(`Fecha de emisión: ${now}`, 14, 40);

      // 2. Bloque 1: Facturación Real
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text("1. Cuota de Facturación Real (POS vs Online)", 14, 52);
      
      (doc as any).autoTable({
        startY: 56,
        head: [['Canal de Venta', 'Ventas (#)', 'Monto Recaudado', 'Cuota (%)']],
        body: channelShares.map(s => [s.name, s.count, formatCurrency(s.totalAmount), `${s.percentage.toFixed(1)}%`]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // Azul Markix
        margin: { bottom: 20 }
      });

      // 3. Bloque 2: Marketing y Leads
      const marketingY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("2. Rendimiento de Canales de Marketing (Leads)", 14, marketingY);
      
      (doc as any).autoTable({
        startY: marketingY + 4,
        head: [['Origen del Tráfico', 'Pedidos Iniciados', 'Cuota de Interés (%)']],
        body: marketingStats.map(s => [s.name, s.count, `${s.percentage.toFixed(1)}%`]),
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] }, // Naranja/Ambar
        margin: { bottom: 20 }
      });

      // 4. Bloque 3: Bitácora Detallada
      const logsY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("3. Bitácora Detallada de Eventos de Rastreo", 14, logsY);
      
      (doc as any).autoTable({
        startY: logsY + 4,
        head: [['Factura', 'Canal', 'Origen', 'Cliente', 'Monto', 'Fecha']],
        body: filteredLogs.map(log => [
          log.consecutiveNumber || 'N/A',
          log.channel?.toUpperCase(),
          log.source?.toUpperCase(),
          log.customerName,
          formatCurrency(log.total),
          log.createdAt?.toDate ? format(log.createdAt.toDate(), "dd/MM/yy HH:mm") : '---'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] }, // Slate 600
        styles: { fontSize: 8 },
        margin: { bottom: 15 }
      });

      doc.save(`Reporte_Origen_Pedidos_Markix_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado", description: "El reporte ejecutivo está listo para descarga." });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Error al exportar", description: "No se pudo generar el reporte PDF." });
    } finally {
      setIsExporting(null);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/catalog/${user?.uid}` : '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Origen de los Pedidos</h1>
          <p className="text-muted-foreground">Analiza y genera herramientas de difusión con rastreo inteligente.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting !== null} className="gap-2 font-bold border-primary text-primary hover:bg-primary/5">
            {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting !== null} className="gap-2 font-bold border-primary text-primary hover:bg-primary/5">
            {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-primary" />}
            PDF
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card>
             <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Ventas Facturadas (Canal Real)</CardTitle>
                    <CardDescription>Distribución de ingresos en los últimos 30 días.</CardDescription>
                  </div>
                  <BarChart3 className="text-primary h-6 w-6" />
                </div>
             </CardHeader>
             <CardContent className="h-[300px]">
                {isLoadingShares ? <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div> : channelShares.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <PieChart>
                      <Pie data={channelShares} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="totalAmount" nameKey="name">
                        {channelShares.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Legend verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ChartContainer>
                ) : <div className="h-full flex items-center justify-center text-muted-foreground opacity-20"><Receipt size={64} /></div>}
             </CardContent>
           </Card>

           <Card className="bg-primary/5 border-2">
             <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pedidos por Canal (Marketing)</CardTitle>
                    <CardDescription>Origen de todos los pedidos detectados por tracking.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white text-primary font-bold">Leads de Ventas</Badge>
                </div>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center h-[300px]">
                <div className="h-full">
                    {loadingOrders ? <Loader2 className="animate-spin mx-auto mt-20" /> : marketingStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={marketingStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name">
                                    {marketingStats.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <ChartTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center opacity-10"><Zap size={64} /></div>}
                </div>
                <div className="space-y-3">
                    <div className="p-3 bg-white rounded-xl border border-primary/10 space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground">Tip Estratégico</p>
                        <p className="text-[11px] text-primary leading-tight font-medium">Usa los enlaces de abajo para saber exactamente de dónde vienen tus clientes.</p>
                    </div>
                    <div className="space-y-2">
                        {marketingStats.slice(0, 3).map((s, i) => (
                            <div key={i} className="flex justify-between items-center text-xs">
                                <span className="font-bold flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    {s.name}
                                </span>
                                <span className="font-black text-slate-700">{s.count} ped.</span>
                            </div>
                        ))}
                    </div>
                </div>
             </CardContent>
           </Card>
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <QrCode className="text-primary" /> Generador de Enlaces con Tracking
            </h2>
            <p className="text-sm text-muted-foreground">Copia estos enlaces o descarga los códigos QR para tus campañas de marketing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
                { id: 'web', label: 'Catálogo Web', ref: 'web', icon: Globe, color: 'text-blue-600' },
                { id: 'whatsapp', label: 'WhatsApp', ref: 'whatsapp', icon: Smartphone, color: 'text-green-600' },
                { id: 'redes', label: 'Redes Sociales', ref: 'redes', icon: Instagram, color: 'text-pink-600' },
                { id: 'landing', label: 'Landing Page', ref: 'landing', icon: Facebook, color: 'text-indigo-600' },
                { id: 'qr', label: 'QR General', ref: 'qr', icon: QrCode, color: 'text-orange-600' },
            ].map((chan) => {
                const trackedUrl = `${baseUrl}?ref=${chan.ref}`;
                return (
                    <Card key={chan.id} className="overflow-hidden border-gray-100 hover:border-primary/20 transition-all group flex flex-col">
                        <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <chan.icon className={cn("h-4 w-4", chan.color)} /> {chan.label}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 flex-grow flex flex-col items-center justify-center">
                            <div id={`qr-${chan.id}`} className="bg-white p-2 rounded-xl border group-hover:scale-105 transition-transform duration-500">
                                <QRCode value={trackedUrl} size={100} level="M" />
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-muted-foreground hover:text-primary" onClick={() => handleDownloadQR(`qr-${chan.id}`, `QR_${chan.id}`)}>
                                <Download className="mr-1.5 h-3 w-3" /> Descargar PNG
                            </Button>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                            <div className="relative w-full">
                                <Input readOnly value={trackedUrl} className="h-8 text-[10px] pr-8 bg-muted/30 border-none font-mono" />
                                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8 text-primary" onClick={() => handleCopyLink(trackedUrl, chan.id)}>
                                    {copiedId === chan.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="lg:col-span-1">
             <CardHeader className="pb-3 border-b bg-primary/5">
                <CardTitle className="text-base flex items-center gap-2">
                    <TableIcon className="h-5 w-5 text-primary" /> QR para Mesas Específicas
                </CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6 text-center">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número o Nombre de Mesa</Label>
                    <Input placeholder="Ej: Terraza 4" value={customTableNumber} onChange={e => setCustomTableNumber(e.target.value)} className="h-11 font-bold" />
                </div>
                <div className="flex flex-col items-center gap-4 py-2">
                    <div id="qr-custom-mesa" className="p-4 bg-white rounded-xl shadow-inner border">
                        <QRCode value={`${baseUrl}?ref=mesa-${customTableNumber || 'general'}`} size={160} level="H" />
                    </div>
                    <Button className="w-full font-black h-12" onClick={() => handleDownloadQR('qr-custom-mesa', `QR_Mesa_${customTableNumber || 'Local'}`)}>
                        <Download className="mr-2 h-4 w-4" /> Descargar QR Mesa
                    </Button>
                </div>
             </CardContent>
           </Card>

           <Card className="lg:col-span-2 bg-slate-900 text-white overflow-hidden">
             <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/10 rounded-2xl text-primary"><HelpCircle size={32} /></div>
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tight text-white">¿Cómo usar el Tracking?</CardTitle>
                        <CardDescription className="text-white/40 uppercase font-bold text-[10px] tracking-widest">Domina tus métricas de marketing</CardDescription>
                    </div>
                </div>
             </CardHeader>
             <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { step: 1, title: 'Difusión', text: 'Copia el enlace de WhatsApp y pégalo en tu botón de respuesta automática o bio.' },
                    { step: 2, title: 'Operación Local', text: 'Imprime el QR General para tus mesas o vitrinas. Detectarás ventas presenciales.' },
                    { step: 3, title: 'Redes Sociales', text: 'Usa el link de Redes para medir cuántas personas que ven tu perfil terminan comprando.' },
                ].map(s => (
                    <div key={s.step} className="space-y-2 group">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-primary border border-white/5 transition-all group-hover:bg-primary group-hover:text-white">
                            {s.step}
                        </div>
                        <p className="font-bold text-sm">{s.title}</p>
                        <p className="text-xs text-white/60 leading-relaxed">{s.text}</p>
                    </div>
                ))}
             </CardContent>
           </Card>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <History className="text-primary h-5 w-5" />
              <CardTitle className="text-xl font-black uppercase tracking-tight">Bitácora de Rastreo</CardTitle>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por factura o cliente..." className="pl-10 h-10" value={searchClient} onChange={(e) => setSearchClient(e.target.value)} />
              </div>
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Canal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
             <Table>
               <TableHeader className="bg-muted/50">
                 <TableRow>
                   <TableHead className="pl-6 text-[10px] font-black uppercase">Nro Factura</TableHead>
                   <TableHead className="text-[10px] font-black uppercase">Canal</TableHead>
                   <TableHead className="text-[10px] font-black uppercase">Cliente</TableHead>
                   <TableHead className="text-right text-[10px] font-black uppercase">Monto</TableHead>
                   <TableHead className="text-center text-[10px] font-black uppercase">Fecha</TableHead>
                   <TableHead className="w-[80px]"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLogsLoading ? <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow> : filteredLogs.length > 0 ? ( 
                   filteredLogs.map(event => (
                     <TableRow key={event.trackingId} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-6 font-mono text-xs font-bold text-primary">{event.consecutiveNumber || 'S/N'}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-[9px] uppercase font-black tracking-widest">{event.channel}</Badge></TableCell>
                        <TableCell>
                           <div className="flex flex-col"><span className="text-xs font-bold text-slate-800">{event.customerName}</span><span className="text-[9px] text-muted-foreground uppercase">{event.source}</span></div>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900 text-xs">{formatCurrency(event.total)}</TableCell>
                        <TableCell className="text-center text-[10px] font-medium text-slate-500">{event.createdAt?.toDate ? format(event.createdAt.toDate(), "dd/MM/yyyy HH:mm") : '---'}</TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenDetail(event.invoiceId)}>
                            <Eye size={14} />
                          </Button>
                        </TableCell>
                     </TableRow>
                   ))
                 ) : <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic text-xs">Sin registros que coincidan con los filtros.</TableCell></TableRow>}
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
