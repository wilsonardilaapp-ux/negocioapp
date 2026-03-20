"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
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

    const plansQuery = collection(firestore, 'plans');
    const { data: plans, isLoading } = useCollection<SubscriptionPlan>(plansQuery);

    const handleOpenDialog = (plan: SubscriptionPlan | null) => {
        setEditingPlan(plan);
        setIsDialogOpen(true);
    };

    const handleCreateDefaultPlans = async () => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        DefaultSubscriptionPlans.forEach(plan => {
            const planRef = doc(firestore, 'plans', plan.id);
            batch.set(planRef, plan);
        });
        await batch.commit();
        toast({
            title: 'Planes creados',
            description: 'Los planes por defecto han sido creados en la base de datos.',
        });
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
                     <Button onClick={() => handleOpenDialog(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Plan
                    </Button>
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
