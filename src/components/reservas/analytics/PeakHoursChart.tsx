'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Clock } from 'lucide-react';

interface Props {
  data: { hour: string, count: number }[];
}

export function PeakHoursChart({ data }: Props) {
  return (
    <Card className="rounded-3xl shadow-sm border-gray-100 overflow-hidden">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Clock className="h-5 w-5" />
            </div>
            <div>
                <CardTitle className="text-lg">Demanda Horaria</CardTitle>
                <CardDescription className="text-xs">Distribución de citas atendidas por bloque de hora.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, right: 10, top: 10 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tickMargin={10}
                className="text-[10px] font-bold text-gray-500"
              />
              <YAxis axisLine={false} tickLine={false} className="text-[10px] font-bold text-gray-500" />
              <Tooltip 
                content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                        return (
                            <div className="bg-white p-3 rounded-xl border shadow-xl text-[10px] text-center">
                                <p className="font-black uppercase text-muted-foreground mb-1">{payload[0].payload.hour}</p>
                                <p className="text-primary font-black text-sm">{payload[0].value} citas</p>
                            </div>
                        );
                    }
                    return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
