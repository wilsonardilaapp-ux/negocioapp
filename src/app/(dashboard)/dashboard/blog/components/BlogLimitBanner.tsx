"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock } from "lucide-react";
import Link from 'next/link';

interface BlogLimitBannerProps {
  currentPosts: number;
  maxPosts: number;
  plan: 'free' | 'pro' | 'enterprise';
}

export default function BlogLimitBanner({ currentPosts, maxPosts, plan }: BlogLimitBannerProps) {
  if (plan !== 'free') {
    return null;
  }

  const percentageUsed = (currentPosts / maxPosts) * 100;

  if (percentageUsed >= 100) {
    return (
      <Alert variant="destructive" className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lock className="h-6 w-6" />
          <div>
            <AlertTitle>Límite de posts alcanzado</AlertTitle>
            <AlertDescription>
              Has usado {currentPosts}/{maxPosts} posts de tu plan {plan.toUpperCase()}. Actualiza tu plan para seguir creando.
            </AlertDescription>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/subscription">Actualizar a PRO →</Link>
        </Button>
      </Alert>
    );
  }

  if (percentageUsed >= 80) {
    return (
      <Alert variant="default" className="flex flex-col sm:flex-row items-center justify-between gap-4 border-yellow-500 text-yellow-700 [&>svg]:text-yellow-500">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6" />
          <div>
            <AlertTitle>Casi en tu límite</AlertTitle>
            <AlertDescription>
              Has usado {currentPosts} de {maxPosts} posts de tu plan {plan.toUpperCase()}. Considera actualizar tu plan.
            </AlertDescription>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/subscription">Ver planes →</Link>
        </Button>
      </Alert>
    );
  }

  return null;
}
