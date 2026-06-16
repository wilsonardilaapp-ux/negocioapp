
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import CurrentPlanCard, { type CurrentPlanInfo } from './components/CurrentPlanCard';
import UsageLimitsCard, { type UsageMetric } from './components/UsageLimitsCard';
import PlanComparisonTable from './components/PlanComparisonTable';
import BillingHistoryCard, { type BillingRecord } from './components/BillingHistoryCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CreditCard } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { Timestamp } from 'firebase/firestore';


export default function SubscriptionPage() {
  const { 
    subscription,
    allPlans,
    allHybridPlans,
    plan,
    planDetails,
    limits,
    productsCount,
    blogPostsCount,
    landingPagesCount,
    isLoading,
    error,
  } = useSubscription();

  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  
  // --- Fetch Billing History ---
  useEffect(() => {
    if (subscription?.stripeCustomerId) {
      setIsBillingLoading(true);
      const fetchBillingHistory = async () => {
        try {
          const res = await fetch('/api/stripe/billing-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stripeCustomerId: subscription.stripeCustomerId }),
          });
          if (!res.ok) throw new Error('Failed to fetch billing history');
          const data = await res.json();
          setBillingHistory(data);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Unknown error';
          console.error("Billing History Error:", message);
        } finally {
          setIsBillingLoading(false);
        }
      };
      fetchBillingHistory();
    }
  }, [subscription?.stripeCustomerId]);


  // --- Memoized Derived State ---
  const { currentPlanInfo, usageMetrics } = useMemo(() => {
    if (!planDetails) {
      return { currentPlanInfo: null, usageMetrics: [] };
    }

    const periodEndDate = subscription?.currentPeriodEnd 
      ? (subscription.currentPeriodEnd as unknown as Timestamp).toDate() 
      : null;
    const isExpiringSoon = periodEndDate 
      ? periodEndDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
      : false;

    // Detectar precio basado en el tipo de plan (estándar vs híbrido)
    const price = 'basePrice' in planDetails ? (planDetails as any).basePrice : (planDetails as any).price;

    const currentPlanInfo: CurrentPlanInfo = {
      plan: plan,
      status: subscription?.status ?? 'active',
      currentPeriodEnd: periodEndDate,
      isExpiringSoon,
      price: price ?? 0,
      displayName: planDetails.name,
      stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
    };

    const usageMetrics: UsageMetric[] = [
      { label: 'Productos', current: productsCount, limit: limits.products },
      { label: 'Posts de Blog', current: blogPostsCount, limit: limits.blogPosts },
      { label: 'Landing Pages', current: landingPagesCount, limit: limits.landingPages },
    ].map(metric => ({
        ...metric,
        isUnlimited: metric.limit === -1,
        percentage: metric.limit > 0 ? (metric.current / metric.limit) * 100 : 0,
        isAtLimit: metric.limit > 0 && metric.current >= metric.limit,
    }));
    
    return { currentPlanInfo, usageMetrics };
  }, [subscription, planDetails, productsCount, blogPostsCount, landingPagesCount, plan, limits]);

  // --- Render: Loading global ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const combinedPlans = [...(allPlans || []), ...(allHybridPlans || [])];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mi Suscripción</CardTitle>
          <CardDescription>Gestiona tu plan, revisa tus límites y mira tu historial de pagos.</CardDescription>
        </CardHeader>
      </Card>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {!currentPlanInfo ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Sin suscripción activa
            </CardTitle>
            <CardDescription>
              No se encontró información de suscripción para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Si crees que esto es un error, contacta al soporte técnico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1">
              <CurrentPlanCard planInfo={currentPlanInfo} />
            </div>
            <div className="lg:col-span-2">
              <UsageLimitsCard usage={usageMetrics} currentPlan={currentPlanInfo.plan} />
            </div>
          </div>

          <PlanComparisonTable currentPlan={plan} allPlans={combinedPlans as any} />

          <BillingHistoryCard billingHistory={billingHistory} isLoading={isBillingLoading} />
        </>
      )}
    </div>
  );
}
