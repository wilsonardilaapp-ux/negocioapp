'use client';

import { useMemo, useState, useRef } from 'react';
import { useMetricAnalysis } from '../hooks/useMetricAnalysis';
import { MetricsService } from '../services/metrics.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { ShoppingBag, Loader2, Info, Copy, Check, Download, QrCode, Smartphone, Globe, Share2, MessageCircle, MapPin } from 'lucide-react';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { cn } from '@/lib/utils';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

const chartConfig = {
  value: {
    label: "Pedidos",
  },
} satisfies ChartConfig;

/**
 * @fileOverview Vista de análisis de pedidos segmentados por canal de entrada
 * y generador de enlaces de difusión con tracking y códigos QR descargables.
 */
export default function PedidosPorCanalPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { orders, isLoading } = useMetricAnalysis();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mesaNumber, setMesaNumber] = useState('1');
  const qrRef = useRef<HTMLDivElement>(null);

  // --- LÓGICA ANALÍTICA ---
  const channelData = useMemo(() => {
    if (isLoading || !orders) return [];
    return MetricsService.analyzeOrdersByChannel(orders);
  }, [orders, isLoading]);

  const totalOrders = useMemo(() => 
    channelData.reduce((sum, item) => sum + item.value, 0)
  , [channelData]);

  // --- LÓGICA DE GENERACIÓN DE ENLACES ---
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

  /**
   * Función universal para descargar códigos QR capturando el elemento por ID.
   */
  const handleDownloadSpecificQR = async (containerId: string, label: string) => {
    const element = document.getElementById(containerId);
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { 
        backgroundColor: '#ffffff', 
        scale: 3, // Mayor resolución para impresión
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

  if (isLoading) {
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

      {/* --- SECCIÓN 1: ANALÍTICA --- */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cuota de Mercado por Canal</CardTitle>
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

      {/* --- SECCIÓN 2: GENERADOR DE ENLACES --- */}
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

                            {/* Área del Código QR (Visualizador) */}
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

      {/* --- SECCIÓN 3: GENERADOR QR PARA MESAS --- */}
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
    </div>
  );
}
