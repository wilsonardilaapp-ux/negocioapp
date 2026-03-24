"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import type { SubscriptionPlan } from "@/models/subscription-plan";

interface PlanComparisonTableProps {
  currentPlan: 'free' | 'pro' | 'enterprise';
  allPlans: SubscriptionPlan[];
}

const formatCurrency = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function PlanComparisonTable({ currentPlan, allPlans }: PlanComparisonTableProps) {
    
    const getLimitText = (limit: number | undefined) => {
        if (typeof limit === 'undefined') return <div className="flex justify-center"><X className="h-5 w-5 text-muted-foreground" /></div>;
        if (limit === -1) return <div className="flex justify-center"><InfinityIcon className="h-5 w-5" /></div>;
        return String(limit);
    };

    const getFeatureCheck = (plan: SubscriptionPlan | undefined, keyword: string) => {
        if (!plan || !plan.features) return <div className="flex justify-center"><X className="h-5 w-5 text-muted-foreground" /></div>;
        const hasFeature = plan.features.some(f => f.value.toLowerCase().includes(keyword));
        return <div className="flex justify-center">{hasFeature ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-muted-foreground" />}</div>;
    };

    const getPlanProp = <T,>(planId: string, prop: (p: SubscriptionPlan) => T, defaultValue: T): T => {
        const plan = allPlans.find(p => p.id === planId);
        return plan ? prop(plan) : defaultValue;
    };

    const features = [
        {
            feature: "Precio mensual",
            free: formatCurrency(getPlanProp('free', p => p.price, 0)),
            pro: formatCurrency(getPlanProp('pro', p => p.price, 0)),
            enterprise: formatCurrency(getPlanProp('enterprise', p => p.price, 0)),
        },
        {
            feature: "Productos",
            free: getLimitText(getPlanProp('free', p => p.limits.products, 0)),
            pro: getLimitText(getPlanProp('pro', p => p.limits.products, 0)),
            enterprise: getLimitText(getPlanProp('enterprise', p => p.limits.products, 0)),
        },
        {
            feature: "Posts de Blog",
            free: getLimitText(getPlanProp('free', p => p.limits.blogPosts, 0)),
            pro: getLimitText(getPlanProp('pro', p => p.limits.blogPosts, 0)),
            enterprise: getLimitText(getPlanProp('enterprise', p => p.limits.blogPosts, 0)),
        },
        {
            feature: "Landing Pages",
            free: getLimitText(getPlanProp('free', p => p.limits.landingPages, 0)),
            pro: getLimitText(getPlanProp('pro', p => p.limits.landingPages, 0)),
            enterprise: getLimitText(getPlanProp('enterprise', p => p.limits.landingPages, 0)),
        },
        {
            feature: "Soporte",
            free: getFeatureCheck(allPlans.find(p => p.id === 'free'), "base"),
            pro: getFeatureCheck(allPlans.find(p => p.id === 'pro'), "prioritario"),
            enterprise: getFeatureCheck(allPlans.find(p => p.id === 'enterprise'), "dedicado"),
        },
        {
            feature: "Acceso API",
            free: getFeatureCheck(allPlans.find(p => p.id === 'free'), "api"),
            pro: getFeatureCheck(allPlans.find(p => p.id === 'pro'), "api"),
            enterprise: getFeatureCheck(allPlans.find(p => p.id === 'enterprise'), "api"),
        },
    ];

    const getButton = (planId: 'free' | 'pro' | 'enterprise') => {
        if (planId === currentPlan) {
            return <Button disabled variant="secondary" className="w-full">Plan Actual</Button>;
        }
        
        const planOrder = { free: 0, pro: 1, enterprise: 2 };

        if (planOrder[planId] > planOrder[currentPlan]) {
             return <Button asChild className="w-full"><Link href="/pricing">Actualizar →</Link></Button>;
        }

        return <Button asChild variant="outline" className="w-full"><Link href="/pricing">Cambiar</Link></Button>;
    }

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
              <TableHead className={cn("text-center", currentPlan === 'free' && "bg-muted")}>
                  Free
              </TableHead>
              <TableHead className={cn("text-center", currentPlan === 'pro' && "bg-muted")}>
                 <div className="flex flex-col items-center gap-1">
                    Pro <Badge>Recomendado</Badge>
                 </div>
              </TableHead>
              <TableHead className={cn("text-center", currentPlan === 'enterprise' && "bg-muted")}>
                  Enterprise
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map(({ feature, free, pro, enterprise }) => (
              <TableRow key={feature}>
                <TableCell className="font-medium">{feature}</TableCell>
                <TableCell className={cn("text-center", currentPlan === 'free' && "bg-muted")}>{free}</TableCell>
                <TableCell className={cn("text-center", currentPlan === 'pro' && "bg-muted")}>{pro}</TableCell>
                <TableCell className={cn("text-center", currentPlan === 'enterprise' && "bg-muted")}>{enterprise}</TableCell>
              </TableRow>
            ))}
             <TableRow>
                <TableCell></TableCell>
                <TableCell className={cn("text-center p-4", currentPlan === 'free' && "bg-muted")}>{getButton('free')}</TableCell>
                <TableCell className={cn("text-center p-4", currentPlan === 'pro' && "bg-muted")}>{getButton('pro')}</TableCell>
                <TableCell className={cn("text-center p-4", currentPlan === 'enterprise' && "bg-muted")}>{getButton('enterprise')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}
