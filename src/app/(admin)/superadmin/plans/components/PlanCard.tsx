"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Edit, Trash2, InfinityIcon } from "lucide-react";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirestore, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface PlanCardProps {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function PlanCard({ plan, onEdit }: PlanCardProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleDelete = () => {
        if (!firestore) return;
        const planDocRef = doc(firestore, 'plans', plan.id);
        deleteDocumentNonBlocking(planDocRef);
        toast({
            title: "Plan Eliminado",
            description: `El plan "${plan.name}" ha sido eliminado.`,
            variant: "destructive",
        });
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.isMostPopular && <Badge>Más Popular</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground">/mes</span>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Características:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span>{feature.value}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="space-y-2 pt-2">
                    <h4 className="font-semibold text-sm">Límites:</h4>
                    <ul className="space-y-1 text-sm">
                        <li className="flex justify-between"><span>Productos:</span> <span className="font-medium">{plan.limits.products === -1 ? <InfinityIcon className="h-4 w-4"/> : plan.limits.products}</span></li>
                        <li className="flex justify-between"><span>Posts de Blog:</span> <span className="font-medium">{plan.limits.blogPosts === -1 ? <InfinityIcon className="h-4 w-4"/> : plan.limits.blogPosts}</span></li>
                        <li className="flex justify-between"><span>Landing Pages:</span> <span className="font-medium">{plan.limits.landingPages === -1 ? <InfinityIcon className="h-4 w-4"/> : plan.limits.landingPages}</span></li>
                    </ul>
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={() => onEdit(plan)}>
                    <Edit className="mr-2 h-4 w-4" /> Editar
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={plan.id === 'free'}>
                            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro de que quieres eliminar este plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. El plan "{plan.name}" será eliminado permanentemente. Los usuarios en este plan no serán afectados hasta su próxima renovación.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                Sí, eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
