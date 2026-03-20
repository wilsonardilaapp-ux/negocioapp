'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAllSubscriptions, type ClientWithSubscription } from '../../subscriptions/hooks/useAllSubscriptions';
import { Timestamp } from 'firebase/firestore';

const PLAN_PRICES = {
  free: 0,
  pro: 29,
  enterprise: 99,
} as const;

export type RevenueMetrics = {
  mrr: number;
  mrrGrowth: number;
  totalActiveClients: number;
  clientsGrowth: number;
  newClientsThisMonth: number;
  cancelationsThisMonth: number;
  planDistribution: {
    free: number;
    pro: number;
    enterprise: number;
  };
  monthlyHistory: {
    month: string;
    mrr: number;
    newClients: number;
  }[];
  recentActivity: {
    userId: string;
    name: string;
    email: string;
    action: 'nueva_suscripcion' | 'cambio_plan' | 'cancelacion' | 'pago_vencido';
    plan: 'free' | 'pro' | 'enterprise';
    date: Timestamp;
  }[];
};

export function useRevenueMetrics() {
  const { clients, isLoading: areClientsLoading, error: clientsError } = useAllSubscriptions();
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (areClientsLoading) {
      setIsLoading(true);
      return;
    }
    if (clientsError) {
      setError(clientsError.message);
      setIsLoading(false);
      return;
    }

    if (clients) {
        try {
            const now = new Date();
            const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const startOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

            // --- Current Metrics ---
            const activeSubscriptions = clients.filter(c => c.subscription?.status === 'active');
            const mrr = activeSubscriptions.reduce((acc, client) => {
                const plan = client.subscription?.plan || 'free';
                return acc + PLAN_PRICES[plan];
            }, 0);
            
            const totalActiveClients = activeSubscriptions.length;

            // --- Growth Metrics ---
            const activeSubsLastMonth = clients.filter(c => {
                const sub = c.subscription;
                if (!sub) return false;
                const createdAt = sub.createdAt.toDate();
                return createdAt < startOfThisMonth && sub.status === 'active';
            });
            const mrrLastMonth = activeSubsLastMonth.reduce((acc, client) => {
                const plan = client.subscription?.plan || 'free';
                return acc + PLAN_PRICES[plan];
            }, 0);
            const mrrGrowth = mrrLastMonth > 0 ? ((mrr - mrrLastMonth) / mrrLastMonth) * 100 : mrr > 0 ? 100 : 0;
            
            const totalActiveClientsLastMonth = activeSubsLastMonth.length;
            const clientsGrowth = totalActiveClientsLastMonth > 0 ? ((totalActiveClients - totalActiveClientsLastMonth) / totalActiveClientsLastMonth) * 100 : totalActiveClients > 0 ? 100 : 0;

            const newClientsThisMonth = clients.filter(c => c.subscription?.createdAt.toDate() >= startOfThisMonth).length;
            const cancelationsThisMonth = clients.filter(c => {
                const sub = c.subscription;
                return sub?.status === 'canceled' && sub.updatedAt.toDate() >= startOfThisMonth;
            }).length;

            // --- Plan Distribution ---
            const planDistribution = clients.reduce((acc, client) => {
                const plan = client.subscription?.plan || 'free';
                acc[plan] = (acc[plan] || 0) + 1;
                return acc;
            }, { free: 0, pro: 0, enterprise: 0 });

            // --- Monthly History (last 6 months) ---
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const monthlyHistory: { month: string, mrr: number, newClients: number }[] = [];

            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const monthName = monthNames[d.getMonth()];
                const year = d.getFullYear();
                const startOfMonth = new Date(year, d.getMonth(), 1);
                const endOfMonth = new Date(year, d.getMonth() + 1, 0, 23, 59, 59);

                const newClientsInMonth = clients.filter(c => {
                    const createdAt = c.subscription?.createdAt.toDate();
                    return createdAt && createdAt >= startOfMonth && createdAt <= endOfMonth;
                }).length;

                const mrrForMonth = clients
                    .filter(c => {
                        const sub = c.subscription;
                        if (!sub) return false;
                        const createdAt = sub.createdAt.toDate();
                        // Active at end of month
                        return createdAt <= endOfMonth && (sub.status === 'active' || (sub.status === 'canceled' && sub.updatedAt.toDate() > endOfMonth));
                    })
                    .reduce((acc, client) => acc + PLAN_PRICES[client.subscription!.plan], 0);

                monthlyHistory.push({ month: monthName, mrr: mrrForMonth, newClients: newClientsInMonth });
            }

            // --- Recent Activity ---
            const recentActivity = clients
                .filter(c => c.subscription)
                .map(c => {
                    const sub = c.subscription!;
                    let action: RevenueMetrics['recentActivity'][0]['action'] = 'cambio_plan';
                    if (sub.createdAt.toMillis() === sub.updatedAt.toMillis()) {
                        action = 'nueva_suscripcion';
                    } else if (sub.status === 'canceled') {
                        action = 'cancelacion';
                    } else if (sub.status === 'past_due') {
                        action = 'pago_vencido';
                    }
                    
                    return {
                        userId: c.userId,
                        name: c.name,
                        email: c.email,
                        action,
                        plan: sub.plan,
                        date: sub.updatedAt
                    };
                })
                .sort((a, b) => b.date.toMillis() - a.date.toMillis())
                .slice(0, 10);
            
            setMetrics({
                mrr,
                mrrGrowth,
                totalActiveClients,
                clientsGrowth,
                newClientsThisMonth,
                cancelationsThisMonth,
                planDistribution,
                monthlyHistory,
                recentActivity
            });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }
  }, [clients, areClientsLoading, clientsError]);

  return { metrics, isLoading, error };
}
