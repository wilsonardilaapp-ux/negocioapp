'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Star, Trophy, MessageSquare, Save, Info, Globe } from 'lucide-react';
import type { Business } from '@/models/business';
import { useToast } from '@/hooks/use-toast';
import { updateBusinessLoyaltyConfig } from '@/actions/business';

// Componentes del Módulo
import RecoveredRevenueCard from '@/components/admin/loyalty/RecoveredRevenueCard';
import ChurnRiskCard from '@/components/admin/loyalty/ChurnRiskCard';
import VipCustomersRanking from '@/components/admin/loyalty/VipCustomersRanking';
import ReviewSummary from '@/components/reviews/ReviewSummary';
import ReviewModerationList from '@/components/reviews/ReviewModerationList';

/**
 * @fileOverview Página principal del Módulo de Fidelización e Inteligencia.
 * Ensambla los componentes de ROI, Churn, Ranking VIP y Moderación de Reseñas.
 */
export default function LoyaltyDashboardPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Suscripción a los datos raíz del negocio
  const businessRef = useMemoFirebase(
    () => (user ? doc(firestore, 'businesses', user.uid) : null),
    [user, firestore]
  );
  
  const { data: business, isLoading: loadingBusiness } = useDoc<Business>(businessRef);

  // Estados para la configuración de Google Reviews
  const [googleLink, setGoogleLink] = useState('');
  const [isSavingLink, setIsSavingLink] = useState(false);

  // Sincronizar el estado inicial cuando cargan los datos del negocio
  useEffect(() => {
    if (business?.googleReviewLink) {
      setGoogleLink(business.googleReviewLink);
    }
  }, [business?.googleReviewLink]);

  const handleSaveLink = async () => {
    if (!user) return;
    
    setIsSavingLink(true);
    try {
      const result = await updateBusinessLoyaltyConfig(user.uid, { googleReviewLink: googleLink });
      if (result.success) {
        toast({
          title: "Enlace guardado",
          description: "Tu enlace de Google Reviews ha sido actualizado correctamente.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: result.error || "Ocurrió un error inesperado.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error de red",
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsSavingLink(false);
    }
  };

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
                <p className="text-muted-foreground font-medium">Gestiona tu reputación, premia a tus clientes VIP y recupera ventas con IA.</p>
            </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/50 p-1 rounded-xl mb-8">
            <TabsTrigger value="overview" className="gap-2 rounded-lg">
                <Trophy className="h-4 w-4" /> Estadísticas y VIP
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2 rounded-lg">
                <MessageSquare className="h-4 w-4" /> Moderación Reseñas
            </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-500 outline-none">
            {/* FILA SUPERIOR: Métricas de Impacto y Reputación */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecoveredRevenueCard businessId={user.uid} />
                
                <Card className="shadow-sm border-none bg-white p-6 flex flex-col justify-center border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-yellow-50 rounded-lg">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resumen de Reputación</h3>
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
        </TabsContent>

        <TabsContent value="reviews" className="animate-in fade-in duration-500 outline-none">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900">Moderación de Opiniones</h2>
                    <p className="text-sm text-muted-foreground">Aprueba las valoraciones pendientes y responde a tus clientes.</p>
                </div>
                
                <ReviewModerationList businessId={user.uid} />

                {/* SECCIÓN: CONFIGURACIÓN DE GOOGLE REVIEWS */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            Link Directo de Google Reviews
                        </CardTitle>
                        <CardDescription>
                            Configura el enlace que tus clientes usarán para calificarte públicamente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="google-link" className="font-bold text-gray-700">Enlace de Reseñas de Google</Label>
                            <Input 
                                id="google-link"
                                placeholder="https://g.page/r/XXXXXXXX/review"
                                value={googleLink}
                                onChange={(e) => setGoogleLink(e.target.value)}
                                className="bg-white border-primary/20 focus-visible:ring-primary"
                            />
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-xs leading-relaxed">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" />
                            <p>
                                <span className="font-black">💡 Tip:</span> Usa el link directo de <strong>&quot;Escribir una reseña&quot;</strong> de tu perfil de Google Business. 
                                Esto permitirá que la IA invite a tus clientes a calificarte públicamente de forma efectiva.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t bg-white/50 py-4">
                        <Button 
                            onClick={handleSaveLink} 
                            disabled={isSavingLink}
                            className="ml-auto font-black px-8"
                        >
                            {isSavingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Enlace
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
      
      {/* Footer Informativo de Atribución */}
      <footer className="pt-8 pb-4 text-center">
          <p className="text-[10px] text-muted-foreground italic uppercase tracking-wider font-medium">
              * El sistema utiliza una ventana de 7 días para la atribución de ventas recuperadas por IA.
          </p>
      </footer>
    </div>
  );
}
