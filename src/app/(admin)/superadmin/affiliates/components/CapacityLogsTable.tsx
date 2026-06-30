
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, PlusCircle, TrendingUp, Cpu } from 'lucide-react';
import type { ExtraCapacityLog } from '@/models/extra-capacity-log';
import type { Business } from '@/models/business';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ManualAdjustmentModal from './ManualAdjustmentModal';

interface CapacityLogsTableProps {
  logs: ExtraCapacityLog[];
  businesses: Business[];
  isLoading: boolean;
}

export default function CapacityLogsTable({ logs, businesses, isLoading }: CapacityLogsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      log.businessId.toLowerCase().includes(term) ||
      log.businessName.toLowerCase().includes(term) ||
      (log.notes && log.notes.toLowerCase().includes(term));
    
    const matchesOrigin = originFilter === 'all' || log.origin === originFilter;
    
    return matchesSearch && matchesOrigin;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Filtrar por negocio o notas..." 
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por origen" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos los orígenes</SelectItem>
                    <SelectItem value="automatico">Automáticos (Referidos)</SelectItem>
                    <SelectItem value="manual">Manuales (Admin)</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <Button onClick={() => setIsAdjustModalOpen(true)} className="bg-primary font-bold shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" /> Ajuste Manual
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Negocio Beneficiario</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead className="text-center">Aumento</TableHead>
              <TableHead>Motivo / Notas</TableHead>
              <TableHead className="text-right">Autor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.map((log, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {log.createdAt ? format(log.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: es }) : '---'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{log.businessName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{log.businessId.slice(0, 10)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.origin === 'manual' ? 'secondary' : 'default'} className="capitalize text-[10px] py-0">
                      {log.origin}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-black text-green-600 flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" /> +{log.amount}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <p className="text-xs italic line-clamp-2" title={log.notes || log.reason}>
                      {log.notes || log.reason.replace(/_/g, ' ')}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {log.adminId ? `ADMIN: ${log.adminId.slice(0, 6)}` : 'SISTEMA'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No hay registros de incremento de capacidad.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ManualAdjustmentModal 
        isOpen={isAdjustModalOpen} 
        onClose={() => setIsAdjustModalOpen(false)} 
        businesses={businesses}
      />
    </div>
  );
}
