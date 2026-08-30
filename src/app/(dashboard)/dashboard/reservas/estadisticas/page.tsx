'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { AnalyticsKPIs } from '@/components/reservas/analytics/AnalyticsKPIs';
import { TopServicesChart } from '@/components/reservas/analytics/TopServicesChart';
import { StaffPerformance } from '@/components/reservas/analytics/StaffPerformance';
import { PeakHoursChart } from '@/components/reservas/analytics/PeakHoursChart';
import { Calendar, Loader2 } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Reservation, BookingService, BookingStaff } from '@/models/booking';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

/**
 * @fileOverview Página principal de Estadísticas de Reservas.
 * Header y Tabs manejados por el layout.
 */

type TimePeriod = '7d' | 'this_month' | 'last_month' | '30d';

export default function ReservasEstadisticasPage() {
  const { user, profile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [period, setPeriod] = useState<TimePeriod>('this_month');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const businessId = useMemo(() => {
    return (profile as any)?.businessId || (user as any)?.businessId || user?.uid || '';
  }, [user, profile]);

  const resQuery = useMemoFirebase(() => {
    if (!businessId || !firestore) return null;
    return collection(firestore, `businesses/${businessId}/reservations`);
  }, [businessId, firestore]);

  const staffQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, `businesses/${businessId}/bookingStaff`) : null, 
  [businessId, firestore]);

  const servicesQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, `businesses/${businessId}/bookingServices`) : null, 
  [businessId, firestore]);

  const recoveryQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, `businesses/${businessId}/recoveryLogs`) : null, 
  [businessId, firestore]);

  const { data: reservations, isLoading: loadingRes } = useCollection<Reservation>(resQuery);
  const { data: staffList, isLoading: loadingStaff } = useCollection<BookingStaff>(staffQuery);
  const { data: services, isLoading: loadingServices } = useCollection<BookingService>(servicesQuery);
  const { data: recoveryLogs } = useCollection<any>(recoveryQuery);

  const analyticsData = useMemo(() => {
    if (!reservations || !services || !staffList) return null;

    const now = new Date();
    let startStr: string;
    let endStr: string = format(now, 'yyyy-MM-dd');

    if (period === '7d') {
      startStr = format(subDays(now, 7), 'yyyy-MM-dd');
    } else if (period === 'last_month') {
      const lastMonth = subMonths(now, 1);
      startStr = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      endStr = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
    } else if (period === '30d') {
      startStr = format(subDays(now, 30), 'yyyy-MM-dd');
    } else {
      startStr = format(startOfMonth(now), 'yyyy-MM-dd');
    }

    const filtered = reservations.filter(r => r.date >= startStr && r.date <= endStr);
    const completed = filtered.filter(r => r.status === 'completed');
    const cancelled = filtered.filter(r => r.status === 'cancelled');
    const noShow = filtered.filter(r => r.status === 'no_show');
    const confirmed = filtered.filter(r => r.status === 'confirmed');

    const totalRevenue = completed.reduce((sum, r) => sum + (r.price || 0), 0);
    const totalPotential = completed.length + noShow.length + confirmed.length;
    const attendanceRate = totalPotential > 0 ? (completed.length / totalPotential) * 100 : 0;

    const recovered = completed.filter(r => {
      if (!recoveryLogs) return false;
      const log = recoveryLogs.find(l => l.customerPhone === r.customerPhone && l.status === 'sent');
      if (!log) return false;
      const diffDays = (new Date(r.createdAt).getTime() - new Date(log.sentAt).getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });
    const recoveredRevenue = recovered.reduce((sum, r) => sum + (r.price || 0), 0);

    const serviceMap = new Map<string, { name: string, count: number, revenue: number }>();
    filtered.filter(r => r.status === 'completed' || r.status === 'confirmed').forEach(r => {
      const s = services.find(serv => serv.id === r.serviceId);
      const name = s?.name || r.serviceName || r.serviceId;
      const current = serviceMap.get(r.serviceId) || { name, count: 0, revenue: 0 };
      serviceMap.set(r.serviceId, { 
        ...current, 
        count: current.count + 1, 
        revenue: current.revenue + (r.status === 'completed' ? (r.price || 0) : 0) 
      });
    });

    const staffPerf = staffList.map(s => {
      const staffRes = filtered.filter(r => r.staffId === s.id && (r.status === 'completed' || r.status === 'confirmed'));
      const staffCompleted = staffRes.filter(r => r.status === 'completed');
      return {
        id: s.id,
        name: s.name,
        specialty: s.specialty || 'Especialista',
        count: staffRes.length,
        revenue: staffCompleted.reduce((sum, r) => sum + (r.price || 0), 0)
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const hourlyData = Array.from({ length: 13 }, (_, i) => {
        const hour = i + 8;
        const label = `${hour.toString().padStart(2, '0')}:00`;
        const count = filtered.filter(r => (r.status === 'completed' || r.status === 'confirmed') && parseInt(r.startTime?.split(':')[0] || '0') === hour).length;
        return { hour: label, count };
    });

    return {
      kpis: {
        totalRevenue,
        completedCount: completed.length,
        attendanceRate,
        cancelledCount: cancelled.length,
        noShowCount: noShow.length,
        recoveredCount: recovered.length,
        recoveredRevenue
      },
      topServices: Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      staffPerf,
      hourlyData
    };
  }, [reservations, services, staffList, recoveryLogs, period]);

  const headerActions = mounted && document.getElementById('reservas-header-actions') 
    ? createPortal(
        <div className="flex bg-white p-1 rounded-xl border shadow-sm">
            {[
                { id: '7d', label: '7 Días' },
                { id: 'this_month', label: 'Este Mes' },
                { id: '30d', label: '30 Días' },
                { id: 'last_month', label: 'Mes Anterior' }
            ].map((p) => (
                <button
                    key={p.id}
                    onClick={() => setPeriod(p.id as TimePeriod)}
                    className={cn(
                        "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                        period === p.id ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:bg-muted"
                    )}
                >
                    {p.label}
                </button>
            ))}
        </div>,
        document.getElementById('reservas-header-actions')!
      ) 
    : null;

  const isLoading = isUserLoading || loadingRes || loadingStaff || loadingServices;

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-500">
      {headerActions}
      {isLoading ? (
         <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white rounded-[2rem] border-2 border-dashed">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Procesando métricas operativas...</p>
         </div>
      ) : analyticsData ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
           <AnalyticsKPIs data={analyticsData.kpis} />
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <TopServicesChart data={analyticsData.topServices} />
              <PeakHoursChart data={analyticsData.hourlyData} />
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <StaffPerformance data={analyticsData.staffPerf} />
              </div>
              <div className="p-8 bg-primary/5 rounded-3xl border-2 border-primary/10 flex flex-col justify-center text-center space-y-4">
                  <h3 className="text-xl font-black">Optimiza tu Agenda</h3>
                  <p className="text-sm text-gray-600">Mejorar la tasa de asistencia aumenta tu facturación sin nuevos clientes.</p>
              </div>
           </div>
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20 border-2 py-32 rounded-[2rem]">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
            <Calendar className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Sin datos suficientes para el periodo.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
