const fs = require('fs');
const path = require('path');

function backupAndEdit(filePath, modifier) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(absPath, 'utf8');
  const bakPath = `${absPath}.bak`;
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, original, 'utf8');
    console.log(`🛡️ Respaldo creado: ${filePath}.bak`);
  }
  const modified = modifier(original);
  if (modified !== original) {
    fs.writeFileSync(absPath, modified, 'utf8');
    console.log(`✅ Modificado exitosamente (aditivo): ${filePath}`);
  } else {
    console.log(`ℹ️ Sin cambios requeridos: ${filePath}`);
  }
}

// 1. CREAR src/app/(dashboard)/dashboard/subscription/components/HybridPlanSimulator.tsx (NUEVO)
const simulatorDir = path.resolve('src/app/(dashboard)/dashboard/subscription/components');
if (!fs.existsSync(simulatorDir)) {
  fs.mkdirSync(simulatorDir, { recursive: true });
}

const simulatorContent = `'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, TrendingDown, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { 
  PORCENTAJES_HIBRIDOS, 
  calcularPrecioCliente, 
  obtenerTasaComisionHibrida 
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

  const currentRate = useMemo(() => {
    return obtenerTasaComisionHibrida({
      planType: isHybrid ? 'hibrido' : 'fijo',
      planName: planDetails?.name || business?.planName
    });
  }, [isHybrid, planDetails, business]);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Nivel y cálculos de simulación
  const tierPrices = useMemo(() => {
    return [
      { name: 'Plan Arranque', rate: PORCENTAJES_HIBRIDOS.arranque, percent: '15%', price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.arranque }) },
      { name: 'Plan Crecimiento', rate: PORCENTAJES_HIBRIDOS.crecimiento, percent: '12%', price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.crecimiento }) },
      { name: 'Plan Profesional', rate: PORCENTAJES_HIBRIDOS.profesional, percent: '10%', price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.profesional }) },
      { name: 'Plan Unlimited', rate: PORCENTAJES_HIBRIDOS.unlimited, percent: '9%', price: calcularPrecioCliente(sampleBase, { planType: 'hibrido', comisionRate: PORCENTAJES_HIBRIDOS.unlimited }) },
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
              0% Comisión por Plato
            </Badge>
          </div>
          <CardDescription className="text-sm">
            Tu plan <strong className="text-foreground">{planDetails?.name || business?.planName || 'Plan Fijo'}</strong> incluye todo el servicio Menfy por mensualidad fija.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tus clientes siempre pagan <strong>exactamente el precio base que configures</strong> en cada plato. No se aplica ningún recargo de servicio ni comisiones variables en tus ventas.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Si es Plan Híbrido
  return (
    <Card className="border-primary/30 shadow-md bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-bold">Modelo Híbrido Menfy</CardTitle>
              <Badge variant="default" className="font-semibold">
                {Math.round(currentRate * 100)}% Comisión Actual
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Tu plan aplica <strong>{Math.round(currentRate * 100)}% de servicio al precio final del cliente</strong>. Tú recibes siempre el 100% de tu precio base.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Simulador dinámico */}
        <div className="p-4 rounded-xl bg-background border shadow-inner space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="sample-base" className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-primary" />
                Simulador de precios al cliente por plan
              </Label>
              <p className="text-xs text-muted-foreground">
                Prueba con el precio base de un plato y mira cómo baja el precio al cliente si subes de plan:
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

          {/* Tabla comparativa 15% | 12% | 10% | 9% */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Nivel de Plan</TableHead>
                  <TableHead className="text-center">Comisión Menfy</TableHead>
                  <TableHead className="text-right">Tu Ganancia Base</TableHead>
                  <TableHead className="text-right font-bold text-primary">Precio Final Cliente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierPrices.map((tier) => {
                  const isCurrent = Math.round(tier.rate * 100) === Math.round(currentRate * 100);
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
                      <TableCell className="text-center font-bold text-sm">{tier.percent}</TableCell>
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
`;

fs.writeFileSync(path.resolve('src/app/(dashboard)/dashboard/subscription/components/HybridPlanSimulator.tsx'), simulatorContent, 'utf8');
console.log('✅ Archivo nuevo creado: HybridPlanSimulator.tsx');

// 2. MODIFICAR src/app/(dashboard)/dashboard/subscription/page.tsx (ADITIVO)
backupAndEdit('src/app/(dashboard)/dashboard/subscription/page.tsx', (content) => {
  if (content.includes('HybridPlanSimulator')) return content;

  // Inyectar import
  let updated = content.replace(
    /import CurrentPlanCard, { type CurrentPlanInfo } from '\.\/components\/CurrentPlanCard';/,
    `import CurrentPlanCard, { type CurrentPlanInfo } from './components/CurrentPlanCard';\nimport HybridPlanSimulator from './components/HybridPlanSimulator';`
  );

  // Inyectar componente tras el Card de título
  const targetHeaderCard = `      <Card>
        <CardHeader>
          <CardTitle>Mi Suscripción</CardTitle>
          <CardDescription>Gestiona tu plan, revisa tus límites y mira tu historial de pagos.</CardDescription>
        </CardHeader>
      </Card>`;

  const newHeaderCard = `${targetHeaderCard}

      {/* Panel dinámico y simulador de plan híbrido vs fijo (Fase 4) */}
      <HybridPlanSimulator business={business} planDetails={planDetails} />`;

  if (updated.includes(targetHeaderCard)) {
    updated = updated.replace(targetHeaderCard, newHeaderCard);
  }

  return updated;
});

console.log('\n🎉 Fase 4 aplicada.');
