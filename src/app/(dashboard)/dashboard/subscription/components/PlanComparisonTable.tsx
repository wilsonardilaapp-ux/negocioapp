'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import type { HybridPlan } from "@/models/hybrid-plan";
import { useMemo } from "react";

interface PlanComparisonTableProps {
  currentPlan: string;
  allPlans: (SubscriptionPlan | HybridPlan)[];
  onSelectPlan: (plan: SubscriptionPlan | HybridPlan) => void;
}

const formatCurrency = (value: number | undefined | null) => {
    const safeValue = value ?? 0;
    return `$${safeValue.toLocaleString('en-US')}`;
};

// Helper robusto para obtener el precio de cualquier tipo de plan
const getPlanPrice = (plan: SubscriptionPlan | HybridPlan): number => {
    if ('basePrice' in plan) return plan.basePrice;
    if ('price' in plan) return plan.price;
    return 0;
};

export default function PlanComparisonTable({ currentPlan, allPlans, onSelectPlan }: PlanComparisonTableProps) {
    
    const sortedPlans = useMemo(() => {
        return [...allPlans].sort((a, b) => getPlanPrice(a) - getPlanPrice(b));
    }, [allPlans]);

    const featureRows = useMemo(() => {
        const baseFeatures = [
            {
                feature: "Precio mensual",
                getValue: (plan: SubscriptionPlan | HybridPlan) => formatCurrency(getPlanPrice(plan)),
            },
        ];

        const allFeatureStrings = new Set<string>();
        allPlans.forEach(plan => {
            if (plan.features) {
                plan.features.forEach(feature => {
                    const featureText = (typeof feature === 'string' ? feature : feature?.value) || '';
                    if (featureText) {
                        allFeatureStrings.add(featureText);
                    }
                });
            }
        });

        const dynamicFeatureRows = Array.from(allFeatureStrings).map(featureName => ({
            feature: featureName,
            getValue: (plan: SubscriptionPlan | HybridPlan) => {
                const hasFeature = plan.features?.some(f => {
                    const featureText = (typeof f === 'string' ? f : f?.value) || '';
                    // Comparación flexible
                    const normalizedFeatureName = featureName.toLowerCase().replace(/[\d\s]/g, '');
                    const normalizedFeatureText = featureText.toLowerCase();

                    if (normalizedFeatureName === 'soporteprioritario') {
                       return normalizedFeatureText.includes('prioritario') || normalizedFeatureText.includes('dedicado');
                    }
                    if (normalizedFeatureName === 'accesoapi') {
                        return normalizedFeatureText.includes('api');
                    }

                    return featureText === featureName;
                });
                return (
                    <div className="flex justify-center">
                        {hasFeature ? (
                            <Check className="h-5 w-5 text-green-500" />
                        ) : (
                            <X className="h-5 w-5 text-muted-foreground/30" />
                        )}
                    </div>
                );
            }
        }));

        return [...baseFeatures, ...dynamicFeatureRows];
    }, [allPlans]);


    const getButton = (plan: SubscriptionPlan | HybridPlan) => {
        const planId = plan.id;
        if (planId === currentPlan) {
            return <Button disabled variant="secondary" className="w-full">Plan Actual</Button>;
        }
        
        const currentPlanDetails = allPlans.find(p => p.id === currentPlan);
        const currentPrice = currentPlanDetails ? getPlanPrice(currentPlanDetails) : 0;
        const targetPrice = getPlanPrice(plan);

        if (targetPrice > currentPrice) {
             return <Button className="w-full" onClick={() => onSelectPlan(plan)}>Actualizar →</Button>;
        }

        return <Button variant="outline" className="w-full" onClick={() => onSelectPlan(plan)}>Cambiar</Button>;
    };

    return (
    <Card>
      <CardHeader>
        <CardTitle>Compara Nuestros Planes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] bg-background sticky left-0 z-10">Característica</TableHead>
              {sortedPlans.map(plan => (
                  <TableHead key={plan.id} className={cn("text-center min-w-[150px]", currentPlan === plan.id && "bg-primary/5")}>
                    <div className="flex flex-col items-center gap-1 py-2">
                        <span className="font-bold">{plan.name}</span>
                        {(plan as any).isMostPopular && (
                            <Badge variant="default" className="text-[10px] h-5">Recomendado</Badge>
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
              <TableRow key={feature}>
                <TableCell className="font-medium bg-background sticky left-0 z-10 border-r">{feature}</TableCell>
                {sortedPlans.map(plan => (
                    <TableCell key={`${feature}-${plan.id}`} className={cn("text-center font-medium", currentPlan === plan.id && "bg-primary/5")}>
                        {getValue(plan)}
                    </TableCell>
                ))}
              </TableRow>
            ))}
             <TableRow>
                <TableCell className="bg-background sticky left-0 z-10 border-r"></TableCell>
                {sortedPlans.map(plan => (
                     <TableCell key={`button-${plan.id}`} className={cn("text-center p-4", currentPlan === plan.id && "bg-primary/5")}>
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