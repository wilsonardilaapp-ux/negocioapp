'use client';

import { useMemo } from 'react';
import { useMetricAnalysis } from '../hooks/useMetricAnalysis';
import { MetricsService } from '../services/metrics.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { ShoppingBag, Loader2, Info } from 'lucide-react';

const COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

/**
 * @fileOverview Vista de análisis de pedidos segmentados por canal de entrada.
 */
export default function PedidosPorCanalPage() {
  const { orders, isLoading } = useMetricAnalysis();

  const channelData = useMemo(() => {
    if (isLoading || !orders) return [];
    return MetricsService.analyzeOrdersByChannel(orders);
  }, [orders, isLoading]);

  const totalOrders = useMemo(() => 
    channelData.reduce((sum, item) => sum + item.value, 0)
  , [channelData]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Origen de los Pedidos</h1>
        <p className="text-muted-foreground">Descubre desde qué canales están comprando tus clientes.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cuota de Mercado por Canal</CardTitle>
            <CardDescription>Distribución porcentual de los pedidos en los últimos 30 días.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {totalOrders > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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
              </ResponsiveContainer>
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
            <CardTitle>Desglose</CardTitle>
            <CardDescription>Cantidades por canal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channelData.map((channel, i) => {
              const percentage = ((channel.value / totalOrders) * 100).toFixed(1);
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
                <strong>Tip:</strong> Agrega el parámetro <code>?ref=nombre</code> a tus links para rastrear campañas personalizadas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
