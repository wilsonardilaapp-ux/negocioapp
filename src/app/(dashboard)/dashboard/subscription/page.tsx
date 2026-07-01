'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import CurrentPlanCard, { type CurrentPlanInfo } from './components/CurrentPlanCard';
import UsageLimitsCard, { type UsageMetric } from './components/UsageLimitsCard';
import PlanComparisonTable from './components/PlanComparisonTable';
import BillingHistoryCard, { type BillingRecord } from './components/BillingHistoryCard';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CreditCard, Zap, LayoutDashboard, CheckCircle, Smartphone, Building, Building2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Timestamp, doc, collection, setDoc, addDoc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { HybridPlan } from '@/models/hybrid-plan';
import type { GlobalPaymentConfig } from '@/models/global-payment-config';
import type { Business } from '@/models/business';
import { useToast } from '@/hooks/use-toast';
import { es } from 'date-fns/locale';
import Image from 'next/image';

function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const planParam = searchParams.get('plan');
  const [showBanner, setShowBanner] = useState(!!planParam);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | HybridPlan | null>(null);

  // Leer configuración global de pagos
  const paymentConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'payment_methods'), [firestore]);
  const { data: paymentConfig, isLoading: isPaymentConfigLoading } = useDoc<GlobalPaymentConfig>(paymentConfigRef);

  // Leer datos del negocio para el nombre comercial
  const businessDocRef = useMemoFirebase(() => !firestore || !user ? null : doc(firestore, 'businesses', user.uid), [firestore, user]);
  const { data: business } = useDoc<Business>(businessDocRef);

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
    isLoading: isSubDataLoading,
    error,
  } = useSubscription();

  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  
  // Cálculo de precio unificado para planes estándar e híbridos
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
    const planToProcess = selectedPlan || planDetails;
    if (!planToProcess || !user || !paymentConfig) return;
    setIsProcessingPayment(true);
    try {
      // PRIORIDAD 1: Stripe activo con checkoutUrl
      if (paymentConfig.stripe?.enabled && paymentConfig.stripe?.checkoutUrl) {
        window.location.href = paymentConfig.stripe.checkoutUrl;
        return;
      }
      // PRIORIDAD 2: Stripe activo con API (sin checkoutUrl)
      if (paymentConfig.stripe?.enabled) {
        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: (planToProcess as SubscriptionPlan).stripePriceId,
            businessId: user.uid,
            userId: user.uid,
            email: user.email,
          }),
        });
        const sessionData = await res.json();
        if (sessionData.url) {
          window.location.href = sessionData.url;
          return;
        }
      }
      // PRIORIDAD 3: MercadoPago activo con checkoutUrl
      if (paymentConfig.mercadoPago?.enabled && paymentConfig.mercadoPago?.checkoutUrl) {
        window.location.href = paymentConfig.mercadoPago.checkoutUrl;
        return;
      }
      // PRIORIDAD 4: PayPal activo con checkoutUrl
      if (paymentConfig.paypal?.enabled && paymentConfig.paypal?.checkoutUrl) {
        window.location.href = paymentConfig.paypal.checkoutUrl;
        return;
      }
      // PRIORIDAD 5: Métodos manuales activos → abrir modal
      const hasManual = paymentConfig.nequi?.enabled ||
                        paymentConfig.bancolombia?.enabled ||
                        paymentConfig.daviplata?.enabled ||
                        paymentConfig.breB?.enabled;
      if (hasManual) {
        setSelectedPlanForPayment(planToProcess);
        setShowPaymentModal(true);
        return;
      }
      // Sin pasarelas activas
      toast({ variant: "destructive", title: "Sin métodos de pago", description: "No hay métodos de pago disponibles en este momento." });
    } catch (e: any) {
      console.error("Error al procesar pago:", e);
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const isLoading = isSubDataLoading || isPaymentConfigLoading;

  if (isLoading && !planDetails) {
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
                            disabled={isProcessingPayment || isPaymentConfigLoading || !paymentConfig} 
                            className="flex-1 h-12 text-base font-bold shadow-md bg-primary hover:bg-primary/90"
                        >
                            {(isProcessingPayment || isPaymentConfigLoading) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
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

      {/* MODAL DE PAGOS MANUALES */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Instrucciones de Pago</DialogTitle>
            <DialogDescription>
              Utiliza cualquiera de los siguientes métodos manuales para activar tu plan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {paymentConfig?.nequi?.enabled && (
              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Nequi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Titular</Label>
                      <p className="font-bold">{paymentConfig.nequi.holderName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Número de Cuenta</Label>
                      <p className="font-bold">{paymentConfig.nequi.accountNumber}</p>
                    </div>
                  </div>
                  {paymentConfig.nequi.qrImageUrl && (
                    <div className="flex justify-center">
                      <div className="relative h-48 w-48 border rounded-lg overflow-hidden bg-white p-2">
                        <Image src={paymentConfig.nequi.qrImageUrl} alt="Nequi QR" fill className="object-contain" />
                      </div>
                    </div>
                  )}
                  {paymentConfig.nequi.instructions && (
                    <p className="text-sm bg-muted p-3 rounded-md italic">{paymentConfig.nequi.instructions}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {paymentConfig?.bancolombia?.enabled && (
              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <Building className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Bancolombia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Titular</Label>
                      <p className="font-bold">{paymentConfig.bancolombia.holderName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Número de Cuenta</Label>
                      <p className="font-bold">{paymentConfig.bancolombia.accountNumber}</p>
                    </div>
                  </div>
                  {paymentConfig.bancolombia.qrImageUrl && (
                    <div className="flex justify-center">
                      <div className="relative h-48 w-48 border rounded-lg overflow-hidden bg-white p-2">
                        <Image src={paymentConfig.bancolombia.qrImageUrl} alt="Bancolombia QR" fill className="object-contain" />
                      </div>
                    </div>
                  )}
                  {paymentConfig.bancolombia.instructions && (
                    <p className="text-sm bg-muted p-3 rounded-md italic">{paymentConfig.bancolombia.instructions}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {paymentConfig?.daviplata?.enabled && (
              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Daviplata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Titular</Label>
                      <p className="font-bold">{paymentConfig.daviplata.holderName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Número de Cuenta</Label>
                      <p className="font-bold">{paymentConfig.daviplata.accountNumber}</p>
                    </div>
                  </div>
                  {paymentConfig.daviplata.qrImageUrl && (
                    <div className="flex justify-center">
                      <div className="relative h-48 w-48 border rounded-lg overflow-hidden bg-white p-2">
                        <Image src={paymentConfig.daviplata.qrImageUrl} alt="Daviplata QR" fill className="object-contain" />
                      </div>
                    </div>
                  )}
                  {paymentConfig.daviplata.instructions && (
                    <p className="text-sm bg-muted p-3 rounded-md italic">{paymentConfig.daviplata.instructions}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {paymentConfig?.breB?.enabled && (
              <Card className="border-primary/20">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Bre-B</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Comercio</Label>
                      <p className="font-bold">{paymentConfig.breB.holderName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{paymentConfig.breB.keyType}</Label>
                      <p className="font-bold">{paymentConfig.breB.keyValue}</p>
                    </div>
                  </div>
                  {paymentConfig.breB.qrImageUrl && (
                    <div className="flex justify-center">
                      <div className="relative h-48 w-48 border rounded-lg overflow-hidden bg-white p-2">
                        <Image src={paymentConfig.breB.qrImageUrl} alt="Bre-B QR" fill className="object-contain" />
                      </div>
                    </div>
                  )}
                  {paymentConfig.breB.instructions && (
                    <p className="text-sm bg-muted p-3 rounded-md italic">{paymentConfig.breB.instructions}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancelar</Button>
            <Button 
                disabled={isProcessingPayment}
                onClick={async () => {
                    if (!selectedPlanForPayment || !user || !firestore) return;
                    setIsProcessingPayment(true);
                    try {
                        await setDoc(doc(collection(firestore, 'paymentRequests')), {
                            businessId: user.uid,
                            businessName: business?.name || '',
                            planId: selectedPlanForPayment.id,
                            planName: selectedPlanForPayment.name,
                            requestedAt: Timestamp.now(),
                            status: 'pending_verification',
                            paymentMethod: 'manual'
                        });

                        await addDoc(collection(firestore, 'contactMessages'), {
                            name: business?.name || user.uid,
                            email: user.email || '',
                            message: `Solicitud de activación de plan: ${selectedPlanForPayment.name}. El negocio ha indicado que realizó el pago manual. Por favor verifica y activa el plan correspondiente.`,
                            source: 'payment_request',
                            planId: selectedPlanForPayment.id,
                            planName: selectedPlanForPayment.name,
                            businessId: user.uid,
                            createdAt: Timestamp.now(),
                            read: false
                        });

                        setShowPaymentModal(false);
                        toast({ title: "Pago Notificado", description: "Tu pago está siendo verificado por el administrador." });
                    } catch (e) {
                        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la notificación de pago.' });
                    } finally {
                        setIsProcessingPayment(false);
                    }
            }}>
                {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Ya realicé el pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
