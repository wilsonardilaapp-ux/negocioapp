
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, getDocs, setDoc } from 'firebase/firestore';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
    FileBarChart, 
    Lock, 
    RefreshCw, 
    Loader2, 
    ShieldAlert, 
    Calendar, 
    Zap, 
    AlertTriangle, 
    Target,
    Search,
    Filter,
    History,
    FileSpreadsheet,
    FileText,
    TrendingUp,
    TrendingDown,
    Minus,
    CheckCircle2,
    Circle,
    ArrowRight,
    Activity,
    Clock,
    BrainCircuit,
    Eye
} from 'lucide-react';
import { format, startOfMonth, isToday, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { extractDiagnosticData } from '@/services/diagnostic/data-extractor';
import { analyzeDiagnosticWithAI, type PillarAnalysis } from '@/services/diagnostic/ai-analyzer';
import { evaluateAppliedActionsImpact } from '@/services/diagnostic/impact-evaluator';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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

/**
 * Componente para renderizar un pilar con seguimiento de acciones e impacto (Fase B + C).
 */
const PillarCard = ({ 
    title, 
    data, 
    pilarKey,
    reportId,
    appliedActions,
    onToggleAction,
    isProcessingAction
}: { 
    title: string, 
    data: PillarAnalysis, 
    pilarKey: string,
    reportId: string,
    appliedActions: any[],
    onToggleAction: (pilarKey: string, recommendation: string) => void,
    isProcessingAction: boolean
}) => {
  const statusColors = { green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' };
  const priorityVariants = { High: 'destructive', Medium: 'default', Low: 'secondary' } as const;
  const priorityLabels = { High: 'Prioridad Alta', Medium: 'Prioridad Media', Low: 'Prioridad Baja' };

  const action = appliedActions.find(a => a.id === `${reportId}_${pilarKey}`);
  const isApplied = action?.status === 'applied';

  const renderImpactBadge = () => {
      if (!action || !action.impactStatus) return null;

      const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
      
      const impactConfig: any = {
          improved: { icon: TrendingUp, color: 'text-green-600 bg-green-50 border-green-200', label: 'Impacto Positivo' },
          stable: { icon: Minus, color: 'text-slate-600 bg-slate-50 border-slate-200', label: 'Sin cambios' },
          declined: { icon: TrendingDown, color: 'text-red-600 bg-red-50 border-red-200', label: 'Métrica en descenso' },
          too_early: { icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Medición en curso' }
      };

      const cfg = impactConfig[action.impactStatus];
      const Icon = cfg.icon;

      let deltaText = "";
      if (action.impactStatus === 'improved' || action.impactStatus === 'declined') {
          const delta = (action.resultValue || 0) - (action.baselineValue || 0);
          const isCurrency = action.targetMetricKey === 'totalSales30d';
          deltaText = ` (${delta >= 0 ? '+' : ''}${isCurrency ? formatCurrency(delta) : delta})`;
      }

      return (
          <div className={cn("mt-4 p-3 rounded-2xl border-2 flex flex-col gap-1.5 animate-in fade-in duration-700", cfg.color)}>
              <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{cfg.label}</span>
              </div>
              <p className="text-xs font-medium leading-tight">
                  {action.impactStatus === 'too_early' 
                    ? `Aplicada hace ${differenceInDays(new Date(), new Date(action.appliedAt))} días. Necesitamos 7 días para validar el resultado.`
                    : `Resultado medido: ${action.targetMetricKey === 'totalSales30d' ? formatCurrency(action.resultValue || 0) : (action.resultValue || 0)}${deltaText}.`}
              </p>
          </div>
      );
  };

  return (
    <Card className="rounded-[2rem] border-2 border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
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

        {/* NOTA DE APRENDIZAJE IA (Fase C) */}
        {data.learningNote && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-500">
                <BrainCircuit className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase text-indigo-700 tracking-widest">Ajuste por Aprendizaje</span>
                    <p className="text-11px font-medium text-indigo-800 leading-tight italic">{data.learningNote}</p>
                </div>
            </div>
        )}

        <div className="space-y-1 pt-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recomendación</p>
          <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-slate-900">{data.recommendation}</p>
              
              <div className="pt-2">
                  {isApplied ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase bg-green-50 p-2 rounded-xl border border-green-100 animate-in zoom-in duration-300">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Aplicada el {format(new Date(action.appliedAt), 'dd/MM/yyyy')}</span>
                            <button onClick={() => onToggleAction(pilarKey, data.recommendation)} className="ml-auto text-muted-foreground hover:text-red-500 underline">Deshacer</button>
                        </div>
                        {renderImpactBadge()}
                      </div>
                  ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isProcessingAction}
                        onClick={() => onToggleAction(pilarKey, data.recommendation)}
                        className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 rounded-lg border-primary/20 text-primary hover:bg-primary/5"
                      >
                        {isProcessingAction ? <Loader2 className="h-3 w-3 animate-spin" /> : <Circle className="h-3 w-3" />}
                        Marcar como aplicada
                      </Button>
                  )}
              </div>
          </div>
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
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { plan, isLoading: loadingSub } = useSubscription();

  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmModal, setShowConfirmDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPilar, setFilterPilar] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const businessId = profile?.role === 'super_admin' ? (user?.uid || '') : user?.uid || '';

  const reportsQuery = useMemoFirebase(() => {
    if (!businessId || !firestore) return null;
    return query(
        collection(firestore, `businesses/${businessId}/diagnosticReports`),
        orderBy('createdAt', 'desc')
    );
  }, [businessId, firestore]);
  const { data: allReports, isLoading: loadingReports } = useCollection<any>(reportsQuery);

  const actionsQuery = useMemoFirebase(() => {
    if (!businessId || !firestore) return null;
    return collection(firestore, `businesses/${businessId}/diagnosticActions`);
  }, [businessId, firestore]);
  const { data: appliedActions, isLoading: loadingActions } = useCollection<any>(actionsQuery);

  const activeReport = useMemo(() => {
    if (!allReports || allReports.length === 0) return null;
    if (dateRange.from && dateRange.to) {
        return allReports.find(r => r.createdAt >= dateRange.from && r.createdAt <= dateRange.to) || allReports[0];
    }
    return allReports[0];
  }, [allReports, dateRange]);

  const previousReport = useMemo(() => {
    if (!allReports || !activeReport) return null;
    
    const activeDate = new Date(activeReport.createdAt).toISOString().split('T')[0];
    
    // Buscar primero el informe más reciente que sea de un día anterior (Sin fallback al mismo día)
    return allReports.find(r => {
      const rDate = new Date(r.createdAt).toISOString().split('T')[0];
      return rDate < activeDate;
    }) || null;
  }, [allReports, activeReport]);

  const trends = useMemo(() => {
    if (!activeReport || !previousReport) return null;
    const curr = activeReport.data.raw.ronda1_ventas;
    const prev = previousReport.data.raw.ronda1_ventas;

    const calc = (c: any, p: any) => {
        if (typeof c !== 'number' || typeof p !== 'number' || p === 0) return null;
        return ((c - p) / p) * 100;
    };

    return {
        sales: calc(curr.totalSales30d, prev.totalSales30d),
        orders: calc(curr.totalOrders30d, prev.totalOrders30d),
        ticket: calc(curr.ticketPromedio, prev.ticketPromedio)
    };
  }, [activeReport, previousReport]);

  const filteredPillars = useMemo(() => {
    if (!activeReport) return [];
    return Object.entries(activeReport.data.pillars)
      .filter(([key, p]: [string, any]) => {
          const matchesSearch = p.recommendation.toLowerCase().includes(searchTerm.toLowerCase()) || 
                               p.realState.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesPilar = filterPilar === 'all' || key === filterPilar;
          const matchesPriority = filterPriority === 'all' || p.priority === filterPriority;
          return matchesSearch && matchesPilar && matchesPriority;
      })
      .sort((a: any, b: any) => {
          const priorityMap: any = { High: 0, Medium: 1, Low: 2 };
          return priorityMap[a[1].priority] - priorityMap[b[1].priority];
      });
  }, [activeReport, searchTerm, filterPilar, filterPriority]);

  const currentLimit = useMemo(() => {
    if (!plan) return 1;
    const normalizedPlan = plan.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalizedPlan.includes('profesional')) return PLAN_GENERATION_LIMITS.profesional;
    if (normalizedPlan.includes('estandar')) return PLAN_GENERATION_LIMITS.estandar;
    if (normalizedPlan.includes('basico')) return PLAN_GENERATION_LIMITS.basico;
    return PLAN_GENERATION_LIMITS.crecimiento;
  }, [plan]);

  const usedCount = useMemo(() => {
      if (!allReports) return 0;
      const monthStart = startOfMonth(new Date()).toISOString();
      return allReports.filter(r => r.createdAt >= monthStart).length;
  }, [allReports]);

  const handleRequestGeneration = async (bypassConfirm = false) => {
    if (!businessId || usedCount >= currentLimit || loadingSub) return;
    if (!bypassConfirm && activeReport?.createdAt && isToday(new Date(activeReport.createdAt))) {
      setShowConfirmDialog(true);
      return;
    }

    setIsGenerating(true);
    setShowConfirmDialog(false);
    try {
      const extraction = await extractDiagnosticData(businessId);
      await evaluateAppliedActionsImpact(businessId, extraction.data);
      const actionsSnap = await getDocs(collection(firestore, `businesses/${businessId}/diagnosticActions`));
      const previousActions = actionsSnap.docs.map(d => d.data());

      const reportId = doc(collection(firestore, 'placeholder')).id;
      const analysis = await analyzeDiagnosticWithAI(
        extraction.data, 
        extraction.sourcesReviewed, 
        businessId, 
        reportId,
        previousActions as any
      );

      const reportRef = doc(firestore, `businesses/${businessId}/diagnosticReports`, reportId);
      await setDoc(reportRef, {
        id: reportId,
        createdAt: new Date().toISOString(),
        planAtGeneration: plan,
        status: 'completed',
        sourcesReviewed: extraction.sourcesReviewed,
        data: { executiveSummary: analysis.executiveSummary, raw: extraction.data, pillars: analysis.pillars }
      });
      
      toast({ title: "¡Análisis con Aprendizaje Completado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleAction = async (pilarKey: string, recommendation: string) => {
    if (!activeReport || !businessId) return;
    setIsProcessingAction(true);
    try {
        const actionId = `${activeReport.id}_${pilarKey}`;
        const actionRef = doc(firestore, `businesses/${businessId}/diagnosticActions`, actionId);
        
        const existing = appliedActions?.find(a => a.id === actionId);
        
        if (existing?.status === 'applied') {
            await setDoc(actionRef, { status: 'pending', updatedAt: new Date().toISOString() }, { merge: true });
            toast({ title: "Acción marcada como pendiente" });
        } else {
            const metricMap: Record<string, any> = {
                ventaProactiva: { key: 'totalSales30d', val: activeReport.data.raw.ronda1_ventas.totalSales30d },
                radarChurn: { key: 'churnRiskCount', val: activeReport.data.raw.ronda2_clientes.churnRiskCount },
                reputacion: { key: 'directoryRating', val: activeReport.data.raw.ronda4_motores.directoryRating },
                operacionBlindada: { key: 'pendingOrdersCount', val: activeReport.data.raw.ronda3_operacion.pendingOrdersCount }
            };

            const baseline = metricMap[pilarKey];

            await setDoc(actionRef, {
                id: actionId,
                reportId: activeReport.id,
                pilar: pilarKey,
                description: recommendation,
                status: 'applied',
                appliedAt: new Date().toISOString(),
                baselineValue: typeof baseline?.val === 'number' ? baseline.val : 0,
                targetMetricKey: baseline?.key || 'unknown',
                resultValue: null,
                impactStatus: null,
                updatedAt: new Date().toISOString()
            });
            toast({ title: "¡Acción marcada como aplicada!", description: "La IA aprenderá de este resultado en tu próximo informe." });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: "Error al actualizar acción" });
    } finally {
        setIsProcessingAction(false);
    }
  };

  const handleExportExcel = () => {
    if (!activeReport) return;
    const data = Object.entries(activeReport.data.pillars).map(([key, p]: [string, any]) => ({
        Pilar: PILLAR_LABELS[key] || key,
        Estado: p.realState,
        Oportunidad: p.opportunityData,
        Prioridad: p.priority,
        Recomendacion: p.recommendation,
        Aprendizaje: p.learningNote || 'N/A',
        Semaforo: p.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Diagnóstico");
    XLSX.writeFile(wb, `Diagnostico_Markix_${activeReport.id.slice(0,5)}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!activeReport) return;
    const docPdf = new jsPDF();
    docPdf.text("INFORME DE DIAGNÓSTICO COMERCIAL - MARKIX", 14, 20);
    docPdf.setFontSize(10);
    docPdf.text(`Generado: ${new Date(activeReport.createdAt).toLocaleString()}`, 14, 30);
    (docPdf as any).autoTable({
        startY: 40,
        head: [['Pilar', 'Estado', 'Recomendación', 'Aprendizaje']],
        body: Object.entries(activeReport.data.pillars).map(([key, p]: [string, any]) => [
            PILLAR_LABELS[key], p.realState, p.recommendation, p.learningNote || '---'
        ])
    });
    docPdf.save(`Reporte_Markix_${activeReport.id.slice(0,5)}.pdf`);
  };

  const handleShareWhatsApp = () => {
    if (!activeReport) return;
    const msg = `*Markix Diagnóstico Comercial*\n\nResumen: ${activeReport.data.executiveSummary}\n\nVer informe completo en tu panel.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const isLoading = loadingSub || loadingReports || loadingActions;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <Alert className="bg-muted/50 border-primary/20 shadow-sm rounded-2xl border-2">
        <Lock className="h-4 w-4 text-primary" />
        <AlertTitle className="text-xs font-black uppercase tracking-widest text-primary">Inteligencia Estratégica</AlertTitle>
        <AlertDescription className="text-sm font-medium">Analizador táctico en modo lectura — Identifica oportunidades sin alterar tu operación.</AlertDescription>
      </Alert>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <FileBarChart className="h-9 w-9 text-primary" />
            Diagnóstico Comercial
          </h1>
          <p className="text-muted-foreground font-medium">Hoja de ruta táctica basada en el Corazón de Markix.</p>
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <Button 
                onClick={() => handleRequestGeneration()}
                disabled={isGenerating || usedCount >= currentLimit || isLoading}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 w-full md:w-auto"
            >
                {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analizando...</> : <><RefreshCw className="mr-2 h-4 w-4" /> Generar Nuevo Informe</>}
            </Button>
            <Badge variant="outline" className="h-8 px-4 rounded-lg border-2 font-bold bg-white">
                Fuentes Revisadas: [{activeReport?.sourcesReviewed || 0} / 15]
            </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="analysis" className="gap-2 rounded-lg font-bold"><Target className="h-4 w-4" /> Análisis Activo</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 rounded-lg font-bold"><History className="h-4 w-4" /> Historial de Informes</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-8 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 border-2 border-primary/10 shadow-sm rounded-3xl p-6 bg-white">
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Uso del Mes</p>
                            <span className="text-xs font-bold">{usedCount} / {currentLimit === Infinity ? '∞' : currentLimit}</span>
                        </div>
                        <Progress value={currentLimit === Infinity ? 0 : (usedCount / currentLimit) * 100} className="h-2" />
                        <p className="text-[9px] font-bold text-muted-foreground uppercase text-center pt-1">{plan || 'Plan Crecimiento'}</p>
                    </div>
                </Card>

                <Card className="lg:col-span-3 border-2 border-gray-100 shadow-sm rounded-3xl p-6 bg-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-2xl"><Calendar className="h-6 w-6 text-muted-foreground" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Informe en Pantalla</p>
                            <p className="text-sm font-bold text-slate-900">
                                {activeReport?.createdAt ? format(new Date(activeReport.createdAt), "EEEE, d 'de' MMMM", { locale: es }) : 'No hay datos'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex gap-6">
                            <div className="text-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Ventas</p>
                                {trends && trends.sales !== null ? (
                                    <div className={cn("flex items-center gap-1 font-bold text-sm", trends.sales >= 0 ? "text-green-600" : "text-red-600")}>
                                        {trends.sales >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {Math.abs(trends.sales).toFixed(1)}%
                                    </div>
                                ) : <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">—</p>}
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Ticket</p>
                                {trends && trends.ticket !== null ? (
                                    <div className={cn("flex items-center gap-1 font-bold text-sm", trends.ticket >= 0 ? "text-green-600" : "text-red-600")}>
                                        {trends.ticket >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {Math.abs(trends.ticket).toFixed(1)}%
                                    </div>
                                ) : <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">—</p>}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {activeReport && (
                <>
                    <Card className="rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-hidden bg-white animate-in zoom-in duration-500">
                        <CardHeader className="bg-muted/30 border-b p-8 flex flex-col md:flex-row justify-between items-center gap-4">
                            <CardTitle className="text-2xl font-black">Resumen Ejecutivo</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleExportExcel} className="font-bold gap-2"><FileSpreadsheet size={16} className="text-green-600" /> Excel</Button>
                                <Button variant="outline" size="sm" onClick={handleExportPDF} className="font-bold gap-2"><FileText size={16} className="text-primary" /> PDF</Button>
                                <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="font-bold gap-2 border-green-200 text-green-700 bg-green-50"><WhatsAppIcon className="h-4 w-4" /> Compartir</Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10">
                            <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
                                <p className="text-lg font-medium text-gray-700 leading-relaxed italic">&quot;{activeReport.data.executiveSummary}&quot;</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-6 rounded-[2rem] border shadow-sm border-primary/10">
                        <div className="flex-1 space-y-2 w-full">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Buscador Táctico</Label>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input placeholder="Buscar en recomendaciones..." className="pl-10 h-11 border-2 focus-visible:ring-primary/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Filtrar Pilar</Label>
                            <Select value={filterPilar} onValueChange={setFilterPilar}>
                                <SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los pilares</SelectItem>
                                    {Object.entries(PILLAR_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Prioridad</Label>
                            <Select value={filterPriority} onValueChange={setFilterPriority}>
                                <SelectTrigger className="h-11 border-2 font-bold"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="High" className="text-red-600 font-bold">Alta</SelectItem>
                                    <SelectItem value="Medium" className="text-amber-600 font-bold">Media</SelectItem>
                                    <SelectItem value="Low" className="text-blue-600 font-bold">Baja</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {filteredPillars.map(([key, p]: [string, any]) => (
                            <PillarCard 
                                key={key} 
                                title={PILLAR_LABELS[key]} 
                                data={p as PillarAnalysis} 
                                pilarKey={key}
                                reportId={activeReport.id}
                                appliedActions={appliedActions || []}
                                onToggleAction={handleToggleAction}
                                isProcessingAction={isProcessingAction}
                            />
                        ))}
                    </div>
                </>
            )}
        </TabsContent>

        <TabsContent value="history" className="outline-none animate-in fade-in duration-500">
            <Card className="rounded-3xl border-2 border-gray-100 bg-white overflow-hidden shadow-sm">
                <CardHeader className="bg-muted/20 border-b">
                    <CardTitle className="text-xl font-black">Historial de Informes</CardTitle>
                    <CardDescription>Consulta la evolución estratégica de tu negocio en el tiempo.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/10">
                            <TableRow>
                                <TableHead className="pl-8 font-black text-[10px] uppercase">Fecha y Hora</TableHead>
                                <TableHead className="font-black text-[10px] uppercase">Plan al Generar</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-center">Fuentes</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-right pr-8">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingReports ? (
                                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></TableCell></TableRow>
                            ) : allReports?.map(r => (
                                <TableRow key={r.id} className="hover:bg-muted/30">
                                    <TableCell className="pl-8 py-4 font-bold text-sm text-slate-700">
                                        {format(new Date(r.createdAt), "d 'de' MMMM, yyyy - p", { locale: es })}
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="font-bold uppercase text-[9px]">{r.planAtGeneration || 'N/A'}</Badge></TableCell>
                                    <TableCell className="text-center font-black text-xs text-primary">[{r.sourcesReviewed} / 15]</TableCell>
                                    <TableCell className="text-right pr-8">
                                        <button 
                                          onClick={() => { setActiveTab('analysis'); setDateRange({ from: r.createdAt, to: r.createdAt }); }}
                                          className="flex items-center gap-2 ml-auto font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Eye size={14} /> Ver Informe
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-md">
            <DialogHeader className="p-8 pb-2 bg-amber-50"><DialogTitle className="flex items-center gap-2 text-amber-700"><ShieldAlert className="h-5 w-5" /> Protección de Gasto</DialogTitle></DialogHeader>
            <div className="p-8 space-y-4"><p className="text-sm text-gray-600 leading-relaxed">¿Seguro que quieres generar uno nuevo ahora? Esto descontará 1 intento de tu límite mensual.</p></div>
            <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="flex-1 font-bold">Cancelar</Button>
                <Button onClick={() => handleRequestGeneration(true)} className="flex-1 font-black bg-amber-600 hover:bg-amber-700 text-white">Generar nuevo</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
