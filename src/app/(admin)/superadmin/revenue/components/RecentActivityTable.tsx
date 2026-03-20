'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RevenueMetrics } from '../hooks/useRevenueMetrics';
import { format } from "date-fns";

interface RecentActivityTableProps {
  activity: RevenueMetrics['recentActivity'];
  isLoading: boolean;
}

export function RecentActivityTable({ activity, isLoading }: RecentActivityTableProps) {

  const getActionVariant = (action: RevenueMetrics['recentActivity'][0]['action']) => {
    switch (action) {
      case 'nueva_suscripcion': return 'default';
      case 'cambio_plan': return 'secondary';
      case 'cancelacion': return 'destructive';
      case 'pago_vencido': return 'outline';
      default: return 'secondary';
    }
  };
  
  const getActionLabel = (action: RevenueMetrics['recentActivity'][0]['action']) => {
      return action.replace('_', ' ');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Últimos 10 eventos de suscripción.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                </TableRow>
              ))
            ) : activity.length > 0 ? (
              activity.map((item) => (
                <TableRow key={item.userId + item.date.toMillis()}>
                  <TableCell>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionVariant(item.action)} className="capitalize">{getActionLabel(item.action)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{item.plan}</Badge>
                  </TableCell>
                  <TableCell>{format(item.date.toDate(), 'dd/MM/yyyy HH:mm')}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No hay actividad reciente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
