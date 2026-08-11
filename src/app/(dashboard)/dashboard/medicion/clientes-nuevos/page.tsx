'use client';

import { useMemo } from 'react';
import { useMetricAnalysis } from '../hooks/useMetricAnalysis';
import { MetricsService } from '../services/metrics.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { UserPlus, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Vista de análisis para la adquisición de clientes nuevos.
 */
export default function ClientesNuevosPage() {
  const { orders, isLoading } = useMetricAnalysis();

  const analysis = useMemo(() => {
    if (isLoading || !orders) return null;
    return MetricsService.analyzeNewClients(orders);
  }, [orders, isLoading]);

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
      <header>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Clientes Nuevos</h1>
        <p className="text-muted-foreground">Mide la efectividad de tu marketing y el crecimiento de tu base de datos.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Nuevos (30 días)</CardTitle>
            <UserPlus className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{analysis.currentValue}</div>
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
          <CardTitle>Adquisición Diaria</CardTitle>
          <CardDescription>Cantidad de clientes que realizaron su primera compra por día.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ value: { label: "Nuevos Clientes", color: "hsl(var(--primary))" } }} className="h-[350px] w-full">
            <BarChart data={analysis.history}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px] font-bold" />
              <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
