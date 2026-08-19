'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { AnalyticsKPIs } from '@/components/reservas/analytics/AnalyticsKPIs';
import { TopServicesChart } from '@/components/reservas/analytics/TopServicesChart';
import { StaffPerformance } from '@/components/reservas/analytics/StaffPerformance';
import { PeakHoursChart } from '@/components/reservas/analytics/PeakHoursChart';
import { BarChart3, Calendar, Loader2, Info } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, subDays, format } from 'date-fns';
import type { Reservation, BookingService, BookingStaff } from '@/models/booking';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Página principal de Estadísticas de Reservas.
 * Calcula y orquesta la visualización de métricas operativas y financieras.
 * Corregido para usar businessId del perfil y filtrado de fechas por string robusto.
 */

type TimePeriod = '7d' | 'this_month' | 'last_month' | '30d';

export default function ReservasEstadisticasPage() {
  const { user, profile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [period, setPeriod] = useState<TimePeriod>('this_month');

  // RESOLUCIÓN SEGURA DE BUSINESS ID (Contexto SaaS)
  const businessId = useMemo(() => {
    return (profile as any)?.businessId || (user as any)?.businessId || user?.uid || '';
  }, [user, profile]);

  // --- 1. DATA FETCHING ---
  // Consulta simplificada para evitar requisitos de índices compuestos en Firestore
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
  const { data: recoveryLogs, isLoading: loadingLogs } = useCollection<any>(recoveryQuery);

  // --- 2. LÓGICA ANALÍTICA ---
  const analyticsData = useMemo(() => {
    if (!reservations || !services || !staffList) return null;

    const now = new Date();
    let startStr: string;
    let endStr: string = format(now, 'yyyy-MM-dd');

    // Cálculo de rangos basado en strings YYYY-MM-DD para evitar desfases UTC
    if (period === '7d') {
      startStr = format(subDays(now, 7), 'yyyy-MM-dd');
    } else if (period === 'last_month') {
      const lastMonth = subMonths(now, 1);
      startStr = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      endStr = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
    } else if (period === '30d') {
      startStr = format(subDays(now, 30), 'yyyy-MM-dd');
    } else {
      // this_month
      startStr = format(startOfMonth(now), 'yyyy-MM-dd');
    }

    // Filtrado por fecha (string comparison)
    const filtered = reservations.filter(r => {
      const rDate = r.date;
      return rDate >= startStr && rDate <= endStr;
    });

    // KPIs Base
    const completed = filtered.filter(r => r.status === 'completed');
    const cancelled = filtered.filter(r => r.status === 'cancelled');
    const noShow = filtered.filter(r => r.status === 'no_show');
    const confirmed = filtered.filter(r => r.status === 'confirmed');

    const totalRevenue = completed.reduce((sum, r) => sum + (r.price || 0), 0);
    
    // Tasa de Asistencia (Show rate)
    const totalPotential = completed.length + noShow.length + confirmed.length;
    const attendanceRate = totalPotential > 0 ? (completed.length / totalPotential) * 100 : 0;

    // ROI IA (Recuperación)
    const recovered = completed.filter(r => {
      if (!recoveryLogs || !Array.isArray(recoveryLogs)) return false;
      const log = recoveryLogs.find(l => l.customerPhone === r.customerPhone && l.status === 'sent');
      if (!log) return false;
      
      const logDate = new Date(log.sentAt);
      const resDate = new Date(r.createdAt);
      const diffDays = (resDate.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });
    const recoveredRevenue = recovered.reduce((sum, r) => sum + (r.price || 0), 0);

    // Agregación por Servicio (Incluimos demanda de confirmadas)
    const serviceMap = new Map<string, { name: string, count: number, revenue: number }>();
    filtered.filter(r => r.status === 'completed' || r.status === 'confirmed').forEach(r => {
      const s = services.find(serv => serv.id === r.serviceId);
      const name = s?.name || r.serviceName || r.serviceId;
      const current = serviceMap.get(r.serviceId) || { name, count: 0, revenue: 0 };
      
      const addedRevenue = r.status === 'completed' ? (r.price || 0) : 0;
      
      serviceMap.set(r.serviceId, { 
        ...current, 
        count: current.count + 1, 
        revenue: current.revenue + addedRevenue 
      });
    });

    // Agregación por Staff (Incluimos demanda de confirmadas)
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

    // Distribución Horaria (Heatmap - Incluimos demanda de confirmadas)
    const hourlyData = Array.from({ length: 13 }, (_, i) => {
        const hour = i + 8; // 08:00 a 20:00
        const label = `${hour.toString().padStart(2, '0')}:00`;
        const count = filtered.filter(r => 
          (r.status === 'completed' || r.status === 'confirmed') && 
          parseInt(r.startTime?.split(':')[0] || '0') === hour
        ).length;
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

  const isLoading = isUserLoading || loadingRes || loadingStaff || loadingServices || loadingLogs;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Análisis de Rendimiento
          </h1>
          <p className="text-muted-foreground">Métricas de facturación, asistencia y efectividad del equipo.</p>
        </div>
        
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
        </div>
      </header>

      <ReservasTabs />

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
              <Card className="border-primary/20 bg-primary/5 shadow-inner rounded-3xl border-2 h-full flex flex-col justify-center p-8 text-center space-y-4">
                  <div className="p-4 bg-white rounded-3xl shadow-sm border w-fit mx-auto">
                    <Info className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-gray-900">¿Sabías que...?</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Mejorar la <strong>tasa de asistencia</strong> en un 10% puede aumentar tu facturación mensual sin necesidad de captar nuevos clientes.
                    </p>
                  </div>
                  <Button variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5 mx-auto px-8" asChild>
                    <a href="/dashboard/reservas/notificaciones">Optimizar Recordatorios</a>
                  </Button>
              </Card>
           </div>
        </div>
      ) : (
        <Card className="border-dashed bg-muted/20 border-2 py-32 rounded-[2rem]">
          <CardContent className="flex flex-col items-center justify-center text-center gap-4">
            <div className="p-4 bg-white rounded-3xl shadow-sm border">
                <Calendar className="h-12 w-12 text-muted-foreground/20" />
            </div>
            <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-800">Sin datos suficientes</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Completa algunas citas en tu agenda para ver las estadísticas de rendimiento.
                </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
