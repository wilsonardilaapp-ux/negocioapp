'use client';

import { DollarSign, Users, UserPlus, UserMinus, TrendingUp } from 'lucide-react';
import { useRevenueMetrics } from './hooks/useRevenueMetrics';
import { MetricCard } from './components/MetricCard';
import { PlanDistributionChart } from './components/PlanDistributionChart';
import { GrowthChart } from './components/GrowthChart';
import { RecentActivityTable } from './components/RecentActivityTable';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function RevenuePage() {
  const { metrics, isLoading, error } = useRevenueMetrics();

  if (error) {
    return (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
                title="MRR (Ingresos Mensuales Recurrentes)"
                value={formatCurrency(metrics?.mrr || 0)}
                change={metrics?.mrrGrowth}
                icon={DollarSign}
                isLoading={isLoading}
            />
            <MetricCard 
                title="Clientes Activos"
                value={metrics?.totalActiveClients || 0}
                change={metrics?.clientsGrowth}
                icon={Users}
                isLoading={isLoading}
            />
            <MetricCard 
                title="Clientes Nuevos (este mes)"
                value={metrics?.newClientsThisMonth || 0}
                icon={UserPlus}
                isLoading={isLoading}
            />
            <MetricCard 
                title="Cancelaciones (este mes)"
                value={metrics?.cancelationsThisMonth || 0}
                icon={UserMinus}
                isLoading={isLoading}
            />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
                <GrowthChart data={metrics?.monthlyHistory || []} isLoading={isLoading} />
            </div>
             <div className="lg:col-span-3">
                <PlanDistributionChart data={metrics?.planDistribution || { free: 0, pro: 0, enterprise: 0 }} isLoading={isLoading} />
            </div>
        </div>
        <div>
            <RecentActivityTable activity={metrics?.recentActivity || []} isLoading={isLoading} />
        </div>
    </div>
  );
}
