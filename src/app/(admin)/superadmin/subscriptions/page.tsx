
"use client";

import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Users, Crown, Star, Award, AlertCircle } from "lucide-react";
import { useAllSubscriptions } from "./hooks/useAllSubscriptions";
import { SubscriptionTable } from "./components/SubscriptionTable";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from 'firebase/firestore';
import type { SubscriptionPlan } from '@/models/subscription-plan';

export default function SubscriptionsPage() {
  const { clients, isLoading: areClientsLoading, error } = useAllSubscriptions();
  const firestore = useFirestore();

  const { data: allPlans, isLoading: arePlansLoading } = useCollection<SubscriptionPlan>(
    useMemoFirebase(() => (firestore ? collection(firestore, 'plans') : null), [firestore])
  );

  const isLoading = areClientsLoading || arePlansLoading;

  const summary = useMemo(() => {
    const counts: Record<string, number> = {
      total: clients.length,
      free: 0,
      pro: 0,
      enterprise: 0,
    };
    clients.forEach(client => {
        const planId = client.subscription?.plan || 'free';
        if (planId in counts) {
            counts[planId]++;
        } else {
             // Optionally handle new plans if you want to see them in summary
        }
    });
    return counts;
  }, [clients]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Suscripciones</CardTitle>
          <CardDescription>
            Administra los planes y el estado de las suscripciones de todos los clientes.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Free</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : summary.free}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Pro</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : summary.pro}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Enterprise</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : summary.enterprise}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes y Suscripciones</CardTitle>
        </CardHeader>
        <CardContent>
            {error ? (
                 <div className="flex flex-col items-center justify-center text-center text-destructive p-8 gap-4">
                    <AlertCircle className="h-10 w-10" />
                    <h3 className="text-lg font-bold">Error al cargar los datos</h3>
                    <p className="text-sm">{error.message}</p>
                 </div>
            ) : (
                 <SubscriptionTable clients={clients} allPlans={allPlans || []} isLoading={isLoading} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
