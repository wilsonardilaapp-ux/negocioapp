
'use client';

import { useMemo, useState } from 'react';
import { useMetricAnalysis } from '../hooks/useMetricAnalysis';
import { MetricsService } from '../services/metrics.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Users, TrendingUp, TrendingDown, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * @fileOverview Vista de análisis para la retención de clientes recurrentes.
 * Se han integrado capacidades de exportación ejecutiva a Excel y PDF.
 */
export default function ClientesRecurrentesPage() {
  const { orders, isLoading } = useMetricAnalysis();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

  const analysis = useMemo(() => {
    if (isLoading || !orders) return null;
    return MetricsService.analyzeRetention(orders);
  }, [orders, isLoading]);

  const handleExportExcel = () => {
    if (!analysis) return;
    setIsExporting('excel');
    try {
      const data = analysis.history.map(item => ({
        'Fecha': item.date,
        'Tasa de Recurrencia (%)': `${item.value}%`
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial de Retención");
      XLSX.writeFile(wb, `Reporte_Retencion_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({ title: "Excel generado", description: "El reporte se ha descargado correctamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el archivo Excel." });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = () => {
    if (!analysis) return;
    setIsExporting('pdf');
    try {
      const doc = new jsPDF();
      
      // 1. Encabezado Corporativo
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text("Reporte de Retención y Lealtad", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Periodo analizado: Últimos 30 días`, 14, 35);

      // 2. Resumen Ejecutivo (KPIs)
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text("Resumen de Desempeño", 14, 48);

      (doc as any).autoTable({
        startY: 52,
        head: [['Métrica de Retención', 'Valor']],
        body: [
          ['Tasa de Retención (30 días)', `${analysis.currentValue}%`],
          ['Variación vs Periodo Anterior', `${analysis.growth >= 0 ? '+' : ''}${analysis.growth.toFixed(1)}%`],
          ['Promedio Diario de Recurrencia', `${(analysis.history.reduce((s, i) => s + i.value, 0) / analysis.history.length).toFixed(1)}%`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });

      // 3. Tabla de Historial Diario
      const nextY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Desglose Diario de Recurrencia", 14, nextY);

      (doc as any).autoTable({
        startY: nextY + 4,
        head: [['Fecha', 'Tasa de Retención (%)']],
        body: analysis.history.map(item => [item.date, `${item.value}%`]),
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105] }
      });

      doc.save(`Reporte_Retencion_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado", description: "El reporte ejecutivo está listo." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el reporte PDF." });
    } finally {
      setIsExporting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Retención de Clientes</h1>
          <p className="text-muted-foreground">Mide la lealtad analizando cuántos clientes vuelven a comprar.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            disabled={isExporting !== null}
            className="flex-1 md:flex-none font-bold gap-2 border-primary text-primary hover:bg-primary/5"
          >
            {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting !== null}
            className="flex-1 md:flex-none font-bold gap-2 border-primary text-primary hover:bg-primary/5"
          >
            {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-primary" />}
            PDF
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Tasa de Retención (%)</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{analysis.currentValue}%</div>
            <div className="flex items-center gap-1 mt-1">
              {analysis.growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                "text-xs font-bold",
                analysis.growth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {analysis.growth.toFixed(1)}% vs periodo anterior
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Recurrencia</CardTitle>
          <CardDescription>% de clientes recurrentes sobre el total de compradores diarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ value: { label: "Tasa de Retención", color: "hsl(var(--primary))" } }} className="h-[350px] w-full">
            <LineChart data={analysis.history}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px] font-bold" />
              <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold" tickFormatter={(v) => `${v}%`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-value)" }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
