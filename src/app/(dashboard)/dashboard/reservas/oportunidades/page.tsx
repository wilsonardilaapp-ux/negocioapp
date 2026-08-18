'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { OpportunityKPIs } from '@/components/reservas/OpportunityKPIs';
import { OpportunityCard } from '@/components/reservas/OpportunityCard';
import { BookingChurnService, type RiskLevel } from '@/services/booking-churn';
import { Target, Loader2, Search, Filter, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Reservation } from '@/models/booking';

/**
 * @fileOverview Radar de Oportunidades y Retención (Churn).
 * Analiza comportamientos para evitar la pérdida de clientes.
 */

export default function OportunidadesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');

  // Obtener todas las reservas completadas del negocio
  const reservationsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `businesses/${user.uid}/reservations`),
      where('status', '==', 'completed'),
      orderBy('date', 'desc')
    );
  }, [user, firestore]);

  const { data: reservations, isLoading } = useCollection<Reservation>(reservationsQuery);

  // --- LÓGICA DE ANÁLISIS ---
  const { opportunities, metrics } = useMemo(() => {
    if (!reservations) return { opportunities: [], metrics: { criticalCount: 0, overdueCount: 0, upcomingCount: 0, totalAtRiskRevenue: 0, totalOpportunities: 0 } };
    return BookingChurnService.getBookingOpportunities(reservations);
  }, [reservations]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(o => {
      const matchesRisk = riskFilter === 'all' || o.riskLevel === riskFilter;
      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.customerPhone.includes(searchTerm);
      return matchesRisk && matchesSearch;
    });
  }, [opportunities, riskFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Radar de Oportunidades
        </h1>
        <p className="text-muted-foreground">Detecta clientes que están tardando en volver y recupera ventas perdidas.</p>
      </header>

      <ReservasTabs />

      <OpportunityKPIs metrics={metrics} isLoading={isLoading} />

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-4 pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 w-full max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Buscar cliente por nombre o teléfono..." 
                        className="pl-10 h-11 bg-white border-2 focus-visible:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                        <Filter className="h-3 w-3" /> Filtrar por:
                    </div>
                    <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                        <SelectTrigger className="w-40 h-11 bg-white font-bold border-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="critical" className="text-red-600 font-bold">🔴 Alto Riesgo</SelectItem>
                            <SelectItem value="overdue" className="text-orange-600 font-bold">🟠 Atrasados</SelectItem>
                            <SelectItem value="upcoming" className="text-green-600 font-bold">🟢 Próximos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
      </Card>

      {isLoading ? (
         <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white rounded-[2rem] border-2 border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Analizando ciclos de visita...</p>
         </div>
      ) : filteredOpportunities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-2 duration-500">
           {filteredOpportunities.map(opp => (
             <OpportunityCard key={opp.customerPhone} opportunity={opp} />
           ))}
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20 border-2 py-32 rounded-[2rem]">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
            <div className="p-4 bg-white rounded-3xl shadow-sm border">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/20" />
            </div>
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-800">No hay alertas activas</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                    {searchTerm || riskFilter !== 'all' 
                      ? 'No encontramos clientes que coincidan con tu búsqueda.' 
                      : 'Tus clientes están al día con sus ciclos de visita.'}
                </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
