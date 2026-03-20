"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, type Timestamp } from 'firebase/firestore';
import type { Subscription } from '@/models/subscription';
import CurrentPlanCard, { type CurrentPlanInfo } from './components/CurrentPlanCard';
import UsageLimitsCard, { type UsageMetric } from './components/UsageLimitsCard';
import PlanComparisonTable from './components/PlanComparisonTable';
import BillingHistoryCard, { type BillingRecord } from './components/BillingHistoryCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const PLAN_CONFIG = {
  free: { name: 'Plan Gratuito', price: 0, limits: { products: 10, services: 3, blogPosts: 5, landingPages: 1 } },
  pro: { name: 'Plan Profesional', price: 29, limits: { products: -1, services: -1, blogPosts: -1, landingPages: -1 } },
  enterprise: { name: 'Plan Empresarial', price: 99, limits: { products: -1, services: -1, blogPosts: -1, landingPages: -1 } },
};

export default function SubscriptionPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Firestore Data Hooks ---
  const subscriptionRef = useMemoFirebase(() => user ? doc(firestore, `businesses/${user.uid}/subscription`, 'current') : null, [user, firestore]);
  const productsRef = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/products`) : null, [user, firestore]);
  const blogPostsRef = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/blog_posts`) : null, [user, firestore]);
  const landingPagesRef = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/landingPages`) : null, [user, firestore]);
  
  const { data: subscription, isLoading: isSubLoading } = useDoc<Subscription>(subscriptionRef);
  const { data: products, isLoading: isProductsLoading } = useCollection(productsRef);
  const { data: blogPosts, isLoading: isBlogPostsLoading } = useCollection(blogPostsRef);
  const { data: landingPages, isLoading: isLandingPagesLoading } = useCollection(landingPagesRef);
  
  const isLoading = isSubLoading || isProductsLoading || isBlogPostsLoading || isLandingPagesLoading || isBillingLoading;

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
  const { currentPlan, usageMetrics } = useMemo(() => {
    const planName = subscription?.plan || 'free';
    const planDetails = PLAN_CONFIG[planName];

    // Current Plan Info
    const periodEndDate = subscription?.currentPeriodEnd ? (subscription.currentPeriodEnd as unknown as Timestamp).toDate() : null;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.setDate(now.getDate() + 7));
    const isExpiringSoon = periodEndDate ? periodEndDate < sevenDaysFromNow : false;
    
    const currentPlan: CurrentPlanInfo = {
      plan: planName,
      status: subscription?.status || 'active',
      currentPeriodEnd: periodEndDate,
      isExpiringSoon,
      price: planDetails.price,
      displayName: planDetails.name,
      stripeSubscriptionId: subscription?.stripeSubscriptionId || null,
    };
    
    // Usage Metrics
    const usageMetrics: UsageMetric[] = [
      { label: 'Productos', current: products?.length ?? 0, limit: planDetails.limits.products },
      { label: 'Posts de Blog', current: blogPosts?.length ?? 0, limit: planDetails.limits.blogPosts },
      { label: 'Landing Pages', current: landingPages?.length ?? 0, limit: planDetails.limits.landingPages },
       // Adding a placeholder for services as its collection is not defined in the prompt context
      { label: 'Servicios', current: 0, limit: planDetails.limits.services },
    ].map(metric => {
        const isUnlimited = metric.limit === -1;
        const percentage = isUnlimited || metric.limit === 0 ? 0 : (metric.current / metric.limit) * 100;
        return {
            ...metric,
            isUnlimited,
            percentage: Math.min(percentage, 100),
            isAtLimit: !isUnlimited && metric.current >= metric.limit,
        };
    });

    return { currentPlan, usageMetrics };

  }, [subscription, products, blogPosts, landingPages]);

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
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        ) : (
            <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1">
                        <CurrentPlanCard planInfo={currentPlan} />
                    </div>
                    <div className="lg:col-span-2">
                        <UsageLimitsCard usage={usageMetrics} currentPlan={currentPlan.plan} />
                    </div>
                </div>

                <PlanComparisonTable currentPlan={currentPlan.plan} />

                <BillingHistoryCard billingHistory={billingHistory} isLoading={isBillingLoading} />
            </>
        )}
    </div>
  );
}
