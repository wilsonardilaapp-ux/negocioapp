
'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanDistributionChartProps {
  data: Record<string, number>;
  isLoading: boolean;
}

const COLORS = ["#3b82f6", "#f59e0b", "#a0aec0", "#ef4444", "#16a34a", "#8b5cf6"];

export function PlanDistributionChart({ data, isLoading }: PlanDistributionChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));
  
  const total = Object.values(data).reduce((sum, value) => sum + value, 0);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Planes</CardTitle>
        <CardDescription>Clientes por cada tipo de plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent === 0) return null;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (
                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} clientes`, 'Cantidad']} />
            <Legend 
              formatter={(value) => {
                  const item = chartData.find(d => d.name === value);
                  const percentage = total > 0 ? ((item?.value || 0) / total * 100).toFixed(1) : 0;
                  return <span className="text-sm text-muted-foreground">{value} ({percentage}%)</span>
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
