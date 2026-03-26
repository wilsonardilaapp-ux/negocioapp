
'use client';

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight } from "lucide-react";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import { cn } from "@/lib/utils";

interface PublicPlanCardProps {
    plan: SubscriptionPlan;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function PublicPlanCard({ plan }: PublicPlanCardProps) {
    return (
        <Card className={cn(
            "flex flex-col h-full transition-all",
            plan.isMostPopular ? "border-primary border-2 shadow-xl -translate-y-4" : "border"
        )}>
            {plan.isMostPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Más Popular</Badge>
            )}
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="h-10">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-6">
                <div className="text-center">
                    <span className="text-4xl font-bold">{formatCurrency(plan.price)}</span>
                    <span className="text-muted-foreground">/mes</span>
                </div>
                <ul className="space-y-3 text-sm">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{feature.value}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href={`/register?plan=${plan.id}`}>
                        Seleccionar Plan <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
