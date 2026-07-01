'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import CurrentPlanCard, { type CurrentPlanInfo } from './components/CurrentPlanCard';
import UsageLimitsCard, { type UsageMetric } from './components/UsageLimitsCard';
import PlanComparisonTable from './components/PlanComparisonTable';
import BillingHistoryCard, { type BillingRecord } from './components/BillingHistoryCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CreditCard, CheckCircle2, Zap, LayoutDashboard, CheckCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Timestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { HybridPlan } from '@/models/hybrid-plan';

function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const planParam = searchParams.get('plan');
  const [showBanner, setShowBanner] = useState(!!planParam);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
  
  // Calculate plan price using the union of types logic
  const planPrice = useMemo(() => {
    if (!planDetails) return 0;
    return 'basePrice' in planDetails ? (planDetails as HybridPlan).basePrice : (planDetails as SubscriptionPlan).price;
  }, [planDetails]);

  // Fetch Billing History
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


  // Memoized Derived State
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

  const handlePayNow = async (selectedPlan?: SubscriptionPlan | HybridPlan) => {
    const targetPlan = selectedPlan || planDetails;
    if (!targetPlan || !user) return;
    
    setIsProcessingPayment(true);
    try {
        const isHybrid = 'commissionType' in targetPlan;
        
        if (isHybrid) {
            window.location.href = `/dashboard/pagos`;
            return;
        }

        const res = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priceId: (targetPlan as SubscriptionPlan).stripePriceId,
                businessId: user.uid,
                userId: user.uid,
                email: user.email,
            }),
        });

        const sessionData = await res.json();
        if (sessionData.url) {
            window.location.href = sessionData.url;
        } else {
            throw new Error(sessionData.error || 'Error creando sesión de pago');
        }
    } catch (e) {
        console.error("Error al procesar pago:", e);
        setIsProcessingPayment(false);
    }
  };

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

      {/* SECCIÓN CONFIRMA TU PLAN */}
      {showBanner && planDetails && (
        <Card className="border-2 border-primary bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg">
            {planPrice === 0 ? (
                /* Variante Plan Gratuito */
                <>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    ¡Tu plan está activo!
                                </CardTitle>
                                <CardDescription className="text-gray-600 font-medium">
                                    Ya podés empezar a usar todas las funcionalidades disponibles.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardFooter>
                        <Button 
                            onClick={() => router.push('/dashboard')}
                            className="w-full sm:w-auto font-bold bg-primary hover:bg-primary/90"
                        >
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Ir al Dashboard
                        </Button>
                    </CardFooter>
                </>
            ) : (
                /* Variante Plan de Pago */
                <>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-primary fill-primary" />
                                    Confirma tu plan y completa el pago
                                </CardTitle>
                                <CardDescription className="text-gray-600 font-medium">
                                    Estás a un paso de activar todas las funcionalidades de tu plan.
                                </CardDescription>
                            </div>
                            <Badge variant="default" className="text-sm font-black px-4 py-1.5 uppercase tracking-wider">
                                {planDetails.name}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-gray-900">
                                ${planPrice.toLocaleString('es-CO')}
                            </span>
                            <span className="text-muted-foreground text-sm font-medium">/mes</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 italic">
                            * El cobro se procesará a través de nuestra plataforma segura de pagos.
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-3 pt-0">
                        <Button 
                            onClick={() => handlePayNow()} 
                            disabled={isProcessingPayment} 
                            className="flex-1 h-12 text-base font-bold shadow-md bg-primary hover:bg-primary/90"
                        >
                            {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                            Pagar ahora
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowBanner(false)} 
                            disabled={isProcessingPayment}
                            className="flex-1 h-12 border-primary/20 text-primary hover:bg-primary/5"
                        >
                            Continuar con plan gratuito
                        </Button>
                    </CardFooter>
                </>
            )}
        </Card>
      )}
      
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

          <PlanComparisonTable 
            currentPlan={plan} 
            allPlans={combinedPlans as any} 
            onSelectPlan={(selectedPlan) => handlePayNow(selectedPlan)}
          />

          <BillingHistoryCard billingHistory={billingHistory} isLoading={isBillingLoading} />
        </>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
            <SubscriptionPageContent />
        </Suspense>
    );
}