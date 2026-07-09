
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package, Loader2, RefreshCw } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import { DefaultSubscriptionPlans } from '@/models/subscription-plan';
import { useToast } from '@/hooks/use-toast';
import PlanCard from './components/PlanCard';
import PlanForm from './components/PlanForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function PlansPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

    const plansQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'plans');
    }, [firestore]);
    const { data: plans, isLoading } = useCollection<SubscriptionPlan>(plansQuery);

    const handleOpenDialog = (plan: SubscriptionPlan | null) => {
        setEditingPlan(plan);
        setIsDialogOpen(true);
    };

    /**
     * Restaura los planes por defecto de forma QUIRÚRGICA.
     * Solo actualiza los beneficios (features) y límites.
     * Preserva nombre, precio, descripción y configuraciones de Hotmart.
     */
    const handleCreateDefaultPlans = async () => {
        if (!firestore) return;
        
        try {
            const batch = writeBatch(firestore);
            
            // 1. Obtener datos actuales para realizar el blindaje
            const existingPlansSnap = await getDocs(collection(firestore, 'plans'));
            const existingData = new Map<string, any>();
            existingPlansSnap.forEach(doc => {
                existingData.set(doc.id, doc.data());
            });

            // 2. Preparar el batch con blindaje extendido
            DefaultSubscriptionPlans.forEach(plan => {
                const planRef = doc(firestore, 'plans', plan.id);
                const current = existingData.get(plan.id);
                
                // Iniciamos con el objeto por defecto (que trae los nuevos features/groupKey)
                const restorePayload: any = { ...plan };
                
                // BLINDAJE QUIRÚRGICO: Si el plan ya existe, preservamos sus valores comerciales
                if (current) {
                    // Preservamos Identidad y Precio
                    if (current.name) restorePayload.name = current.name;
                    if (current.price !== undefined) restorePayload.price = current.price;
                    if (current.description) restorePayload.description = current.description;
                    
                    // Preservamos Configuración de Hotmart
                    if (current.hotmartEnabled !== undefined) restorePayload.hotmartEnabled = current.hotmartEnabled;
                    if (current.hotmartUrl !== undefined) restorePayload.hotmartUrl = current.hotmartUrl;
                    
                    // Preservamos ID de Stripe si ya estaba configurado
                    if (current.stripePriceId && !current.stripePriceId.includes('placeholder')) {
                        restorePayload.stripePriceId = current.stripePriceId;
                    }
                }
                
                // Solo se actualizarán realmente: features (con groupKey), limits e includedModuleKeys
                batch.set(planRef, restorePayload, { merge: true });
            });

            await batch.commit();
            
            toast({
                title: 'Actualización Quirúrgica Exitosa',
                description: 'Se han actualizado los beneficios y límites sin afectar tus precios ni nombres personalizados.',
            });
        } catch (error: any) {
            console.error("Error restaurando planes:", error);
            toast({
                variant: 'destructive',
                title: 'Error de Restauración',
                description: error.message || 'No se pudieron sincronizar los planes.'
            });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Gestión de Planes de Suscripción</CardTitle>
                        <CardDescription>
                            Crea, edita y gestiona los planes que ofreces a tus clientes.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleCreateDefaultPlans}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Actualizar Beneficios
                        </Button>
                         <Button onClick={() => handleOpenDialog(null)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nuevo Plan
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {isLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : plans && plans.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
                    {plans.sort((a, b) => a.price - b.price).map(plan => (
                        <PlanCard key={plan.id} plan={plan} onEdit={() => handleOpenDialog(plan)} />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                        <Package className="h-16 w-16 text-muted-foreground" />
                        <h3 className="text-xl font-semibold">No hay planes creados</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Puedes crear planes manualmente o cargar los planes por defecto para empezar.
                        </p>
                        <Button onClick={handleCreateDefaultPlans}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Planes por Defecto
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}</DialogTitle>
                        <DialogDescription>
                            Completa los detalles de tu plan de suscripción.
                        </DialogDescription>
                    </DialogHeader>
                    <PlanForm
                        existingPlan={editingPlan}
                        onClose={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
