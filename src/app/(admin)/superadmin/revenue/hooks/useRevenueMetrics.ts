'use client';

import { useState, useEffect } from 'react';
import { useAllSubscriptions } from '../../subscriptions/hooks/useAllSubscriptions';
import { Timestamp } from 'firebase/firestore';
import type { SubscriptionPlan } from '@/models/subscription-plan';

export type RevenueMetrics = {
  mrr: number;
  mrrGrowth: number;
  totalActiveClients: number;
  clientsGrowth: number;
  newClientsThisMonth: number;
  cancelationsThisMonth: number;
  planDistribution: Record<string, number>;
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
    plan: string;
    date: Timestamp;
  }[];
};

export function useRevenueMetrics(allPlans: SubscriptionPlan[] | null) {
  const { clients, isLoading: areClientsLoading, error: clientsError } = useAllSubscriptions();
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (areClientsLoading || !allPlans) {
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

            const activeSubscriptions = clients.filter(c => c.subscription?.status === 'active');
            
            const mrr = activeSubscriptions.reduce((acc, client) => {
                const planId = client.subscription?.plan || 'free';
                const planDetails = allPlans.find(p => p.id === planId);
                return acc + (planDetails?.price || 0);
            }, 0);
            
            const totalActiveClients = activeSubscriptions.length;

            const activeSubsLastMonth = clients.filter(c => {
                const sub = c.subscription;
                if (!sub || !sub.createdAt) return false;
                const createdAt = (sub.createdAt as Timestamp).toDate();
                return createdAt < startOfThisMonth && sub.status === 'active';
            });

            const mrrLastMonth = activeSubsLastMonth.reduce((acc, client) => {
                const planId = client.subscription?.plan || 'free';
                const planDetails = allPlans.find(p => p.id === planId);
                return acc + (planDetails?.price || 0);
            }, 0);
            const mrrGrowth = mrrLastMonth > 0 ? ((mrr - mrrLastMonth) / mrrLastMonth) * 100 : mrr > 0 ? 100 : 0;
            
            const totalActiveClientsLastMonth = activeSubsLastMonth.length;
            const clientsGrowth = totalActiveClientsLastMonth > 0 ? ((totalActiveClients - totalActiveClientsLastMonth) / totalActiveClientsLastMonth) * 100 : totalActiveClients > 0 ? 100 : 0;

            const newClientsThisMonth = clients.filter(c => c.subscription && c.subscription.createdAt && (c.subscription.createdAt as Timestamp).toDate() >= startOfThisMonth).length;
            
            const cancelationsThisMonth = clients.filter(c => {
                const sub = c.subscription;
                return sub?.status === 'canceled' && sub.updatedAt && (sub.updatedAt as Timestamp).toDate() >= startOfThisMonth;
            }).length;

            const planDistribution = activeSubscriptions.reduce((acc, client) => {
                const planId = client.subscription?.plan || 'free';
                const planDetails = allPlans.find(p => p.id === planId);
                const planName = planDetails?.name || 'Desconocido';
                acc[planName] = (acc[planName] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
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
                    const createdAt = c.subscription?.createdAt ? (c.subscription.createdAt as Timestamp).toDate() : null;
                    return createdAt && createdAt >= startOfMonth && createdAt <= endOfMonth;
                }).length;

                const mrrForMonth = clients
                    .filter(c => {
                        const sub = c.subscription;
                        if (!sub || !sub.createdAt) return false;
                        const createdAt = (sub.createdAt as Timestamp).toDate();
                        const updatedAt = sub.updatedAt ? (sub.updatedAt as Timestamp).toDate() : null;
                        
                        return createdAt <= endOfMonth && (sub.status === 'active' || (sub.status === 'canceled' && updatedAt && updatedAt > endOfMonth));
                    })
                    .reduce((acc, client) => {
                         const planId = client.subscription!.plan;
                         const planDetails = allPlans.find(p => p.id === planId);
                         return acc + (planDetails?.price || 0);
                    }, 0);

                monthlyHistory.push({ month: monthName, mrr: mrrForMonth, newClients: newClientsInMonth });
            }

            const recentActivity = clients
                .filter(c => c.subscription && c.subscription.updatedAt) // Ensure updatedAt exists for sorting
                .map(c => {
                    const sub = c.subscription!;
                    let action: RevenueMetrics['recentActivity'][0]['action'] = 'cambio_plan';
                    if (sub.createdAt && sub.updatedAt && (sub.createdAt as Timestamp).toMillis() === (sub.updatedAt as Timestamp).toMillis()) {
                        action = 'nueva_suscripcion';
                    } else if (sub.status === 'canceled') {
                        action = 'cancelacion';
                    } else if (sub.status === 'past_due') {
                        action = 'pago_vencido';
                    }
                    
                    const planDetails = allPlans.find(p => p.id === sub.plan);
                    
                    return {
                        userId: c.userId,
                        name: c.name,
                        email: c.email,
                        action,
                        plan: planDetails?.name || sub.plan,
                        date: sub.updatedAt as Timestamp
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
            console.error("Error calculating revenue metrics:", e);
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    }
  }, [clients, areClientsLoading, clientsError, allPlans]);

  return { metrics, isLoading, error };
}
