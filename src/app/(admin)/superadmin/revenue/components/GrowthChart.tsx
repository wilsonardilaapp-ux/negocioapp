'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface GrowthChartProps {
  data: {
    month: string;
    mrr: number;
    newClients: number;
  }[];
  isLoading: boolean;
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

export function GrowthChart({ data, isLoading }: GrowthChartProps) {

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crecimiento de MRR y Clientes</CardTitle>
        <CardDescription>Últimos 6 meses.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" tickFormatter={formatCurrency} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => {
                  if (name === 'mrr') return [formatCurrency(value as number), 'MRR'];
                  return [value, 'Clientes Nuevos'];
              }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="mrr" stroke="#3b82f6" name="MRR" />
            <Line yAxisId="right" type="monotone" dataKey="newClients" stroke="#16a34a" name="Clientes Nuevos" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
