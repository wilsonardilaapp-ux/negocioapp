'use client';

import { useMemo, useState } from 'react';
import { useMetricAnalysis } from '../hooks/useMetricAnalysis';
import { MetricsService } from '../services/metrics.service';
import { formatCurrency } from '../utils/metrics-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Re-declare for TypeScript as jspdf-autotable extends jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * @fileOverview Vista de análisis para el ticket promedio de venta.
 * Agregada funcionalidad de exportación ejecutiva (Fase 3).
 */
export default function TicketPromedioPage() {
  const { orders, isLoading } = useMetricAnalysis();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

  const analysis = useMemo(() => {
    if (isLoading || !orders) return null;
    return MetricsService.analyzeAverageTicket(orders);
  }, [orders, isLoading]);

  const handleExportExcel = () => {
    if (!analysis) return;
    setIsExporting('excel');
    try {
      const data = analysis.history.map(item => ({
        'Fecha': item.date,
        'Ticket Promedio': item.value
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tendencia Diaria");
      XLSX.writeFile(wb, `Ticket_Promedio_Markix_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({ title: "Excel generado", description: "El reporte de ticket promedio se ha descargado." });
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
      
      // 1. Cabecera
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text("Reporte Ejecutivo: Análisis de Ticket Promedio", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-CO')}`, 14, 30);
      doc.text(`Periodo: Últimos 30 días`, 14, 35);

      // 2. Resumen de KPIs
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text("Resumen de Desempeño", 14, 48);
      
      doc.autoTable({
        startY: 52,
        head: [['Métrica', 'Valor']],
        body: [
          ['Ticket Promedio (30 días)', formatCurrency(analysis.currentValue)],
          ['Variación vs Periodo Anterior', `${analysis.growth >= 0 ? '+' : ''}${analysis.growth.toFixed(1)}%`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [74, 175, 80] }
      });

      // 3. Tabla de Evolución Diaria
      const nextY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Evolución Diaria del Ticket", 14, nextY);

      doc.autoTable({
        startY: nextY + 4,
        head: [['Fecha', 'Monto Promedio']],
        body: analysis.history.map(item => [item.date, formatCurrency(item.value)]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });

      doc.save(`Reporte_Ticket_Promedio_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Ticket Promedio</h1>
          <p className="text-muted-foreground">Analiza el valor medio de cada transacción en tu negocio.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            disabled={isExporting !== null}
            className="flex-1 md:flex-none font-bold gap-2"
          >
            {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
            Exportar Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            disabled={isExporting !== null}
            className="flex-1 md:flex-none font-bold gap-2"
          >
            {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-primary" />}
            Exportar PDF
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Promedio (30 días)</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{formatCurrency(analysis.currentValue)}</div>
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
          <CardTitle>Tendencia del Ticket</CardTitle>
          <CardDescription>Evolución del gasto medio por cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ value: { label: "Ticket Promedio", color: "hsl(var(--primary))" } }} className="h-[350px] w-full">
            <LineChart data={analysis.history}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px] font-bold" />
              <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold" tickFormatter={(v) => `$${v/1000}k`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-value)" }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
