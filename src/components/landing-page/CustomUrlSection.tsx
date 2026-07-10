'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2, Copy, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { MenuShare } from '@/models/share';

interface CustomUrlSectionProps {
  shareConfig: MenuShare;
  setShareConfig: React.Dispatch<React.SetStateAction<MenuShare | null>>;
  businessId: string;
}

export function CustomUrlSection({ shareConfig, setShareConfig, businessId }: CustomUrlSectionProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const landingUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const slugToUse = shareConfig.useCustomSlug ? (shareConfig.slug || businessId) : businessId;
    return `${window.location.origin}/landing/${slugToUse}`;
  }, [shareConfig, businessId]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(landingUrl);
    setCopied(true);
    toast({ title: 'Enlace copiado' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLocalChange = (newValues: Partial<MenuShare>) => {
    setShareConfig(prev => prev ? { ...prev, ...newValues } : null);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Link2 className="h-5 w-5" /> 
          URL Personalizada de tu Landing
        </CardTitle>
        <CardDescription>
          Configura un alias fácil de recordar para tu marca. Este alias se comparte con tu catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-white p-4">
          <div className="space-y-0.5">
            <Label htmlFor="custom-slug-switch-landing" className="text-base font-bold">Usar alias personalizado</Label>
            <p className="text-xs text-muted-foreground">Activa esta opción para usar una URL amigable (ej: /landing/mi-negocio).</p>
          </div>
          <Switch
            id="custom-slug-switch-landing"
            checked={shareConfig.useCustomSlug === true}
            onCheckedChange={(checked) => handleLocalChange({ useCustomSlug: checked })}
          />
        </div>
        
        {shareConfig.useCustomSlug && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <Label htmlFor="slug-input-landing" className="font-bold">Tu Alias de Marca</Label>
            <div className="flex items-center">
              <span className="p-2 bg-muted border border-r-0 rounded-l-md text-sm font-mono">/landing/</span>
              <Input
                id="slug-input-landing"
                className="rounded-none border-primary/20 focus-visible:ring-primary"
                value={shareConfig.slug === businessId ? '' : shareConfig.slug}
                onChange={(e) => handleLocalChange({ slug: e.target.value })}
                placeholder="ej: mi-negocio-vip"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-l-none border-primary/20" 
                onClick={handleCopyLink}
                type="button"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Este alias es global para el negocio y afectará también al enlace de tu Catálogo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
