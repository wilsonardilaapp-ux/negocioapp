"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Infinity } from 'lucide-react';

export interface UsageMetric {
  label: string;
  current: number;
  limit: number;
  percentage: number;
  isUnlimited: boolean;
  isAtLimit: boolean;
}

interface UsageLimitsCardProps {
  usage: UsageMetric[];
  currentPlan: 'free' | 'pro' | 'enterprise';
}

export default function UsageLimitsCard({ usage, currentPlan }: UsageLimitsCardProps) {
  
  const getProgressColorClass = (percentage: number) => {
    if (percentage >= 100) return 'bg-destructive';
    if (percentage > 85) return 'bg-orange-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso y Límites del Plan</CardTitle>
        <CardDescription>Tu consumo actual de recursos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {usage.map((metric) => (
          <div key={metric.label}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium">{metric.label}</span>
              <span className="text-sm text-muted-foreground">
                {metric.isUnlimited ? (
                  <Infinity className="h-4 w-4" />
                ) : (
                  `${metric.current} / ${metric.limit}`
                )}
              </span>
            </div>
            {!metric.isUnlimited ? (
              <>
                {/* Manual implementation of the progress bar to fix the rendering error */}
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full w-full flex-1 transition-all",
                      getProgressColorClass(metric.percentage)
                    )}
                    style={{ transform: `translateX(-${100 - (metric.percentage || 0)}%)` }}
                  />
                </div>
                {metric.isAtLimit && (
                    <div className="text-center mt-2">
                        <p className="text-xs text-red-500 font-bold">Límite alcanzado</p>
                        {currentPlan === 'free' && (
                             <Button asChild variant="link" size="sm" className="p-0 h-auto">
                                <Link href="/dashboard/subscription">Actualizar plan →</Link>
                            </Button>
                        )}
                    </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Tu plan incluye uso ilimitado.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
