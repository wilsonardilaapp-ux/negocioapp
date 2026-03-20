
"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Subscription } from '@/models/subscription';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

export interface CurrentPlanInfo {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date | null;
  isExpiringSoon: boolean;
  price: number;
  displayName: string;
  stripeSubscriptionId: string | null;
}

interface CurrentPlanCardProps {
  planInfo: CurrentPlanInfo;
}

const planConfig = {
    free: { name: 'Plan Gratuito', badge: 'secondary' as const },
    pro: { name: 'Plan Profesional', badge: 'default' as const },
    enterprise: { name: 'Plan Empresarial', badge: 'destructive' as const },
};

const statusConfig = {
    active: { label: 'Activo', variant: 'default' as const }, // Success would be green
    canceled: { label: 'Cancelado', variant: 'destructive' as const },
    past_due: { label: 'Pago Vencido', variant: 'destructive' as const },
    trialing: { label: 'En Prueba', variant: 'secondary' as const },
};

export default function CurrentPlanCard({ planInfo }: CurrentPlanCardProps) {
  const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleCancelSubscription = async () => {
    if (!planInfo.stripeSubscriptionId || !user || !firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se encontró información de la suscripción para cancelar.",
        });
        return;
    }

    try {
        const res = await fetch('/api/stripe/manage-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stripeSubscriptionId: planInfo.stripeSubscriptionId, action: 'cancel' })
        });

        if (!res.ok) {
            const { error } = await res.json();
            throw new Error(error || 'Error en el servidor al cancelar.');
        }
        
        // Update Firestore status
        const subDocRef = doc(firestore, `businesses/${user.uid}/subscription`, 'current');
        await updateDocumentNonBlocking(subDocRef, { status: 'canceled' });

        toast({
            title: "Suscripción Cancelada",
            description: "Tu plan será cancelado al final del período de facturación actual.",
        });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error al cancelar",
            description: error.message || "No se pudo procesar la cancelación.",
        });
    } finally {
        setCancelConfirmOpen(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>Tu Plan Actual</CardTitle>
           <Badge variant={planConfig[planInfo.plan].badge} className="capitalize text-lg px-4 py-1">{planInfo.plan}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <p className="text-4xl font-bold">${planInfo.price}<span className="text-lg font-normal text-muted-foreground">/mes</span></p>
            <p className="text-muted-foreground">{planConfig[planInfo.plan].name}</p>
        </div>
        <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Estado:</p>
            <Badge variant={statusConfig[planInfo.status].variant}>{statusConfig[planInfo.status].label}</Badge>
        </div>
        {planInfo.currentPeriodEnd && planInfo.status === 'active' && (
            <div className={cn("text-sm", planInfo.isExpiringSoon && "text-destructive font-bold")}>
                <p>{planInfo.isExpiringSoon && "⚠️ "}
                {planInfo.plan === 'free' ? 'Nunca expira' : `Se renueva el ${format(planInfo.currentPeriodEnd, "d 'de' MMMM 'de' yyyy", { locale: es })}.`}
                </p>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {planInfo.plan === 'free' && (
             <Button className="w-full" asChild>
                <Link href="/pricing">Actualizar a PRO →</Link>
            </Button>
        )}
        {planInfo.plan === 'pro' && (
            <Button className="w-full" asChild>
                <Link href="/pricing">Actualizar a ENTERPRISE →</Link>
            </Button>
        )}
         {planInfo.plan !== 'free' && (
            <>
                <Button variant="destructive" className="w-full" onClick={() => setCancelConfirmOpen(true)}>Cancelar Suscripción</Button>
                <AlertDialog open={isCancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de que quieres cancelar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Perderás acceso a las funciones de tu plan al finalizar el período de facturación actual. Puedes reactivar tu plan en cualquier momento antes de esa fecha.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>No, mantener plan</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive hover:bg-destructive/80">Sí, cancelar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </>
        )}
      </CardFooter>
    </Card>
  );
}
