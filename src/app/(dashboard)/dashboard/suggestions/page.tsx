
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Frown, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc } from 'firebase/firestore';
import type { Module } from "@/models/module";
import type { SuggestionRule } from "@/models/suggestion-rule";
import type { Product } from "@/models/product";
import RuleForm from '@/components/suggestions/rule-form';
import RuleList from '@/components/suggestions/rule-list';
import MetricsDisplay from '@/components/suggestions/metrics-display';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { syncMetricsWithOrders } from '@/ai/flows/sync-suggestion-analytics';
import { useToast } from '@/hooks/use-toast';

export default function SuggestionsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<SuggestionRule | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const suggestionsModuleQuery = useMemoFirebase(() => 
        !firestore ? null : doc(firestore, 'modules', 'motor-de-sugerencias-inteligentes'), 
    [firestore]);
    
    const productsQuery = useMemoFirebase(() => 
        !firestore || !user ? null : collection(firestore, `businesses/${user.uid}/products`),
    [firestore, user]);

    const rulesQuery = useMemoFirebase(() =>
        !firestore || !user ? null : collection(firestore, `businesses/${user.uid}/suggestionRules`),
    [firestore, user]);

    const { data: suggestionModule, isLoading: isModulesLoading } = useDoc<Module>(suggestionsModuleQuery);
    const { data: products, isLoading: areProductsLoading } = useCollection<Product>(productsQuery);
    const { data: rules, isLoading: areRulesLoading } = useCollection<SuggestionRule>(rulesQuery);
    
    const handleSync = async () => {
        if (!user) return;
        setIsSyncing(true);
        try {
            const result = await syncMetricsWithOrders(user.uid);
            
            if (result.success) {
                toast({
                    title: "Sincronización Completada",
                    description: result.message,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error de Sincronización",
                    description: `${result.message} (Paso: ${result.debugInfo})`, 
                });
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error de Conexión",
                description: err.message || "No se pudo contactar al servidor.",
            });
        } finally {
            setIsSyncing(false);
        }
    };
    
    const handleEditRule = (rule: SuggestionRule) => {
        setEditingRule(rule);
        setIsFormOpen(true);
    };

    const handleAddNewRule = () => {
        setEditingRule(null);
        setIsFormOpen(true);
    };
    
    const isLoading = isModulesLoading || areProductsLoading || areRulesLoading;

    if (isLoading && !rules) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">Cargando motor de sugerencias...</p>
            </div>
        );
    }

    if (!suggestionModule || suggestionModule.status === 'inactive') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Módulo Desactivado</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                    <div className="p-4 bg-secondary rounded-full">
                        <Frown className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold">Motor de Sugerencias en Mantenimiento</h3>
                    <p className="text-muted-foreground max-w-sm">
                        Esta funcionalidad no está activa. Por favor, contacta al administrador de la plataforma para más información.
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Motor de Sugerencias Inteligentes</CardTitle>
                        <CardDescription>
                            Crea reglas para ofrecer productos complementarios (cross-sell) o de mayor valor (upsell).
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button onClick={handleSync} variant="outline" disabled={isSyncing}>
                            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Sincronizar Métricas
                        </Button>
                        <Button onClick={handleAddNewRule}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Crear Nueva Regla
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Reglas Activas</CardTitle>
                            <CardDescription>Listado de todas las reglas de sugerencia que has creado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {products && rules ? (
                                <RuleList 
                                    products={products} 
                                    rules={rules} 
                                    isLoading={areRulesLoading}
                                    onEdit={handleEditRule} 
                                />
                           ) : (
                                <div className="flex flex-col items-center justify-center text-center gap-4 p-10">
                                    <Lightbulb className="h-12 w-12 text-muted-foreground"/>
                                    <h3 className="text-lg font-semibold">Aún no hay productos o reglas</h3>
                                    <p className="text-sm text-muted-foreground">Crea productos y reglas para empezar.</p>
                                </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <MetricsDisplay rules={rules || []} isLoading={areRulesLoading} />
                </div>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl">
                     <DialogHeader>
                        <DialogTitle>{editingRule ? 'Editar Regla de Sugerencia' : 'Crear Nueva Regla de Sugerencia'}</DialogTitle>
                        <DialogDescription>
                            Define las condiciones y la acción para esta regla.
                        </DialogDescription>
                    </DialogHeader>
                    <RuleForm
                        existingRule={editingRule}
                        products={products || []}
                        onClose={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
