'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock } from "lucide-react";
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LimitBannerProps {
  current: number;
  limit: number;
  label: string; // e.g. "productos", "cupones", "artículos"
  plan: string;
}

export function LimitBanner({ current, limit, label, plan }: LimitBannerProps) {
  // If limit is -1 (unlimited), don't show anything
  if (limit === -1) return null;

  const percentageUsed = (current / limit) * 100;
  const isAtLimit = current >= limit;
  const isCloseToLimit = percentageUsed >= 80 && !isAtLimit;

  if (!isAtLimit && !isCloseToLimit) return null;

  return (
    <Alert 
      variant={isAtLimit ? "destructive" : "default"} 
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 mb-6",
        isCloseToLimit && "border-yellow-500 text-yellow-700 [&>svg]:text-yellow-500 bg-yellow-50/50"
      )}
    >
      <div className="flex items-center gap-3">
        {isAtLimit ? <Lock className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
        <div>
          <AlertTitle className="font-bold">
            {isAtLimit ? `Límite de ${label} alcanzado` : `Casi en tu límite de ${label}`}
          </AlertTitle>
          <AlertDescription>
            Has usado {current}/{limit} {label} de tu plan {plan.toUpperCase()}. 
            {isAtLimit ? " Actualiza tu plan para seguir creando." : " Considera actualizar tu plan para evitar interrupciones."}
          </AlertDescription>
        </div>
      </div>
      <Button asChild variant={isAtLimit ? "default" : "outline"} className={cn(isAtLimit ? "bg-green-600 hover:bg-green-700 text-white" : "border-yellow-600 text-yellow-700 hover:bg-yellow-100")}>
        <Link href="/dashboard/subscription">
          {isAtLimit ? "Actualizar a PRO →" : "Ver planes →"}
        </Link>
      </Button>
    </Alert>
  );
}
