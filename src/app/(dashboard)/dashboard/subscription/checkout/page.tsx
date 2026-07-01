'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, Timestamp, addDoc } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  ChevronLeft, 
  CreditCard, 
  CheckCircle2, 
  Smartphone, 
  Building, 
  Building2, 
  ShieldCheck, 
  Zap, 
  Clock 
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import type { GlobalPaymentConfig } from '@/models/global-payment-config';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { HybridPlan } from '@/models/hybrid-plan';
import type { Business } from '@/models/business';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const planId = searchParams.get('plan');
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Obtener Planes y Configuración
  const { allPlans, allHybridPlans, isLoading: isSubDataLoading } = useSubscription();
  
  const paymentConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'payment_methods'), [firestore]);
  const { data: paymentConfig, isLoading: isConfigLoading } = useDoc<GlobalPaymentConfig>(paymentConfigRef);

  const businessRef = useMemoFirebase(() => !user ? null : doc(firestore, 'businesses', user.uid), [user, firestore]);
  const { data: business } = useDoc<Business>(businessRef);

  // 2. Resolver Plan Seleccionado
  const selectedPlan = useMemo(() => {
    if (!planId) return null;
    return allPlans.find(p => p.id === planId) || allHybridPlans.find(p => p.id === planId);
  }, [planId, allPlans, allHybridPlans]);

  const isHybrid = selectedPlan && 'commissionType' in selectedPlan;
  const price = selectedPlan ? (isHybrid ? (selectedPlan as HybridPlan).basePrice : (selectedPlan as SubscriptionPlan).price) : 0;

  // 3. Manejo de Pago Automático
  const handleAutoPay = async () => {
    if (!selectedPlan || !user || !paymentConfig) return;
    setIsProcessing(true);
    try {
      // Prioridad 1: Stripe con Checkout URL Directo
      if (paymentConfig.stripe?.enabled && paymentConfig.stripe?.checkoutUrl) {
        window.location.href = paymentConfig.stripe.checkoutUrl;
        return;
      }

      // Prioridad 2: Stripe API
      if (paymentConfig.stripe?.enabled) {
        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId: (selectedPlan as SubscriptionPlan).stripePriceId,
            businessId: user.uid,
            userId: user.uid,
            email: user.email,
          }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }

      // Prioridad 3: MercadoPago
      if (paymentConfig.mercadoPago?.enabled && paymentConfig.mercadoPago?.checkoutUrl) {
        window.location.href = paymentConfig.mercadoPago.checkoutUrl;
        return;
      }

      // Prioridad 4: PayPal
      if (paymentConfig.paypal?.enabled && paymentConfig.paypal?.checkoutUrl) {
        window.location.href = paymentConfig.paypal.checkoutUrl;
        return;
      }

      toast({ variant: "destructive", title: "Error", description: "No hay pasarelas automáticas configuradas." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Manejo de Pago Manual
  const handleManualPayConfirm = async () => {
    if (!selectedPlan || !user || !firestore) return;
    setIsProcessing(true);
    try {
      const planName = selectedPlan.name;
      
      // Registrar solicitud técnica
      await addDoc(collection(firestore, 'paymentRequests'), {
        businessId: user.uid,
        businessName: business?.name || user.uid,
        planId: selectedPlan.id,
        planName: planName,
        requestedAt: Timestamp.now(),
        status: 'pending_verification',
        paymentMethod: 'manual'
      });

      // Registrar notificación para el admin
      await addDoc(collection(firestore, 'contactMessages'), {
        name: business?.name || user.uid,
        email: user.email || '',
        body: `Solicitud de activación de plan: ${planName}. El negocio ha indicado que realizó el pago manual. Por favor verifica y activa el plan correspondiente.`,
        source: 'payment_request',
        planId: selectedPlan.id,
        planName: planName,
        businessId: user.uid,
        createdAt: Timestamp.now(),
        read: false
      });

      toast({ title: "Pago Notificado", description: "Tu solicitud está siendo verificada por el administrador." });
      router.push('/dashboard');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar la notificación.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSubDataLoading || isConfigLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Preparando tu orden...</p>
      </div>
    );
  }

  if (!selectedPlan) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Plan no encontrado</h2>
        <Button className="mt-4" onClick={() => router.push('/dashboard/subscription')}>Volver</Button>
      </div>
    );
  }

  const hasAutoGateways = paymentConfig?.stripe?.enabled || paymentConfig?.mercadoPago?.enabled || paymentConfig?.paypal?.enabled;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground">
          <ChevronLeft className="mr-2 h-4 w-4" /> Volver a los planes
        </Button>
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Paso 2 de 3</span>
            <div className="flex gap-1">
                <div className="h-1.5 w-6 bg-primary rounded-full"></div>
                <div className="h-1.5 w-6 bg-primary rounded-full"></div>
                <div className="h-1.5 w-6 bg-muted rounded-full"></div>
            </div>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Confirma tu plan y completa el pago</h1>
        <p className="text-muted-foreground">Estás a un paso de activar todas las herramientas de Zentry.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* COLUMNA IZQUIERDA: RESUMEN */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Resumen del Plan</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-primary">{selectedPlan.name}</h3>
                  {isHybrid && <Badge variant="outline" className="mt-1 bg-orange-50 border-orange-200 text-orange-700">Plan Híbrido</Badge>}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">${price.toLocaleString('es-CO')}</span>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Mensual</p>
                </div>
              </div>

              {isHybrid && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 flex gap-2 items-start">
                  <Zap className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-800 leading-tight">
                    Este plan tiene un costo variable de <strong>${(selectedPlan as HybridPlan).pricePerOrder.toLocaleString('es-CO')}</strong> por cada pedido realizado.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Lo que incluye:</p>
                <ul className="space-y-2">
                  {selectedPlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span>{f.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-medium">
             <ShieldCheck className="h-4 w-4" />
             Pago seguro — Activación inmediata después del pago
          </div>
        </div>

        {/* COLUMNA DERECHA: MÉTODOS DE PAGO */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="shadow-lg border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Métodos de Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* PAGO AUTOMÁTICO */}
              {hasAutoGateways && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white">Recomendado</Badge>
                    <span className="text-sm font-bold">Pago Automático</span>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full h-14 text-lg font-bold shadow-md bg-primary hover:bg-primary/90"
                    onClick={handleAutoPay}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                    Pagar Ahora y Activar
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground italic">
                    Redirección a plataforma de pago segura. La activación es automática tras la transacción.
                  </p>
                </div>
              )}

              {hasAutoGateways && <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground font-bold">O paga manualmente</span></div></div>}

              {/* PAGO MANUAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold">Transferencia Bancaria (Manual)</span>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-2">
                  {/* NEQUI */}
                  {paymentConfig?.nequi?.enabled && (
                    <AccordionItem value="nequi" className="border rounded-xl px-4 bg-muted/20">
                      <AccordionTrigger className="hover:no-underline font-bold">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-5 w-5 text-primary" />
                          Nequi
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded-lg border">
                          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Titular</p><p className="font-bold">{paymentConfig.nequi.holderName}</p></div>
                          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Número</p><p className="font-bold">{paymentConfig.nequi.accountNumber}</p></div>
                        </div>
                        {paymentConfig.nequi.qrImageUrl && (
                          <div className="flex justify-center bg-white p-4 rounded-lg border"><Image src={paymentConfig.nequi.qrImageUrl} alt="QR" width={160} height={160} className="object-contain" /></div>
                        )}
                        {paymentConfig.nequi.instructions && <p className="text-xs italic text-muted-foreground bg-muted p-2 rounded">{paymentConfig.nequi.instructions}</p>}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* BANCOLOMBIA */}
                  {paymentConfig?.bancolombia?.enabled && (
                    <AccordionItem value="bancolombia" className="border rounded-xl px-4 bg-muted/20">
                      <AccordionTrigger className="hover:no-underline font-bold">
                        <div className="flex items-center gap-3">
                          <Building className="h-5 w-5 text-primary" />
                          Bancolombia
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded-lg border">
                          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Titular</p><p className="font-bold">{paymentConfig.bancolombia.holderName}</p></div>
                          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Cuenta</p><p className="font-bold">{paymentConfig.bancolombia.accountNumber}</p></div>
                        </div>
                        {paymentConfig.bancolombia.qrImageUrl && (
                          <div className="flex justify-center bg-white p-4 rounded-lg border"><Image src={paymentConfig.bancolombia.qrImageUrl} alt="QR" width={160} height={160} className="object-contain" /></div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* BRE-B */}
                  {paymentConfig?.breB?.enabled && (
                    <AccordionItem value="breb" className="border rounded-xl px-4 bg-muted/20">
                      <AccordionTrigger className="hover:no-underline font-bold">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          Bre-B
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-white p-3 rounded-lg border">
                          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">Comercio</p><p className="font-bold">{paymentConfig.breB.holderName}</p></div>
                          <div><p className="text-[10px] text-muted-foreground uppercase font-bold">{paymentConfig.breB.keyType}</p><p className="font-bold">{paymentConfig.breB.keyValue}</p></div>
                        </div>
                         {paymentConfig.breB.qrImageUrl && (
                          <div className="flex justify-center bg-white p-4 rounded-lg border"><Image src={paymentConfig.breB.qrImageUrl} alt="QR" width={160} height={160} className="object-contain" /></div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                <div className="pt-4">
                  <Button 
                    variant="secondary" 
                    className="w-full font-bold h-12"
                    onClick={handleManualPayConfirm}
                    disabled={isProcessing}
                  >
                    Ya realicé el pago
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-2 uppercase tracking-wider font-bold">
                    El administrador verificará tu pago en un plazo de 1 a 12 horas.
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
