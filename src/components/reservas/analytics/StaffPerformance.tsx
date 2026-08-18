'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, User, ArrowUpRight } from 'lucide-react';

interface Props {
  data: {
    id: string;
    name: string;
    specialty: string;
    count: number;
    revenue: number;
  }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function StaffPerformance({ data }: Props) {
  return (
    <Card className="rounded-3xl shadow-sm border-gray-100 overflow-hidden h-full">
      <CardHeader className="bg-muted/10 border-b">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Users className="h-5 w-5" />
            </div>
            <div>
                <CardTitle className="text-lg">Rendimiento del Equipo</CardTitle>
                <CardDescription className="text-xs">Productividad y facturación por especialista.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest pl-8">Especialista</TableHead>
              <TableHead className="text-center font-bold text-[10px] uppercase tracking-widest">Citas</TableHead>
              <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest pr-8">Facturación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map((staff) => (
              <TableRow key={staff.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="pl-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-gray-900">{staff.name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">{staff.specialty}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                    <Badge variant="secondary" className="font-black text-xs px-2.5">
                        {staff.count}
                    </Badge>
                </TableCell>
                <TableCell className="text-right pr-8">
                    <div className="flex flex-col items-end">
                        <span className="font-black text-primary text-sm">{formatCurrency(staff.revenue)}</span>
                        <div className="flex items-center gap-1 text-[9px] text-green-600 font-bold uppercase tracking-widest">
                            <ArrowUpRight className="h-2.5 w-2.5" /> Generado
                        </div>
                    </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                  No hay datos de rendimiento disponibles.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
