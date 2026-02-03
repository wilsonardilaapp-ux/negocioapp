
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { SuggestionRule } from "@/models/suggestion-rule";
import type { Product } from "@/models/product";
import { useUser, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from 'firebase/firestore';
import { ArrowRight, Edit, Trash2, Loader2, Lightbulb } from "lucide-react";
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

interface RuleListProps {
    products: Product[];
    rules: SuggestionRule[];
    isLoading: boolean;
    onEdit: (rule: SuggestionRule) => void;
}

export default function RuleList({ products, rules, isLoading, onEdit }: RuleListProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Producto no encontrado';

    const handleStatusChange = (rule: SuggestionRule, active: boolean) => {
        if (!user || !firestore) return;
        const ruleDocRef = doc(firestore, `businesses/${user.uid}/suggestionRules`, rule.id);
        updateDocumentNonBlocking(ruleDocRef, { active });
        toast({ title: `Regla ${active ? 'activada' : 'desactivada'}` });
    };

    const handleDelete = (ruleId: string) => {
        if (!user || !firestore) return;
        const ruleDocRef = doc(firestore, `businesses/${user.uid}/suggestionRules`, ruleId);
        deleteDocumentNonBlocking(ruleDocRef);
        toast({ title: "Regla eliminada", variant: 'destructive' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Cargando reglas...</p>
            </div>
        );
    }
    
    if (!rules || rules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center gap-4 p-10">
                <Lightbulb className="h-12 w-12 text-muted-foreground"/>
                <h3 className="text-lg font-semibold">Aún no hay reglas</h3>
                <p className="text-sm text-muted-foreground">Crea tu primera regla para empezar a aumentar tus ventas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {rules.map(rule => (
                <Card key={rule.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Switch
                                checked={rule.active}
                                onCheckedChange={(checked) => handleStatusChange(rule, checked)}
                            />
                            <div className="flex flex-col md:flex-row md:items-center gap-2 text-sm">
                                <span>Si compran: <Badge variant="secondary">{getProductName(rule.triggerItem)}</Badge></span>
                                <ArrowRight className="h-4 w-4 hidden md:block" />
                                <span>Sugerir: <Badge>{getProductName(rule.suggestedItem)}</Badge></span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <Badge variant="outline">{rule.suggestionType}</Badge>
                             <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará la regla permanentemente.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(rule.id)} className="bg-destructive hover:bg-destructive/90">
                                        Eliminar
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
