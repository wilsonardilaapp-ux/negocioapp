'use client';

import React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, Star } from 'lucide-react';
import type { Business } from '@/models/business';

// Componentes del Módulo
import RecoveredRevenueCard from '@/components/admin/loyalty/RecoveredRevenueCard';
import ChurnRiskCard from '@/components/admin/loyalty/ChurnRiskCard';
import VipCustomersRanking from '@/components/admin/loyalty/VipCustomersRanking';
import ReviewSummary from '@/components/reviews/ReviewSummary';

/**
 * @fileOverview Página principal del Módulo de Fidelización e Inteligencia.
 * Ensambla los componentes de ROI, Churn y Ranking VIP en un dashboard coherente.
 */
export default function LoyaltyDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Suscripción a los datos raíz del negocio para el ReviewSummary
  const businessRef = useMemoFirebase(
    () => (user ? doc(firestore, 'businesses', user.uid) : null),
    [user, firestore]
  );
  
  const { data: business, isLoading: loadingBusiness } = useDoc<Business>(businessRef);

  if (loadingBusiness) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando inteligencia de clientes...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto space-y-8 animate-in fade-in duration-700 max-w-7xl">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
                <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900">Fidelización e Inteligencia</h1>
                <p className="text-muted-foreground font-medium">Gestiona tus reseñas, premia a tus clientes VIP y recupera ventas con IA.</p>
            </div>
        </div>
      </header>

      {/* FILA SUPERIOR: Métricas de Impacto y Reputación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecoveredRevenueCard businessId={user.uid} />
        
        <Card className="shadow-sm border-none bg-white p-6 flex flex-col justify-center border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-yellow-50 rounded-lg">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Reputación General</h3>
            </div>
            <ReviewSummary 
                rating={business?.rating || 5.0} 
                reviewCount={business?.reviewCount || 0} 
                distribution={business?.ratingDistribution}
            />
        </Card>
      </div>

      {/* FILA CENTRAL: Acción Proactiva (Churn) */}
      <div className="grid grid-cols-1 gap-6">
        <ChurnRiskCard businessId={user.uid} />
      </div>

      {/* FILA INFERIOR: Tabla de Ranking de Clientes */}
      <div className="grid grid-cols-1 gap-6">
        <VipCustomersRanking businessId={user.uid} />
      </div>
      
      {/* Footer Informativo de Atribución */}
      <footer className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-muted-foreground italic uppercase tracking-wider font-medium">
              * El sistema utiliza una ventana de 7 días para la atribución de ventas recuperadas por IA.
          </p>
      </footer>
    </div>
  );
}
