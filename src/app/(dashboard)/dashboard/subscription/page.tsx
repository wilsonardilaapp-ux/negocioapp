
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, type Timestamp } from 'firebase/firestore';
import { useSubscription } from '@/hooks/useSubscription';
import CurrentPlanCard, { type CurrentPlanInfo } from './components/CurrentPlanCard';
import UsageLimitsCard, { type UsageMetric } from './components/UsageLimitsCard';
import PlanComparisonTable from './components/PlanComparisonTable';
import BillingHistoryCard, { type BillingRecord } from './components/BillingHistoryCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CreditCard } from "lucide-react";

export default function SubscriptionPage() {
  const { 
    subscription,
    allPlans,
    plan,
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
        } catch (e: any) {
           console.error("Billing History Error:", e.message);
        } finally {
          setIsBillingLoading(false);
        }
      };
      fetchBillingHistory();
    }
  }, [subscription?.stripeCustomerId]);


  // --- Memoized Derived State ---
  const { currentPlanInfo, usageMetrics } = useMemo(() => {
    const planDetails = allPlans?.find(p => p.id === plan);
    
    if (!planDetails || !subscription) {
        return { currentPlanInfo: null, usageMetrics: [] };
    }

    const periodEndDate = subscription.currentPeriodEnd ? (subscription.currentPeriodEnd as unknown as Timestamp).toDate() : null;
    const isExpiringSoon = periodEndDate ? periodEndDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false;

    const currentPlanInfo: CurrentPlanInfo = {
      plan: plan as 'free' | 'pro' | 'enterprise',
      status: subscription.status,
      currentPeriodEnd: periodEndDate,
      isExpiringSoon,
      price: planDetails.price,
      displayName: planDetails.name,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
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
  }, [subscription, allPlans, productsCount, blogPostsCount, landingPagesCount, plan, limits]);

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

        {isLoading || !currentPlanInfo ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
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

                <PlanComparisonTable currentPlan={currentPlanInfo.plan} allPlans={allPlans || []} />

                <BillingHistoryCard billingHistory={billingHistory} isLoading={isBillingLoading} />
            </>
        )}
    </div>
  );
}

