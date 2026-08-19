
'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { OpportunityKPIs } from '@/components/reservas/OpportunityKPIs';
import { OpportunityCard } from '@/components/reservas/OpportunityCard';
import { DailyOpportunitiesFeed } from '@/components/reservas/DailyOpportunitiesFeed';
import { BookingChurnService, type RiskLevel } from '@/services/booking-churn';
import { Target, Loader2, Search, Filter, ShoppingBag, ArrowRight } from 'lucide-react';
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
 * Integra el Feed de Oportunidades Diarias ("Oportunidades de Hoy").
 */

export default function OportunidadesPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');

  // RESOLUCIÓN SEGURA DE BUSINESS ID
  const businessId = useMemo(() => {
    return (profile as any)?.businessId || (user as any)?.businessId || user?.uid || '';
  }, [user, profile]);

  // Consulta index-free para evitar fallos por falta de índices compuestos
  const reservationsQuery = useMemoFirebase(() => {
    if (!businessId || !firestore) return null;
    return collection(firestore, `businesses/${businessId}/reservations`);
  }, [businessId, firestore]);

  const { data: reservations, isLoading } = useCollection<Reservation>(reservationsQuery);

  // --- LÓGICA DE ANÁLISIS ---
  const { opportunities, metrics } = useMemo(() => {
    if (!reservations) return { opportunities: [], metrics: { criticalCount: 0, overdueCount: 0, upcomingCount: 0, totalAtRiskRevenue: 0, totalOpportunities: 0 } };
    // El servicio procesa y filtra los datos en memoria
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Radar de Crecimiento
        </h1>
        <p className="text-muted-foreground font-medium">Detecta y recupera ventas utilizando inteligencia artificial y datos históricos.</p>
      </header>

      <div className="pt-2">
        <ReservasTabs />
      </div>

      {/* --- SECCIÓN 1: FEED DE ACCIONES DEL DÍA --- */}
      <section className="space-y-6">
        <DailyOpportunitiesFeed />
      </section>

      <div className="border-t border-dashed pt-10 space-y-8">
        <div className="flex items-center gap-3">
            <div className="h-1 bg-primary w-12 rounded-full"></div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Análisis General de Retención</h2>
        </div>

        <OpportunityKPIs metrics={metrics} isLoading={isLoading} />

        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative flex-1 w-full max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Filtrar base de clientes..." 
                            className="pl-10 h-11 bg-white border-2 focus-visible:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
                            <SelectTrigger className="w-48 h-11 bg-white font-bold border-2">
                                <SelectValue placeholder="Estado de Retención" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los clientes</SelectItem>
                                <SelectItem value="critical" className="text-red-600 font-bold">🔴 Alto Riesgo (Churn)</SelectItem>
                                <SelectItem value="overdue" className="text-orange-600 font-bold">🟠 Atrasados</SelectItem>
                                <SelectItem value="upcoming" className="text-green-600 font-bold">🟢 Próximos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
        </Card>

        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-3xl border border-dashed" />)}
            </div>
        ) : filteredOpportunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredOpportunities.map(opp => (
                <OpportunityCard key={opp.customerPhone} opportunity={opp} />
            ))}
            </div>
        ) : (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-[2rem]">
                <ShoppingBag className="h-10 w-10 mx-auto opacity-10 mb-4" />
                <p className="font-bold">No hay más oportunidades en este filtro.</p>
            </div>
        )}
      </div>
    </div>
  );
}
