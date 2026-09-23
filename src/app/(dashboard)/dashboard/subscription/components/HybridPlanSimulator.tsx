'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, TrendingDown, ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { 
  PORCENTAJES_HIBRIDOS, 
  calcularPrecioCliente 
} from '@/constants/pricingPlans';
import type { Business } from '@/models/business';
import type { HybridPlan } from '@/models/hybrid-plan';
import type { SubscriptionPlan } from '@/models/subscription-plan';

interface HybridPlanSimulatorProps {
  business?: Business | null;
  planDetails?: HybridPlan | SubscriptionPlan | null;
}

export default function HybridPlanSimulator({ business, planDetails }: HybridPlanSimulatorProps) {
  const [sampleBase, setSampleBase] = useState<number>(20000);

  const isHybrid = useMemo(() => {
    if (business?.planType === 'hibrido') return true;
    if (business?.planType === 'fijo') return false;
    if (planDetails && 'basePrice' in planDetails) return true;
    const name = (planDetails?.name || business?.planName || '').toLowerCase();
    return name.includes('crecimiento') || name.includes('estándar') || name.includes('profesional') || name.includes('arranque');
  }, [business, planDetails]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Cálculos de simulación en pesos puros (sin mostrar %)
  const tierPrices = useMemo(() => {
    return [
      { name: 'Plan Arranque', rate: PORCENTAJES_HIBRIDOS.arranque, price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.arranque }) },
      { name: 'Plan Crecimiento', rate: PORCENTAJES_HIBRIDOS.crecimiento, price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.crecimiento }) },
      { name: 'Plan Profesional', rate: PORCENTAJES_HIBRIDOS.profesional, price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.profesional }) },
      { name: 'Plan Unlimited', rate: PORCENTAJES_HIBRIDOS.unlimited, price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.unlimited }) },
    ];
  }, [sampleBase]);

  // Si es Plan Fijo
  if (!isHybrid) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-lg font-bold">Modelo de Suscripción Fija</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
              Suscripción Mensual
            </Badge>
          </div>
          <CardDescription className="text-sm">
            Tu plan <strong className="text-foreground">{planDetails?.name || business?.planName || 'Plan Fijo'}</strong> incluye todo el servicio Menfy por una tarifa fija mensual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-xl border bg-background/50 space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-600" />
              Transparencia en tus ventas
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tus clientes siempre pagan <strong>exactamente el precio base que configures</strong> en tus platos tanto en domicilio como en mesa. No se aplica tarifa de servicio variable sobre tus pedidos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si es Plan Híbrido (Blindaje SaaS: Cero %)
  return (
    <Card className="border-primary/30 shadow-md bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold">Modelo Menfy</CardTitle>
              <Badge variant="default" className="font-semibold">
                Activo
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Tu plan incluye las herramientas de gestión de tu negocio. Tú recibes siempre el 100% de tu precio base.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* SECCIÓN INFORMATIVA OFICIAL v5 (SIN MONTOS NI % REALES) */}
        <div className="p-4 rounded-xl border bg-muted/40 space-y-2">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Sobre los pedidos a través de Menfy
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Los pedidos recibidos por la plataforma aplican una tarifa de servicio al cliente final, la cual cubre la operación de Menfy. El valor que tú recibes por tus productos siempre es el 100% de tu precio base. Tu mensualidad cubre las herramientas de gestión de tu negocio.
          </p>
        </div>

        {/* Simulador dinámico en montos en pesos */}
        <div className="p-4 rounded-xl bg-background border shadow-inner space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="sample-base" className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-primary" />
                Simulador de precios al cliente por plan
              </Label>
              <p className="text-xs text-muted-foreground">
                Prueba con el precio base de un plato y mira cómo baja el precio al cliente si subes de nivel de plan:
              </p>
            </div>
            <div className="w-full sm:w-48">
              <Input
                id="sample-base"
                type="number"
                step="500"
                min="1000"
                value={sampleBase}
                onChange={(e) => setSampleBase(Number(e.target.value) || 0)}
                className="font-bold text-right text-base"
              />
            </div>
          </div>

          {/* Banner de ahorro en vivo */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between text-xs sm:text-sm font-medium text-primary">
            <span>Si subes de plan, tus precios al cliente bajan:</span>
            <span className="font-bold flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-md shadow-sm">
              {formatCOP(tierPrices[2].price)} <ArrowRight className="h-3.5 w-3.5" /> {formatCOP(tierPrices[3].price)}
            </span>
          </div>

          {/* Tabla comparativa en pesos puros (SIN %) */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Nivel de Plan</TableHead>
                  <TableHead className="text-right">Tu Ganancia Base</TableHead>
                  <TableHead className="text-right font-bold text-primary">Precio Final al Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierPrices.map((tier) => {
                  const currentPlanLower = (planDetails?.name || business?.planName || '').toLowerCase();
                  const isCurrent = currentPlanLower.includes(tier.name.split(' ')[1].toLowerCase());

                  return (
                    <TableRow key={tier.name} className={isCurrent ? "bg-primary/5 font-semibold" : ""}>
                      <TableCell className="text-sm flex items-center gap-2">
                        {tier.name}
                        {isCurrent && (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary">
                            Actual
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCOP(sampleBase)}</TableCell>
                      <TableCell className="text-right font-bold text-primary text-base">
                        {formatCOP(tier.price)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
