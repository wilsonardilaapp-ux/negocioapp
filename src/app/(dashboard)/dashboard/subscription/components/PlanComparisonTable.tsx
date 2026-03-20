"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';

interface PlanComparisonTableProps {
  currentPlan: 'free' | 'pro' | 'enterprise';
}

const features = [
  { feature: "Precio mensual", free: "$0", pro: "$29", enterprise: "$99" },
  { feature: "Productos", free: "10", pro: "Ilimitados", enterprise: "Ilimitados" },
  { feature: "Servicios", free: "3", pro: "Ilimitados", enterprise: "Ilimitados" },
  { feature: "Posts de Blog", free: "5", pro: "Ilimitados", enterprise: "Ilimitados" },
  { feature: "Landing Pages", free: "1", pro: "Ilimitadas", enterprise: "Ilimitadas" },
  { feature: "Soporte", free: "Base", pro: "Prioritario", enterprise: "Dedicado" },
  { feature: "Multi-usuario", free: <X className="h-5 w-5 text-muted-foreground" />, pro: <X className="h-5 w-5 text-muted-foreground" />, enterprise: <Check className="h-5 w-5 text-green-500" /> },
  { feature: "API Access", free: <X className="h-5 w-5 text-muted-foreground" />, pro: <X className="h-5 w-5 text-muted-foreground" />, enterprise: <Check className="h-5 w-5 text-green-500" /> },
  { feature: "Onboarding", free: <X className="h-5 w-5 text-muted-foreground" />, pro: <X className="h-5 w-5 text-muted-foreground" />, enterprise: <Check className="h-5 w-5 text-green-500" /> },
];

export default function PlanComparisonTable({ currentPlan }: PlanComparisonTableProps) {
    
    const getButton = (plan: 'free' | 'pro' | 'enterprise') => {
        if (plan === currentPlan) {
            return <Button disabled variant="secondary" className="w-full">Plan Actual</Button>;
        }
        
        const planOrder = { free: 0, pro: 1, enterprise: 2 };

        if (planOrder[plan] > planOrder[currentPlan]) {
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
