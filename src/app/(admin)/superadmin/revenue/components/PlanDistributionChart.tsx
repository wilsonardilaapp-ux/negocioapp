'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanDistributionChartProps {
  data: {
    free: number;
    pro: number;
    enterprise: number;
  };
  isLoading: boolean;
}

const COLORS = {
  free: '#a0aec0', // gray-500
  pro: '#3b82f6', // blue-500
  enterprise: '#f59e0b', // amber-500
};

export function PlanDistributionChart({ data, isLoading }: PlanDistributionChartProps) {
  const chartData = [
    { name: 'Free', value: data.free },
    { name: 'Pro', value: data.pro },
    { name: 'Enterprise', value: data.enterprise },
  ];
  
  const total = data.free + data.pro + data.enterprise;

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
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                return (
                  <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} clientes`, 'Cantidad']} />
            <Legend 
              formatter={(value, entry) => {
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
