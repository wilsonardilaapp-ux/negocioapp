'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Activity, Clock, Building2, Loader2, AlertCircle } from 'lucide-react';
import type { Business } from '@/models/business';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ActivityBadge = ({ status }: { status: string | undefined }) => {
    if (!status) {
        return (
            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 font-medium">
                Sin datos
            </Badge>
        );
    }
    
    const config: Record<string, string> = {
        active: 'bg-green-100 text-green-800 border-green-200',
        at_risk: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        dormant: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels: Record<string, string> = {
        active: 'Activo',
        at_risk: 'En Riesgo',
        dormant: 'Inactivo',
    };

    return (
        <Badge variant="outline" className={cn('capitalize font-bold border-2', config[status] || 'bg-gray-100 text-gray-800 border-gray-200')}>
            {labels[status] || status.replace('_', ' ')}
        </Badge>
    );
};

export default function BusinessActivityPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const businessesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "businesses"), orderBy("name", "asc"));
  }, [firestore]);

  const { data: businesses, isLoading } = useCollection<Business>(businessesQuery);

  const stats = useMemo(() => {
    if (!businesses) return { total: 0, active: 0, at_risk: 0, dormant: 0, unknown: 0 };
    return {
      total: businesses.length,
      active: businesses.filter(b => b.activityStatus === 'active').length,
      at_risk: businesses.filter(b => b.activityStatus === 'at_risk').length,
      dormant: businesses.filter(b => b.activityStatus === 'dormant').length,
      unknown: businesses.filter(b => !b.activityStatus).length,
    };
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    if (!businesses) return [];
    return businesses.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (b.ownerName && b.ownerName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterStatus === 'all' || b.activityStatus === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [businesses, searchTerm, filterStatus]);

  const formatDate = (isoString: string | undefined) => {
    if (!isoString) return 'Nunca';
    try {
        return format(new Date(isoString), "d 'de' MMM, HH:mm", { locale: es });
    } catch (e) {
        return 'Fecha inválida';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl font-black tracking-tight">Monitoreo de Actividad</CardTitle>
              <CardDescription>Seguimiento del compromiso y uso de la plataforma por parte de los negocios.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <Card className="bg-white border-2">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Total Negocios</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black">{isLoading ? "..." : stats.total}</div>
            </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30 border-2">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] uppercase text-green-700 font-black tracking-widest">Activos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-green-700">{isLoading ? "..." : stats.active}</div>
            </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/30 border-2">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] uppercase text-yellow-700 font-black tracking-widest">En Riesgo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-yellow-700">{isLoading ? "..." : stats.at_risk}</div>
            </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30 border-2">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] uppercase text-red-700 font-black tracking-widest">Inactivos</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-red-700">{isLoading ? "..." : stats.dormant}</div>
            </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50/30 border-2">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-[10px] uppercase text-gray-500 font-black tracking-widest">Sin Tracking</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="text-2xl font-black text-gray-500">{isLoading ? "..." : stats.unknown}</div>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar negocio por nombre o dueño..."
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px] h-10">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="at_risk">En Riesgo</SelectItem>
                <SelectItem value="dormant">Inactivos (Dormant)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold pl-6">Negocio / Cliente</TableHead>
                  <TableHead className="font-bold">Plan</TableHead>
                  <TableHead className="font-bold">Última Actividad</TableHead>
                  <TableHead className="font-bold text-center">Estado de Actividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Sincronizando estados...</p>
                        </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBusinesses.length > 0 ? (
                  filteredBusinesses.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{b.name}</span>
                          <span className="text-xs text-muted-foreground">{b.ownerName || b.ownerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/20 font-medium">
                            {b.planName || 'Plan Crecimiento'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(b.lastActiveAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <ActivityBadge status={b.activityStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="h-8 w-8 opacity-20" />
                            <p className="font-medium">No se encontraron negocios con los filtros aplicados.</p>
                        </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
