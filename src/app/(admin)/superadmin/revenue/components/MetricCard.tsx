'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  isLoading: boolean;
}

export function MetricCard({ title, value, change, icon: Icon, isLoading }: MetricCardProps) {
  const hasChange = typeof change === 'number';
  const isPositive = hasChange && change > 0;
  const isNegative = hasChange && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {hasChange && (
              <p className={cn(
                  "text-xs text-muted-foreground",
                  isPositive && "text-green-600",
                  isNegative && "text-red-600"
              )}>
                {isPositive ? '+' : ''}{change.toFixed(1)}% vs. el mes pasado
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
