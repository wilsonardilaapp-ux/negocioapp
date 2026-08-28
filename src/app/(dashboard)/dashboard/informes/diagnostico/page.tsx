'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
    FileBarChart, 
    Lock, 
    RefreshCw, 
    Loader2, 
    ShieldAlert, 
    Calendar, 
    TrendingUp, 
    ChevronRight,
    CheckCircle2,
    Info,
    Search,
    Zap,
    LayoutDashboard
} from 'lucide-react';
import { format, startOfMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { extractDiagnosticData } from '@/services/diagnostic/data-extractor';

/**
 * @fileOverview Fase 2 - Informe de Diagnóstico Comercial.
 * Implementa la extracción de datos reales de las 15 fuentes del corazón de Markix.
 */

const PLAN_GENERATION_LIMITS: Record<string, number> = {
    'profesional': Infinity,
    'estandar': 10,
    'basico': 4,
    'crecimiento': 1,
    'free': 1,
};

export default function DiagnosticoComercialPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { plan, isLoading: loadingSub } = useSubscription();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmDialog] = useState(false);

  const currentLimit = useMemo(() => {
    if (!plan) return 1;
    const planKey = plan.toLowerCase();
    if (planKey.includes('profesional')) return PLAN_GENERATION_LIMITS.profesional;
    if (planKey.includes('estandar')) return PLAN_GENERATION_LIMITS.estandar;
    if (planKey.includes('basico')) return PLAN_GENERATION_LIMITS.basico;
    return PLAN_GENERATION_LIMITS.crecimiento;
  }, [plan]);

  const monthStartISO = startOfMonth(new Date()).toISOString();
  const usageQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return query(
        collection(firestore, `businesses/${user.uid}/diagnosticReports`),
        where('createdAt', '>=', monthStartISO)
    );
  }, [user?.uid, firestore, monthStartISO]);

  const { data: reportsThisMonth, isLoading: loadingUsage } = useCollection(usageQuery);
  const usedCount = reportsThisMonth?.length || 0;
  const hasRemainingAttempts = currentLimit === Infinity || usedCount < currentLimit;

  const lastReportQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return query(
        collection(firestore, `businesses/${user.uid}/diagnosticReports`),
        orderBy('createdAt', 'desc'),
        limit(1)
    );
  }, [user?.uid, firestore]);

  const { data: lastReportArr, isLoading: loadingLastReport } = useCollection(lastReportQuery);
  const lastReport = lastReportArr?.[0] || null;

  const handleRequestGeneration = async (bypassConfirm = false) => {
    if (!user || !hasRemainingAttempts) return;

    if (!bypassConfirm && lastReport?.createdAt && isToday(new Date(lastReport.createdAt))) {
      setShowConfirmDialog(true);
      return;
    }

    setIsGenerating(true);
    setShowConfirmDialog(false);

    try {
      // --- FASE 2: EXTRACCIÓN DE DATOS REALES ---
      const extraction = await extractDiagnosticData(user.uid);
      
      const reportId = doc(collection(firestore, 'placeholder')).id;
      const reportRef = doc(firestore, `businesses/${user.uid}/diagnosticReports`, reportId);
      
      const newReportData = {
        id: reportId,
        createdAt: new Date().toISOString(),
        planAtGeneration: plan,
        status: 'completed',
        sourcesReviewed: extraction.sourcesReviewed,
        data: {
          executiveSummary: extraction.sourcesReviewed > 7 
            ? "Datos recolectados exitosamente. Listo para análisis de IA." 
            : "Fuentes parciales detectadas. Se requiere más actividad en la plataforma para un diagnóstico profundo.",
          raw: extraction.data,
          pillars: {} // Fase 3
        }
      };

      await setDoc(reportRef, newReportData);
      
      toast({
        title: "¡Informe Generado!",
        description: `Se han analizado ${extraction.sourcesReviewed} fuentes operativas.`,
      });

    } catch (error: any) {
      console.error("Error al generar diagnóstico:", error);
      toast({
        variant: "destructive",
        title: "Error al generar",
        description: error.message || "No se pudo procesar la solicitud."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = loadingSub || loadingUsage || loadingLastReport;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <Alert className="bg-muted/50 border-primary/20 shadow-sm rounded-2xl border-2">
        <Lock className="h-4 w-4 text-primary" />
        <AlertTitle className="text-xs font-black uppercase tracking-widest text-primary">Modo de Seguridad</AlertTitle>
        <AlertDescription className="text-sm font-medium">
          🔒 Módulo en modo lectura — no modifica ni afecta tu operación.
        </AlertDescription>
      </Alert>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <FileBarChart className="h-9 w-9 text-primary" />
            Informe de Diagnóstico Comercial
          </h1>
          <p className="text-muted-foreground font-medium">
            Análisis bajo demanda basado en el corazón de Markix.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <Button 
                onClick={() => handleRequestGeneration()}
                disabled={isGenerating || !hasRemainingAttempts || isLoading}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 w-full md:w-auto"
            >
                {isGenerating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analizando fuentes...</>
                ) : (
                    <><RefreshCw className="mr-2 h-5 w-5" /> Generar Informe Actualizado</>
                )}
            </Button>
            <Badge variant="outline" className="h-8 px-4 rounded-lg border-2 font-bold bg-white">
                Informe basado en [{lastReport?.sourcesReviewed || 0}] de 15 fuentes revisadas
            </Badge>
        </div>
      </div>

      <Card className="border-2 border-primary/10 shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Plan de Negocio</p>
                <div className="flex items-center gap-2">
                    <Badge className="bg-primary text-white font-black px-3 py-1 rounded-lg uppercase text-[10px]">
                        {plan || 'Cargando...'}
                    </Badge>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Uso Mensual</p>
                    <span className="text-xs font-bold">{usedCount} / {currentLimit === Infinity ? '∞' : currentLimit}</span>
                </div>
                <Progress 
                    value={currentLimit === Infinity ? 0 : (usedCount / currentLimit) * 100} 
                    className="h-2" 
                    indicatorClassName={usedCount >= currentLimit ? 'bg-destructive' : 'bg-primary'}
                />
            </div>

            <div className="flex flex-col md:items-end justify-center gap-1">
                {!hasRemainingAttempts ? (
                    <div className="flex flex-col items-end gap-2 animate-in slide-in-from-right-2">
                        <p className="text-xs font-bold text-destructive text-right">Límite mensual alcanzado</p>
                        <Button size="sm" variant="outline" asChild className="h-8 text-[10px] font-black border-primary text-primary hover:bg-primary/5">
                            <Link href="/dashboard/subscription">Mejorar Plan <ChevronRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <p className="text-[10px] font-bold uppercase tracking-tighter">
                            Te quedan {currentLimit === Infinity ? 'generaciones ilimitadas' : `${currentLimit - usedCount} intentos`} este mes
                        </p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed rounded-[2rem] bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando con la nube...</p>
        </div>
      ) : lastReport ? (
        <Card className="rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
            <CardHeader className="bg-muted/30 border-b p-8">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl font-black tracking-tight text-gray-900">Resultados del Diagnóstico</CardTitle>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            Generado el {format(new Date(lastReport.createdAt), "d 'de' MMMM 'de' yyyy 'a las' p", { locale: es })}
                        </p>
                    </div>
                    <Badge className="bg-green-500 text-white font-black px-4 py-1 rounded-full text-[10px] uppercase tracking-widest border-none shadow-sm">
                        Última Versión
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
                <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><FileBarChart size={80} /></div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">Resumen Ejecutivo</h3>
                    <p className="text-lg font-medium text-gray-700 leading-relaxed italic">
                        &quot;{lastReport.data.executiveSummary}&quot;
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center text-center py-10 opacity-40">
                    <div className="p-10 border-2 border-dashed rounded-[2rem] space-y-4">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest">Extracción de datos completada</p>
                            <p className="text-[10px] text-muted-foreground font-bold">Se revisaron {lastReport.sourcesReviewed} fuentes operativas.</p>
                        </div>
                    </div>
                    <div className="p-10 border-2 border-dashed rounded-[2rem] space-y-4">
                        <Search className="h-8 w-8 mx-auto text-muted-foreground" />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest">Análisis del Corazón (Fase 3)</p>
                            <p className="text-[10px] text-muted-foreground font-bold">Pendiente de autorización.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-6 text-center justify-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    Este informe no ha tenido costo adicional. Las generaciones posteriores consumen créditos de tu plan.
                </p>
            </CardFooter>
        </Card>
      ) : (
        <Card className="border-2 border-dashed bg-muted/20 py-24 rounded-[2rem]">
            <CardContent className="text-center space-y-6">
                <div className="p-4 bg-white rounded-3xl shadow-sm border w-fit mx-auto">
                    <Zap className="h-12 w-12 text-primary/30" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tighter">Sin Diagnóstico Previo</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium">
                        Tu negocio aún no ha generado un informe inteligente. Presiona el botón superior para realizar el primer análisis integral.
                    </p>
                </div>
            </CardContent>
        </Card>
      )}

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-md">
            <DialogHeader className="p-8 pb-2 bg-amber-50">
                <DialogTitle className="flex items-center gap-2 text-amber-700">
                    <ShieldAlert className="h-5 w-5" /> 
                    Confirmación de Gasto
                </DialogTitle>
                <DialogDescription className="font-medium text-amber-600/80">
                    Ya generaste un informe hoy a las {lastReport?.createdAt && format(new Date(lastReport.createdAt), "p")}.
                </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                    ¿Estás seguro de que quieres generar uno nuevo ahora? Esto descontará <strong>1 intento</strong> de tu límite mensual.
                </p>
                <div className="bg-muted p-4 rounded-xl border-2 border-dashed text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Te quedarán</p>
                    <p className="text-2xl font-black text-gray-900">{currentLimit === Infinity ? '∞' : currentLimit - usedCount - 1} intentos este mes</p>
                </div>
            </div>
            <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="flex-1 font-bold">
                    Ver el actual
                </Button>
                <Button onClick={() => handleRequestGeneration(true)} className="flex-1 font-black bg-amber-600 hover:bg-amber-700 text-white">
                    Sí, generar nuevo
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
