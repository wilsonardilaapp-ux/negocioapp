
"use client";

import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Users, Crown, Star, Pro, AlertCircle } from "lucide-react";
import { useAllSubscriptions } from "./hooks/useAllSubscriptions";
import { SubscriptionTable } from "./components/SubscriptionTable";

export default function SubscriptionsPage() {
  const { clients, isLoading, error } = useAllSubscriptions();

  const summary = useMemo(() => {
    return {
      total: clients.length,
      free: clients.filter(c => (c.subscription?.plan || 'free') === 'free').length,
      pro: clients.filter(c => c.subscription?.plan === 'pro').length,
      enterprise: clients.filter(c => c.subscription?.plan === 'enterprise').length,
    };
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
            <Pro className="h-4 w-4 text-muted-foreground" />
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
                 <SubscriptionTable clients={clients} isLoading={isLoading} />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
