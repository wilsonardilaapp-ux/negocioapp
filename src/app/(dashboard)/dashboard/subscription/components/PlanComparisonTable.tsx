
'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import type { SubscriptionPlan } from "@/models/subscription-plan";
import { useMemo } from "react";

const formatCurrency = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function PlanComparisonTable({ currentPlan, allPlans }: PlanComparisonTableProps) {
    
    const sortedPlans = useMemo(() => [...allPlans].sort((a, b) => a.price - b.price), [allPlans]);

    const getLimitText = (limit: number | undefined) => {
        if (typeof limit === 'undefined' || limit === 0) return <div className="flex justify-center"><X className="h-5 w-5 text-muted-foreground" /></div>;
        if (limit === -1) return <div className="flex justify-center"><InfinityIcon className="h-5 w-5" /></div>;
        return String(limit);
    };

    const getFeatureCheck = (plan: SubscriptionPlan, keywords: string[]) => {
        if (!plan.features || plan.features.length === 0) {
            return <div className="flex justify-center"><X className="h-5 w-5 text-muted-foreground" /></div>;
        }
    
        const hasFeature = plan.features.some(f => {
            let featureText = '';
            // Robust check for both object and string array formats
            if (typeof f === 'string') {
                featureText = f;
            } else if (f && typeof f === 'object' && 'value' in f && typeof f.value === 'string') {
                featureText = f.value;
            }
            
            // Normalize text to handle accents and case
            const normalizedText = featureText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
            // Check if any of the provided keywords are present in the feature text
            return keywords.some(kw => normalizedText.includes(kw.toLowerCase()));
        });
    
        return <div className="flex justify-center">{hasFeature ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-muted-foreground" />}</div>;
    };


    const featureRows = [
        {
            feature: "Precio mensual",
            getValue: (plan: SubscriptionPlan) => formatCurrency(plan.price),
        },
        {
            feature: "Productos",
            getValue: (plan: SubscriptionPlan) => getLimitText(plan.limits.products),
        },
        {
            feature: "Posts de Blog",
            getValue: (plan: SubscriptionPlan) => getLimitText(plan.limits.blogPosts),
        },
        {
            feature: "Landing Pages",
            getValue: (plan: SubscriptionPlan) => getLimitText(plan.limits.landingPages),
        },
        {
            feature: "Soporte Prioritario",
            getValue: (plan: SubscriptionPlan) => getFeatureCheck(plan, ["prioritario", "dedicado"]),
        },
        {
            feature: "Acceso API",
            getValue: (plan: SubscriptionPlan) => getFeatureCheck(plan, ["api"]),
        },
    ];

    const getButton = (planId: string) => {
        if (planId === currentPlan) {
            return <Button disabled variant="secondary" className="w-full">Plan Actual</Button>;
        }
        
        const currentPlanDetails = sortedPlans.find(p => p.id === currentPlan);
        const targetPlanDetails = sortedPlans.find(p => p.id === planId);

        if (!currentPlanDetails || !targetPlanDetails) {
            return <Button asChild variant="outline" className="w-full"><Link href="/pricing">Ver Detalles</Link></Button>;
        }

        if (targetPlanDetails.price > currentPlanDetails.price) {
             return <Button asChild className="w-full"><Link href="/pricing">Actualizar →</Link></Button>;
        }

        return <Button asChild variant="outline" className="w-full"><Link href="/pricing">Cambiar</Link></Button>;
    };

    return (
    <Card>
      <CardHeader>
        <CardTitle>Compara Nuestros Planes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Característica</TableHead>
              {sortedPlans.map(plan => (
                  <TableHead key={plan.id} className={cn("text-center", currentPlan === plan.id && "bg-muted")}>
                    <div className="flex flex-col items-center gap-1">
                        {plan.name}
                        {plan.isMostPopular && <Badge>Recomendado</Badge>}
                    </div>
                  </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {featureRows.map(({ feature, getValue }) => (
              <TableRow key={feature}>
                <TableCell className="font-medium">{feature}</TableCell>
                {sortedPlans.map(plan => (
                    <TableCell key={`${feature}-${plan.id}`} className={cn("text-center font-medium", currentPlan === plan.id && "bg-muted")}>
                        {getValue(plan)}
                    </TableCell>
                ))}
              </TableRow>
            ))}
             <TableRow>
                <TableCell></TableCell>
                {sortedPlans.map(plan => (
                     <TableCell key={`button-${plan.id}`} className={cn("text-center p-4", currentPlan === plan.id && "bg-muted")}>
                        {getButton(plan.id)}
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
