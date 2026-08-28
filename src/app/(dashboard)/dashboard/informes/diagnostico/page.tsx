'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc, limit } from 'firebase/firestore';
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
    Zap, 
    AlertTriangle, 
    Target 
} from 'lucide-react';
import { format, startOfMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { extractDiagnosticData } from '@/services/diagnostic/data-extractor';
import { analyzeDiagnosticWithAI, type PillarAnalysis } from '@/services/diagnostic/ai-analyzer';
import { cn } from '@/lib/utils';

const PLAN_GENERATION_LIMITS: Record<string, number> = {
    'profesional': Infinity,
    'estandar': 10,
    'basico': 4,
    'crecimiento': 1,
    'free': 1,
};

const PILLAR_LABELS: Record<string, string> = {
  ventaProactiva: "Venta Proactiva",
  radarChurn: "Radar de Churn",
  reputacion: "Protección de Reputación",
  operacionBlindada: "Operación Blindada"
};

const PillarCard = ({ title, data }: { title: string, data: PillarAnalysis }) => {
  const statusColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const priorityVariants = {
    High: 'destructive',
    Medium: 'default',
    Low: 'secondary',
  } as const;

  const priorityLabels = {
    High: 'Prioridad Alta',
    Medium: 'Prioridad Media',
    Low: 'Prioridad Baja',
  };

  return (
    <Card className="rounded-[2rem] border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full shadow-sm", statusColors[data.status])} />
            <CardTitle className="text-sm font-black uppercase tracking-tight">{title}</CardTitle>
          </div>
          <Badge variant={priorityVariants[data.priority]} className="text-[9px] font-black uppercase tracking-widest px-2 h-5">
            {priorityLabels[data.priority]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4 flex-grow">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Estado Real</p>
          <p className="text-sm font-medium text-gray-700 leading-relaxed">{data.realState}</p>
        </div>

        {data.hasOpportunity && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="h-4 w-4 fill-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Oportunidad Detectada</span>
            </div>
            <p className="text-xs font-bold text-primary/80">{data.opportunityData}</p>
          </div>
        )}

        <div className="space-y-1 pt-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recomendación</p>
          <p className="text-sm font-bold text-slate-900">{data.recommendation}</p>
        </div>

        {data.contradictions && data.contradictions.length > 0 && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-1">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-[9px] font-black uppercase tracking-widest">Alertas de Contradicción</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {data.contradictions.map((c, i) => (
                <li key={i} className="text-[10px] text-red-700 font-medium">{c}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function DiagnosticoComercialPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { plan, isLoading: loadingSub } = useSubscription();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmDialog] = useState(false);

  const currentLimit = useMemo(() => {
    if (!plan) return 1;
    // Normalización para ignorar acentos y asegurar emparejamiento con el objeto PLAN_GENERATION_LIMITS
    const normalizedPlan = plan.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (normalizedPlan.includes('profesional')) return PLAN_GENERATION_LIMITS.profesional;
    if (normalizedPlan.includes('estandar')) return PLAN_GENERATION_LIMITS.estandar;
    if (normalizedPlan.includes('basico')) return PLAN_GENERATION_LIMITS.basico;
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

  // Consulta para el último informe generado
  const lastReportQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return query(
        collection(firestore, `businesses/${user.uid}/diagnosticReports`),
        orderBy('createdAt', 'desc'),
        limit(1)
    );
  }, [user?.uid, firestore]);

  const { data: lastReports, isLoading: loadingLast } = useCollection(lastReportQuery);
  const activeReport = lastReports?.[0] || null;

  const handleRequestGeneration = async (bypassConfirm = false) => {
    if (!user || !hasRemainingAttempts) return;

    // Protección de gasto: Confirmar si ya se generó uno hoy
    if (!bypassConfirm && activeReport?.createdAt && isToday(new Date(activeReport.createdAt))) {
      setShowConfirmDialog(true);
      return;
    }

    setIsGenerating(true);
    setShowConfirmDialog(false);

    try {
      // FASE 2: Extracción de datos reales
      const extraction = await extractDiagnosticData(user.uid);
      
      // FASE 3: Análisis Estratégico con IA activa
      const analysis = await analyzeDiagnosticWithAI(extraction.data, extraction.sourcesReviewed, user.uid);

      const reportId = doc(collection(firestore, 'placeholder')).id;
      const reportRef = doc(firestore, `businesses/${user.uid}/diagnosticReports`, reportId);

      const newReportData = {
        id: reportId,
        createdAt: new Date().toISOString(),
        planAtGeneration: plan,
        status: 'completed',
        sourcesReviewed: extraction.sourcesReviewed,
        data: {
          executiveSummary: analysis.executiveSummary,
          raw: extraction.data,
          pillars: analysis.pillars
        }
      };

      await setDoc(reportRef, newReportData);
      toast({ title: "¡Informe Generado!", description: `Análisis listo basado en ${extraction.sourcesReviewed} fuentes.` });

    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al generar", 
        description: error.message || "No se pudo procesar la solicitud de IA." 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = loadingSub || loadingUsage || loadingLast;

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
            Diagnóstico de Negocio
          </h1>
          <p className="text-muted-foreground font-medium">Análisis estratégico basado en el Corazón de Markix.</p>
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <Button 
                onClick={() => handleRequestGeneration()}
                disabled={isGenerating || !hasRemainingAttempts || isLoading}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 w-full md:w-auto"
            >
                {isGenerating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analizando...</>
                ) : (
                    <><RefreshCw className="mr-2 h-5 w-5" /> Generar Nuevo Informe</>
                )}
            </Button>
            <Badge variant="outline" className="h-8 px-4 rounded-lg border-2 font-bold bg-white">
                Fuentes Revisadas: [{activeReport?.sourcesReviewed || 0} / 15]
            </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 border-2 border-primary/10 shadow-sm rounded-3xl p-6">
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Uso del Mes</p>
                    <span className="text-xs font-bold">{usedCount} / {currentLimit === Infinity ? '∞' : currentLimit}</span>
                </div>
                <Progress value={currentLimit === Infinity ? 0 : (usedCount / currentLimit) * 100} className="h-2" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase text-center pt-1">{plan || 'Plan Crecimiento'}</p>
            </div>
        </Card>

        <Card className="lg:col-span-3 border-2 border-gray-100 shadow-sm rounded-3xl p-6 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-2xl"><Calendar className="h-6 w-6 text-muted-foreground" /></div>
            <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Último Análisis</p>
                <p className="text-sm font-bold text-slate-900">
                    {activeReport?.createdAt ? format(new Date(activeReport.createdAt), "EEEE, d 'de' MMMM 'a las' p", { locale: es }) : 'Sin diagnóstico previo'}
                </p>
            </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed rounded-[2rem] bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Sincronizando con el cerebro de IA...</p>
        </div>
      ) : activeReport ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* RESUMEN EJECUTIVO */}
            <Card className="rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-8">
                    <CardTitle className="text-2xl font-black">Resumen Ejecutivo</CardTitle>
                </CardHeader>
                <CardContent className="p-10">
                    <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
                        <p className="text-lg font-medium text-gray-700 leading-relaxed italic">&quot;{activeReport.data.executiveSummary}&quot;</p>
                    </div>
                </CardContent>
            </Card>

            {/* PILARES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.entries(activeReport.data.pillars).map(([key, p]: [string, any]) => (
                    <PillarCard 
                        key={key} 
                        title={PILLAR_LABELS[key] || key} 
                        data={p as PillarAnalysis} 
                    />
                ))}
            </div>
        </div>
      ) : (
        <div className="text-center py-32 bg-muted/20 border-2 border-dashed rounded-[2rem]">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-bold text-gray-500 uppercase tracking-tighter">Presiona el botón para iniciar el diagnóstico</p>
        </div>
      )}

      {/* CONFIRMACIÓN DE RE-GENERACIÓN EN EL MISMO DÍA */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-md">
            <DialogHeader className="p-8 pb-2 bg-amber-50">
                <DialogTitle className="flex items-center gap-2 text-amber-700">
                    <ShieldAlert className="h-5 w-5" /> Protección de Gasto
                </DialogTitle>
                <DialogDescription className="font-medium text-amber-600/80">
                    Ya generaste un informe hoy.
                </DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                    ¿Seguro que quieres generar uno nuevo ahora? Esto descontará <strong>1 intento</strong> de tu límite mensual.
                </p>
            </div>
            <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="flex-1 font-bold">Cancelar</Button>
                <Button onClick={() => handleRequestGeneration(true)} className="flex-1 font-black bg-amber-600 hover:bg-amber-700 text-white">Sí, generar nuevo</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
