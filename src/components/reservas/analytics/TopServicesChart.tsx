'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Trophy } from 'lucide-react';

interface Props {
  data: { name: string, count: number, revenue: number }[];
}

const COLORS = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export function TopServicesChart({ data }: Props) {
  return (
    <Card className="rounded-3xl shadow-sm border-gray-100 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Trophy className="h-5 w-5" />
            </div>
            <div>
                <CardTitle className="text-lg">Servicios más Rentables</CardTitle>
                <CardDescription className="text-xs">Top 5 servicios por facturación en el periodo.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                width={120}
                className="text-[10px] font-bold text-gray-500"
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                            <div className="bg-white p-3 rounded-xl border shadow-xl text-[10px] space-y-1">
                                <p className="font-black uppercase">{item.name}</p>
                                <p className="text-primary font-bold">Total: ${item.revenue.toLocaleString()}</p>
                                <p className="text-muted-foreground">{item.count} citas atendidas</p>
                            </div>
                        );
                    }
                    return null;
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={25}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
