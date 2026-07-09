'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import type { HybridPlan } from "@/models/hybrid-plan";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface PlanComparisonTableProps {
  currentPlan: string;
  allPlans: (SubscriptionPlan | HybridPlan)[];
  onSelectPlan: (plan: SubscriptionPlan | HybridPlan) => void;
}

const formatCurrency = (value: number | undefined | null) => {
    const safeValue = value ?? 0;
    if (safeValue === 0) return '$0';
    return `$${safeValue.toLocaleString('es-CO')}`;
};

const getPlanPrice = (plan: SubscriptionPlan | HybridPlan): number => {
    if ('basePrice' in plan) return plan.basePrice;
    if ('price' in plan) return plan.price;
    return 0;
};

export default function PlanComparisonTable({ currentPlan, allPlans, onSelectPlan }: PlanComparisonTableProps) {
    const router = useRouter();
    
    const sortedPlans = useMemo(() => {
        return [...allPlans]
            .filter(plan => plan.isActive === true)
            .sort((a, b) => getPlanPrice(a) - getPlanPrice(b));
    }, [allPlans]);

    const featureRows = useMemo(() => {
        const baseFeatures = [
            {
                feature: "Precio mensual",
                getValue: (plan: SubscriptionPlan | HybridPlan) => formatCurrency(getPlanPrice(plan)),
            },
        ];

        // 1. Recopilar solo conceptos con groupKey (Omitir los null/undefined)
        const groups: Record<string, { label: string, planValues: Record<string, string> }> = {};
        
        allPlans.forEach(plan => {
            if (plan.isActive === true && plan.features) {
                plan.features.forEach(f => {
                    const featureObj = typeof f === 'string' ? { value: f, groupKey: undefined } : f;
                    const key = featureObj.groupKey;
                    
                    // FILTRO CRÍTICO: Si no hay groupKey, no se añade a la tabla comparativa
                    if (!key) return;
                    
                    if (!groups[key]) {
                        groups[key] = {
                            label: key,
                            planValues: {}
                        };
                    }
                    groups[key].planValues[plan.id!] = featureObj.value;
                });
            }
        });

        // 2. Utilidad para embellecer los nombres de las claves técnicas
        const prettify = (str: string) => {
            const labels: Record<string, string> = {
                posts_blog: 'Artículos de Blog',
                landing_pages: 'Páginas de Aterrizaje',
                comision: 'Comisión por Venta',
                onboarding: 'Acompañamiento'
            };
            return labels[str] || (str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' '));
        };

        const dynamicFeatureRows = Object.entries(groups).map(([key, group]) => ({
            feature: prettify(key),
            getValue: (plan: SubscriptionPlan | HybridPlan) => {
                const val = group.planValues[plan.id!];
                if (!val) return (
                    <div className="flex justify-center">
                        <X className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                );
                
                const lower = val.toLowerCase();
                if (['incluido', 'sí', 'yes', 'true'].includes(lower)) {
                    return <div className="flex justify-center"><Check className="h-5 w-5 text-green-500" /></div>;
                }

                return <div className="text-center text-xs font-medium text-gray-700">{val}</div>;
            }
        }));

        return [...baseFeatures, ...dynamicFeatureRows];
    }, [allPlans]);


    const getButton = (plan: SubscriptionPlan | HybridPlan) => {
        const planId = plan.id;
        const planName = plan.name;
        
        if (planId === currentPlan || planName === currentPlan) {
            return <Button disabled variant="secondary" className="w-full">Plan Actual</Button>;
        }
        
        const currentPlanDetails = allPlans.find(p => p.id === currentPlan || p.name === currentPlan);
        const currentPrice = currentPlanDetails ? getPlanPrice(currentPlanDetails) : 0;
        const targetPrice = getPlanPrice(plan);

        if (targetPrice > currentPrice) {
             return (
                <Button 
                    className="w-full" 
                    onClick={() => router.push(`/dashboard/subscription/checkout?plan=${plan.id}`)}
                >
                    Actualizar →
                </Button>
             );
        }

        return (
            <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => router.push(`/dashboard/subscription/checkout?plan=${plan.id}`)}
            >
                Cambiar
            </Button>
        );
    };

    return (
    <Card>
      <CardHeader>
        <CardTitle>Compara Nuestros Planes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[200px] bg-muted/50 sticky left-0 z-10 border-r font-bold">Característica</TableHead>
              {sortedPlans.map(plan => (
                  <TableHead key={plan.id} className={cn("text-center min-w-[150px]", (currentPlan === plan.id || currentPlan === plan.name) && "bg-primary/5")}>
                    <div className="flex flex-col items-center gap-1 py-2">
                        <span className="font-bold text-gray-900">{plan.name}</span>
                        {(plan as any).isMostPopular && (
                            <Badge variant="default" className="text-[10px] h-5 bg-green-600 border-none">Recomendado</Badge>
                        )}
                        {'commissionType' in plan && (
                             <Badge variant="outline" className="text-[10px] h-5 border-orange-200 text-orange-700 bg-orange-50">Híbrido</Badge>
                        )}
                    </div>
                  </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureRows.map(({ feature, getValue }) => (
              <TableRow key={feature} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium bg-background sticky left-0 z-10 border-r">{feature}</TableCell>
                {sortedPlans.map(plan => (
                    <TableCell key={`${feature}-${plan.id}`} className={cn("text-center font-medium", (currentPlan === plan.id || currentPlan === plan.name) && "bg-primary/5")}>
                        {getValue(plan)}
                    </TableCell>
                ))}
              </TableRow>
            ))}
             <TableRow className="hover:bg-transparent">
                <TableCell className="bg-background sticky left-0 z-10 border-r"></TableCell>
                {sortedPlans.map(plan => (
                     <TableCell key={`button-${plan.id}`} className={cn("text-center p-4", (currentPlan === plan.id || currentPlan === plan.name) && "bg-primary/5")}>
                        {getButton(plan)}
                    </TableCell>
                ))}
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
