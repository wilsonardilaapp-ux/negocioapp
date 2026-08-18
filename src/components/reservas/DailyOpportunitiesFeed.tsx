'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Loader2, 
  CheckCircle2, 
  ChevronRight,
  Filter,
  Sparkles
} from 'lucide-react';
import { BookingDailyOpportunitiesService, type DailyOpportunity, type OpportunityType } from '@/services/booking-daily-opportunities';
import { OpportunityActionCard } from './OpportunityActionCard';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Reservation, BookingAvailability } from '@/models/booking';
import type { LoyaltyBalance } from '@/services/loyalty-service';

export function DailyOpportunitiesFeed() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [filter, setFilter] = useState<OpportunityType | 'all'>('all');

  // --- DATA FETCHING (Multi-fuente) ---
  const resQuery = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/reservations`) : null, [user, firestore]);
  const balancesQuery = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/loyaltyBalances`) : null, [user, firestore]);
  const availQuery = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/bookingAvailability`) : null, [user, firestore]);

  const { data: res, isLoading: loadingRes } = useCollection<Reservation>(resQuery);
  const { data: balances, isLoading: loadingBal } = useCollection<LoyaltyBalance>(balancesQuery);
  const { data: avail, isLoading: loadingAvail } = useCollection<BookingAvailability>(availQuery);

  const opportunities = useMemo(() => {
    if (!res || !balances || !avail || !user) return [];
    return BookingDailyOpportunitiesService.getDailyOpportunitiesFeed(res, balances, avail, user.uid);
  }, [res, balances, avail, user]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return opportunities;
    return opportunities.filter(o => o.type === filter);
  }, [opportunities, filter]);

  const isLoading = loadingRes || loadingBal || loadingAvail;

  const filters = [
    { id: 'all', label: 'Todas', icon: null },
    { id: 'churn', label: '🔴 Críticas', icon: null },
    { id: 'confirmation', label: '🟠 Por Confirmar', icon: null },
    { id: 'empty_slot', label: '🟢 Espacios Libres', icon: null },
    { id: 'vip', label: '⭐ VIP', icon: null },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Zap className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Oportunidades de Hoy</CardTitle>
                <CardDescription className="text-xs font-bold text-primary uppercase tracking-widest">
                  Tu Asistente de Crecimiento Inteligente
                </CardDescription>
              </div>
            </div>
            
            <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap",
                    filter === f.id ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
             <div key={i} className="h-40 bg-white rounded-2xl border animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-2 duration-500">
           {filteredItems.map(item => (
             <OpportunityActionCard key={item.id} opportunity={item} businessId={user?.uid!} />
           ))}
        </div>
      ) : (
        <Card className="border-dashed bg-green-50/30 border-2 rounded-3xl py-12">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
             <div className="p-4 bg-white rounded-3xl shadow-sm border border-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
             </div>
             <div className="space-y-1">
                <h3 className="text-lg font-bold text-green-900">¡Agenda bajo control!</h3>
                <p className="text-sm text-green-700/70 max-w-xs mx-auto">
                    No tienes oportunidades de acción inmediata pendientes para hoy.
                </p>
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
