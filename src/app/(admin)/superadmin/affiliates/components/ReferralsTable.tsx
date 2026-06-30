
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, ArrowRight, UserCheck } from 'lucide-react';
import type { Referral } from '@/models/referral';
import type { Business } from '@/models/business';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReferralsTableProps {
  referrals: Referral[];
  businesses: Business[];
  isLoading: boolean;
  onFilterChange: (status: string) => void;
  currentFilter: string;
}

export default function ReferralsTable({ referrals, businesses, isLoading, onFilterChange, currentFilter }: ReferralsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const getBusinessName = (id: string) => {
    const b = businesses.find(item => item.id === id);
    return b ? b.name : `ID: ${id.slice(0, 8)}...`;
  };

  const filteredReferrals = referrals.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      r.referentBusinessId.toLowerCase().includes(term) ||
      r.referreeBusinessId.toLowerCase().includes(term) ||
      r.referralCode.toLowerCase().includes(term) ||
      getBusinessName(r.referentBusinessId).toLowerCase().includes(term) ||
      getBusinessName(r.referreeBusinessId).toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: Referral['status']) => {
    switch (status) {
      case 'paid_confirmed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmado</Badge>;
      case 'pending_payment':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Esperando Pago</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por ID o nombre de negocio..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={currentFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending_payment">Pendiente de Pago</SelectItem>
            <SelectItem value="paid_confirmed">Confirmados</SelectItem>
            <SelectItem value="rejected">Rechazados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Socio (Referente)</TableHead>
              <TableHead className="text-center"></TableHead>
              <TableHead>Nuevo Cliente (Referido)</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Premios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredReferrals.length > 0 ? (
              filteredReferrals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {r.createdAt ? format(r.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: es }) : '---'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{getBusinessName(r.referentBusinessId)}</span>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">{r.referentBusinessId.slice(0, 10)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{getBusinessName(r.referreeBusinessId)}</span>
                      <span className="text-[10px] text-muted-foreground font-mono uppercase">{r.referreeBusinessId.slice(0, 10)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[11px] font-bold">{r.referralCode}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(r.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      {r.referentRewardGranted && <Badge variant="outline" className="text-[9px] h-4 bg-green-50 text-green-700 border-green-200">Ref. OK</Badge>}
                      {r.referreeRewardGranted && <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200">Nuevo OK</Badge>}
                      {!r.referentRewardGranted && !r.referreeRewardGranted && <span className="text-[10px] text-muted-foreground italic">Pendiente</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No se encontraron referidos con estos criterios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
