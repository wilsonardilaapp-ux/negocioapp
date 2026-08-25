
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useMetricAnalysis } from '../hooks/useMetricAnalysis';
import { MetricsService } from '../services/metrics.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import { 
    ShoppingBag, 
    Loader2, 
    Info, 
    Copy, 
    Check, 
    Download, 
    QrCode, 
    Smartphone, 
    Globe, 
    Share2, 
    MessageCircle, 
    MapPin, 
    Receipt, 
    BarChart3, 
    History,
    Search,
    UserCheck,
    Eye,
    Calendar as CalendarIcon,
    ArrowRight
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { cn } from '@/lib/utils';
import { trackingQueryService, type ChannelShare } from '@/services/billing/tracking-query-service';
import { subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { doc, getDoc } from 'firebase/firestore';
import type { TrackingEvent } from '@/types/tracking';
import type { Invoice, VerticalType } from '@/types/billing';
import type { Business } from '@/models/business';
import { InvoiceDetailModal } from '@/components/billing/InvoiceDetailModal';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#0f172a'];

const chartConfig = {
  value: {
    label: "Pedidos",
  },
} satisfies ChartConfig;

const trackingChartConfig = {
  totalAmount: {
    label: "Recaudación ($)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

/**
 * @fileOverview Vista de análisis de pedidos segmentados por canal de entrada.
 * FASE 5: Bitácora Detallada de Trazabilidad con integración de InvoiceDetailModal.
 */
export default function PedidosPorCanalPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { orders, isLoading: isLoadingOrders } = useMetricAnalysis();
  
  // --- ESTADOS FASE 4 (RASTREO INTELIGENTE) ---
  const [channelShares, setChannelShares] = useState<ChannelShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mesaNumber, setMesaNumber] = useState('1');
  const qrRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS FASE 5 (BITÁCORA) ---
  const [logEvents, setLogEvents] = useState<TrackingEvent[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Filtros de Bitácora
  const [filterChannel, setFilterChannel] = useState('all');
  const [searchClient, setSearchClient] = useState('');

  // Obtener negocio para determinar VerticalType (para el modal)
  const businessRef = useMemoFirebase(() => 
    (firestore && user?.uid ? doc(firestore, 'businesses', user.uid) : null),
    [user?.uid, firestore]
  );
  const { data: business } = useDoc<Business>(businessRef);
  const businessType = (business?.category || 'Retail') as VerticalType;

  // --- LÓGICA ANALÍTICA FASE 4 ---
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
        console.error("[Fase 4] Error fetching channel shares:", e);
      } finally {
        setIsLoadingShares(false);
      }
    };

    fetchChannelShares();
  }, [user?.uid]);

  // --- LÓGICA ANALÍTICA FASE 5 (BITÁCORA) ---
  useEffect(() => {
    if (!user?.uid) return;

    const fetchLogs = async () => {
      setIsLogsLoading(true);
      try {
        const filters = {
          channel: filterChannel === 'all' ? undefined : filterChannel,
          // La búsqueda por cliente se realiza en memoria sobre los resultados recientes
          limit: 100
        };
        const { events } = await trackingQueryService.getTrackingEvents(user.uid, filters);
        setLogEvents(events);
      } catch (e) {
        console.error("[Fase 5] Error fetching logs:", e);
      } finally {
        setIsLogsLoading(false);
      }
    };

    fetchLogs();
  }, [user?.uid, filterChannel]);

  const filteredLogs = useMemo(() => {
    if (!searchClient) return logEvents;
    const term = searchClient.toLowerCase();
    return logEvents.filter(e => 
      e.customerName?.toLowerCase().includes(term) || 
      e.customerWhatsapp?.includes(term) ||
      e.sellerName?.toLowerCase().includes(term)
    );
  }, [logEvents, searchClient]);

  const handleOpenDetail = async (invoiceId: string | null) => {
    if (!invoiceId || !user?.uid || !firestore) return;
    
    try {
      const docRef = doc(firestore, `businesses/${user.uid}/invoices`, invoiceId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSelectedInvoice({ id: snap.id, ...snap.data() } as Invoice);
        setIsDetailOpen(true);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'No se encontró el detalle de esta venta.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error técnico', description: 'Fallo al recuperar la factura.' });
    }
  };

  const totalTrackedRevenue = useMemo(() => 
    channelShares.reduce((sum, item) => sum + item.totalAmount, 0)
  , [channelShares]);

  // --- LÓGICA ANALÍTICA EXISTENTE ---
  const channelData = useMemo(() => {
    if (isLoadingOrders || !orders) return [];
    return MetricsService.analyzeOrdersByChannel(orders);
  }, [orders, isLoadingOrders]);

  const totalOrders = useMemo(() => 
    channelData.reduce((sum, item) => sum + item.value, 0)
  , [channelData]);

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined' || !user?.uid) return '';
    return `${window.location.origin}/catalog/${user.uid}`;
  }, [user?.uid]);

  const channels = useMemo(() => [
    { id: 'web', label: 'Catálogo Web', ref: 'web', icon: Globe },
    { id: 'whatsapp', label: 'WhatsApp (Mensajes)', ref: 'whatsapp', icon: MessageCircle },
    { id: 'redes', label: 'Redes Sociales (Bio)', ref: 'redes', icon: Share2 },
    { id: 'landing', label: 'Landing Page', ref: 'landing', icon: Smartphone },
    { id: 'qr', label: 'Código QR General', ref: 'qr', icon: QrCode },
  ], []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: "Enlace copiado", description: `El enlace con tracking para ${key} está en tu portapapeles.` });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadSpecificQR = async (containerId: string, label: string) => {
    const element = document.getElementById(containerId);
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { 
        backgroundColor: '#ffffff', 
        scale: 3, 
        logging: false,
        useCORS: true 
      });
      const link = document.createElement('a');
      link.download = `QR_Markix_${label.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: "QR Descargado", description: `Imagen para ${label} guardada correctamente.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la imagen del QR.' });
    }
  };

  const handleDownloadQR = async () => {
    if (!qrRef.current) return;
    try {
      const canvas = await html2canvas(qrRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `QR_Mesa_${mesaNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast({ title: "QR Descargado", description: `Imagen lista para imprimir para la Mesa ${mesaNumber}.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar la imagen del QR.' });
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  if (isLoadingOrders) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Origen de los Pedidos</h1>
        <p className="text-muted-foreground">Analiza y genera herramientas de difusión con rastreo inteligente.</p>
      </header>

      {/* --- SECCIÓN 1: TRAZABILIDAD TOTAL --- */}
      <section className="space-y-6 animate-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3">
          <div className="h-1 bg-primary w-12 rounded-full"></div>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Análisis de Trazabilidad Total (POS + Online)</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
           <Card className="lg:col-span-2 border-2 border-primary/10 shadow-lg">
             <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Cuota de Mercado Real</CardTitle>
                    <CardDescription>Distribución de ingresos por canal de venta facturado (Últimos 30 días).</CardDescription>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-xl text-primary">
                    <BarChart3 size={24} />
                  </div>
                </div>
             </CardHeader>
             <CardContent className="h-[350px]">
                {isLoadingShares ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs font-bold uppercase text-muted-foreground">Analizando facturación...</span>
                  </div>
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
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Legend verticalAlign="bottom" align="center" iconType="circle" />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Receipt className="h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">Sin datos de facturación rastreada.</p>
                  </div>
                )}
             </CardContent>
           </Card>

           <Card className="h-full border-2 border-slate-100 shadow-md overflow-hidden">
             <CardHeader className="bg-slate-50/50 border-b">
               <CardTitle className="text-base uppercase font-black tracking-widest text-slate-600">Desglose de Facturación</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-[10px] font-black uppercase">Canal</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center">Ventas</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right pr-6">Recaudado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channelShares.map((share, i) => (
                      <TableRow key={share.name} className="h-12 border-slate-50">
                        <TableCell className="pl-6">
                           <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-[11px] font-bold text-slate-700 uppercase">{share.name}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-xs">{share.count}</TableCell>
                        <TableCell className="text-right pr-6">
                           <div className="flex flex-col">
                              <span className="text-xs font-black text-primary">{formatCurrency(share.totalAmount)}</span>
                              <span className="text-[9px] font-bold text-muted-foreground">{share.percentage.toFixed(1)}% de cuota</span>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {channelShares.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic text-xs">
                          No hay transacciones POS registradas recientemente.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {channelShares.length > 0 && (
                    <TableFooter className="bg-slate-900 text-white">
                       <TableRow>
                          <TableCell className="font-black text-[10px] uppercase pl-6">Total General</TableCell>
                          <TableCell className="text-center font-black">{channelShares.reduce((s, item) => s + item.count, 0)}</TableCell>
                          <TableCell className="text-right pr-6 font-black">{formatCurrency(totalTrackedRevenue)}</TableCell>
                       </TableRow>
                    </TableFooter>
                  )}
                </Table>
             </CardContent>
           </Card>
        </div>
      </section>

      {/* --- SECCIÓN 2: ANALÍTICA DE PEDIDOS (MARKETING) --- */}
      <div className="flex items-center gap-3 pt-6">
        <div className="h-1 bg-slate-300 w-12 rounded-full"></div>
        <h2 className="text-xl font-black text-gray-400 uppercase tracking-tighter">Métricas de Marketing (Pedidos Iniciados)</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pedidos por Canal (Marketing)</CardTitle>
            <CardDescription>Distribución porcentual de los pedidos en los últimos 30 días.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {totalOrders > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ShoppingBag className="h-10 w-10 opacity-20" />
                <p className="font-medium">No hay datos de pedidos suficientes.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Desglose por Canal</CardTitle>
            <CardDescription>Cantidades por punto de entrada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channelData.map((channel, i) => {
              const percentage = totalOrders > 0 ? ((channel.value / totalOrders) * 100).toFixed(1) : "0";
              return (
                <div key={channel.name} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-bold">{channel.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black">{channel.value}</p>
                    <p className="text-[10px] text-muted-foreground">{percentage}%</p>
                  </div>
                </div>
              );
            })}
            
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-6 flex gap-3 items-start">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-tight">
                <strong>Tip:</strong> Usa los enlaces de abajo para saber exactamente de dónde vienen tus clientes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- SECCIÓN 3: GENERADOR DE ENLACES (INTACTO) --- */}
      <Card className="border-2 border-primary/10 shadow-lg overflow-hidden">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
                <Share2 className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle className="text-xl font-black">Generador de Enlaces con Tracking</CardTitle>
                <CardDescription>Copia estos enlaces o descarga los códigos QR para tus campañas de marketing.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {channels.map((channel) => {
                    const trackedUrl = `${baseUrl}?ref=${channel.ref}`;
                    const isCopied = copiedKey === channel.id;
                    const qrContainerId = `qr-wrap-${channel.id}`;

                    return (
                        <div key={channel.id} className="p-5 border rounded-[2rem] bg-white shadow-sm hover:border-primary/30 transition-all group flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-xl text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                                        <channel.icon className="h-5 w-5" />
                                    </div>
                                    <Label className="font-bold text-base">{channel.label}</Label>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter bg-primary/5">?ref={channel.ref}</Badge>
                            </div>

                            <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-4">
                                <div 
                                    id={qrContainerId}
                                    className="p-3 bg-white rounded-2xl border-2 border-gray-50 shadow-sm group-hover:shadow-md transition-shadow"
                                >
                                    <QRCode 
                                        value={trackedUrl}
                                        size={120}
                                        level="M"
                                    />
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary gap-1.5"
                                    onClick={() => handleDownloadSpecificQR(qrContainerId, channel.label)}
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Descargar PNG
                                </Button>
                            </div>

                            <div className="flex flex-col gap-2 mt-auto border-t pt-4">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Enlace rastreable</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        readOnly 
                                        value={trackedUrl} 
                                        className="bg-muted/50 border-none h-10 text-[10px] font-mono focus-visible:ring-0"
                                    />
                                    <Button 
                                        size="sm" 
                                        variant={isCopied ? "default" : "outline"}
                                        className={cn("h-10 font-bold px-4 transition-all rounded-xl", isCopied && "bg-green-600 hover:bg-green-600")}
                                        onClick={() => handleCopy(trackedUrl, channel.id)}
                                    >
                                        {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </CardContent>
      </Card>

      {/* --- SECCIÓN 4: QR PARA MESAS (INTACTO) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-2 border-primary/10 shadow-lg">
              <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <MapPin className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black">QR para Mesas Específicas</CardTitle>
                        <CardDescription>Genera un código QR único para cada mesa de tu local.</CardDescription>
                    </div>
                  </div>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                          <Label htmlFor="mesa-number" className="font-bold">Número o Nombre de la Mesa</Label>
                          <div className="flex gap-4">
                            <Input 
                                id="mesa-number"
                                placeholder="Ej: 5, VIP-1, Terraza-2..."
                                value={mesaNumber}
                                onChange={(e) => setMesaNumber(e.target.value)}
                                className="h-12 text-lg font-bold"
                            />
                            <Button size="lg" className="px-8 font-black" onClick={handleDownloadQR}>
                                <Download className="mr-2 h-5 w-5" />
                                Descargar QR
                            </Button>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-muted/30 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-4">
                      <div ref={qrRef} className="p-4 bg-white rounded-2xl shadow-xl border-4 border-white">
                          <QRCode 
                            value={`${baseUrl}?ref=mesa-${mesaNumber.toLowerCase().replace(/\s+/g, '-')}`}
                            size={200}
                            level="H"
                          />
                      </div>
                      <div className="text-center">
                          <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">Mesa: {mesaNumber}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Escanea para pedir desde la mesa</p>
                      </div>
                  </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t p-4 text-[10px] text-center text-muted-foreground font-medium italic">
                  * El sistema detectará automáticamente la mesa en el pedido del cliente.
              </CardFooter>
          </Card>

          <Card className="flex flex-col justify-center border-none shadow-none bg-transparent">
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">¿Cómo usar el Tracking?</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        Al usar el parámetro <code>?ref=</code> en tus enlaces, Markix "marca" el pedido del cliente en la base de datos.
                    </p>
                </div>
                
                <div className="grid gap-4">
                    <div className="flex gap-4 p-4 bg-white rounded-2xl border shadow-sm">
                        <div className="h-10 w-10 shrink-0 bg-green-50 rounded-full flex items-center justify-center text-green-600 font-black">1</div>
                        <p className="text-sm text-gray-600">
                            <strong>Difusión:</strong> Envía el link de WhatsApp a tus listas de difusión. Sabrás cuántos pedidos generó ese mensaje específico.
                        </p>
                    </div>
                    <div className="flex gap-4 p-4 bg-white rounded-2xl border shadow-sm">
                        <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black">2</div>
                        <p className="text-sm text-gray-600">
                            <strong>Operación Local:</strong> Imprime los códigos QR por mesa. Al recibir el pedido, verás la etiqueta "Mesa X" para saber a dónde llevar el despacho.
                        </p>
                    </div>
                    <div className="flex gap-4 p-4 bg-white rounded-2xl border shadow-sm">
                        <div className="h-10 w-10 shrink-0 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 font-black">3</div>
                        <p className="text-sm text-gray-600">
                            <strong>Redes Sociales:</strong> Usa el link de Redes en tu Bio de Instagram. Mide el ROI real de tu presencia social.
                        </p>
                    </div>
                </div>
              </div>
          </Card>
      </div>

      {/* --- NUEVA SECCIÓN FASE 5: BITÁCORA DETALLADA --- */}
      <Card className="rounded-[2rem] border-2 border-slate-100 shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <History size={24} />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Bitácora de Eventos de Rastreo</CardTitle>
                <CardDescription className="text-xs font-bold text-primary/70 uppercase tracking-widest">Auditoría de Ventas por Punto de Origen</CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar cliente, vendedor o WhatsApp..." 
                    className="pl-10 h-10 bg-white border-2 rounded-xl focus-visible:ring-primary/20"
                    value={searchClient}
                    onChange={(e) => setSearchClient(e.target.value)}
                  />
              </div>
              
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="h-10 w-40 bg-white border-2 rounded-xl font-bold text-xs">
                    <SelectValue placeholder="Filtrar Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Canales</SelectItem>
                  <SelectItem value="presencial">Presencial (POS)</SelectItem>
                  <SelectItem value="online">Online (Catálogo)</SelectItem>
                  <SelectItem value="directo">Link Directo</SelectItem>
                  <SelectItem value="redes_sociales">Redes Sociales</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
             <Table>
               <TableHeader className="bg-slate-50">
                 <TableRow>
                   <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Venta / Folio</TableHead>
                   <TableHead className="text-[10px] font-black uppercase tracking-widest">Canal de Origen</TableHead>
                   <TableHead className="text-[10px] font-black uppercase tracking-widest">Vendedor</TableHead>
                   <TableHead className="text-[10px] font-black uppercase tracking-widest">Cliente</TableHead>
                   <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-6">Total</TableHead>
                   <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Fecha</TableHead>
                   <TableHead className="w-[100px] pr-6"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLogsLoading ? (
                   <TableRow>
                     <TableCell colSpan={7} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-[10px] font-black uppercase">Recuperando registros...</span>
                        </div>
                     </TableCell>
                   </TableRow>
                 ) : filteredLogs.length > 0 ? (
                   filteredLogs.map(event => (
                     <TableRow key={event.trackingId} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 font-mono text-[11px] font-bold text-primary">
                          {event.invoiceId?.slice(-8).toUpperCase() || '---'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                             <Badge variant="secondary" className="w-fit text-[9px] font-black uppercase py-0 px-2 mb-0.5">
                                {event.channel}
                             </Badge>
                             <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                               {event.source.replace('_', ' ')}
                             </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-600">
                           {event.sellerName || 'Auto-venta'}
                        </TableCell>
                        <TableCell>
                           <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-800 uppercase">{event.customerName}</span>
                              <span className="text-[9px] font-bold text-muted-foreground flex items-center gap-1">
                                <Smartphone size={10} className="text-green-500" />
                                {event.customerWhatsapp || 'N/A'}
                              </span>
                           </div>
                        </TableCell>
                        <TableCell className="text-right pr-6 font-black text-slate-900 text-xs">
                          {formatCurrency(event.total)}
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500">
                                {event.createdAt?.toDate ? format(event.createdAt.toDate(), "dd/MM/yyyy") : '---'}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                {event.createdAt?.toDate ? format(event.createdAt.toDate(), "hh:mm a") : '---'}
                              </span>
                           </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 rounded-xl font-bold gap-2 text-primary hover:bg-primary/5"
                            onClick={() => handleOpenDetail(event.invoiceId)}
                          >
                            <Eye size={14} /> Detalle
                          </Button>
                        </TableCell>
                     </TableRow>
                   ))
                 ) : (
                   <TableRow>
                     <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                       <p className="text-xs font-bold uppercase tracking-widest opacity-20">No se encontraron eventos rastreados.</p>
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalle Compartido */}
      <InvoiceDetailModal 
        invoice={selectedInvoice}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        businessType={businessType}
      />
    </div>
  );
}

function Table({ children, className }: { children: React.ReactNode, className?: string }) {
    return <table className={cn("w-full text-sm", className)}>{children}</table>;
}

function TableHeader({ children, className }: { children: React.ReactNode, className?: string }) {
    return <thead className={cn("border-b", className)}>{children}</thead>;
}

function TableRow({ children, className }: { children: React.ReactNode, className?: string }) {
    return <tr className={cn("border-b transition-colors hover:bg-muted/50", className)}>{children}</tr>;
}

function TableHead({ children, className }: { children: React.ReactNode, className?: string }) {
    return <th className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground", className)}>{children}</th>;
}

function TableBody({ children, className }: { children: React.ReactNode, className?: string }) {
    return <tbody className={cn("[&_tr:last-child]:border-0", className)}>{children}</tbody>;
}

function TableCell({ children, className }: { children: React.ReactNode, className?: string }) {
    return <td className={cn("p-2 align-middle", className)}>{children}</td>;
}

function TableFooter({ children, className }: { children: React.ReactNode, className?: string }) {
    return <tfoot className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}>{children}</tfoot>;
}
