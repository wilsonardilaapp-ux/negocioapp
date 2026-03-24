
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, type Timestamp } from 'firebase/firestore';
import { useSubscription } from '@/hooks/useSubscription';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import CurrentPlanCard, { type CurrentPlanInfo } from './components/CurrentPlanCard';
import UsageLimitsCard, { type UsageMetric } from './components/UsageLimitsCard';
import PlanComparisonTable from './components/PlanComparisonTable';
import BillingHistoryCard, { type BillingRecord } from './components/BillingHistoryCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SubscriptionPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  
  // --- Firestore Data Hooks ---
  const { subscription, plan, limits, isLoading: isSubLoading, error: subError } = useSubscription();

  const productsRef = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/products`) : null, [user, firestore]);
  const blogPostsQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, 'blog_posts'), where('businessId', '==', user.uid)) : null, 
    [user, firestore]
  );
  const landingPagesRef = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/landingPages`) : null, [user, firestore]);
  const plansRef = useMemoFirebase(() => firestore ? collection(firestore, 'plans') : null, [firestore]);
  
  const { data: products, isLoading: isProductsLoading } = useCollection(productsRef);
  const { data: blogPosts, isLoading: isBlogPostsLoading } = useCollection(blogPostsQuery);
  const { data: landingPages, isLoading: isLandingPagesLoading } = useCollection(landingPagesRef);
  const { data: allPlans, isLoading: arePlansLoading, error: plansError } = useCollection<SubscriptionPlan>(plansRef);
  
  const isLoading = isSubLoading || isProductsLoading || isBlogPostsLoading || isLandingPagesLoading || arePlansLoading || isBillingLoading;
  const error = subError || plansError;

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
          setError(e.message);
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
      { label: 'Productos', current: products?.length ?? 0, limit: limits.products },
      { label: 'Posts de Blog', current: blogPosts?.length ?? 0, limit: limits.blogPosts },
      { label: 'Landing Pages', current: landingPages?.length ?? 0, limit: limits.landingPages },
    ].map(metric => ({
        ...metric,
        isUnlimited: metric.limit === -1,
        percentage: metric.limit > 0 ? (metric.current / metric.limit) * 100 : 0,
        isAtLimit: metric.limit > 0 && metric.current >= metric.limit,
    }));
    
    return { currentPlanInfo, usageMetrics };
  }, [subscription, allPlans, products, blogPosts, landingPages, plan, limits]);

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
                <AlertDescription>{error.message}</AlertDescription>
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
