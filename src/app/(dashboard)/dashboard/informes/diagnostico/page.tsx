'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc, setDoc } from 'firebase/firestore';
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
import { Input } from "@/components/ui/input";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
    FileBarChart, 
    Lock, 
    RefreshCw, 
    Loader2, 
    ShieldAlert, 
    Calendar as CalendarIcon, 
    Zap, 
    AlertTriangle, 
    Target, 
    Search,
    Filter,
    X,
    FileSpreadsheet,
    FileText,
    Share2,
    Download
} from 'lucide-react';
import { format, startOfMonth, isToday, endOfDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { extractDiagnosticData } from '@/services/diagnostic/data-extractor';
import { analyzeDiagnosticWithAI, type PillarAnalysis } from '@/services/diagnostic/ai-analyzer';
import { cn } from '@/lib/utils';
import { DateRange } from "react-day-picker";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { WhatsAppIcon } from '@/components/icons';

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
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { plan, isLoading: loadingSub } = useSubscription();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | 'whatsapp' | null>(null);
  const [showConfirmModal, setShowConfirmDialog] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [pilarFilter, setPilarFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date()
  });

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

  const reportsHistoryQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore || !dateRange?.from) return null;
    let q = collection(firestore, `businesses/${user.uid}/diagnosticReports`);
    const fromISO = startOfDay(dateRange.from).toISOString();
    const toISO = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(dateRange.from).toISOString();
    return query(q, where('createdAt', '>=', fromISO), where('createdAt', '<=', toISO), orderBy('createdAt', 'desc'));
  }, [user?.uid, firestore, dateRange]);

  const { data: historyReports, isLoading: loadingHistory } = useCollection(reportsHistoryQuery);
  const activeReport = historyReports?.[0] || null;

  const filteredPillars = useMemo(() => {
    if (!activeReport?.data?.pillars) return [];
    const pillarsArray = Object.entries(activeReport.data.pillars).map(([key, value]) => ({
      key,
      title: PILLAR_LABELS[key] || key,
      ...(value as PillarAnalysis)
    }));
    return pillarsArray.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.recommendation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.realState.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPilar = pilarFilter === 'all' || p.key === pilarFilter;
      const matchesPriority = priorityFilter === 'all' || p.priority === priorityFilter;
      return matchesSearch && matchesPilar && matchesPriority;
    }).sort((a, b) => {
      const pMap = { High: 0, Medium: 1, Low: 2 };
      return pMap[a.priority] - pMap[b.priority];
    });
  }, [activeReport, searchTerm, pilarFilter, priorityFilter]);

  const handleRequestGeneration = async (bypassConfirm = false) => {
    if (!user || !hasRemainingAttempts) return;
    if (!bypassConfirm && activeReport?.createdAt && isToday(new Date(activeReport.createdAt))) {
      setShowConfirmDialog(true);
      return;
    }
    setIsGenerating(true);
    setShowConfirmDialog(false);
    try {
      const extraction = await extractDiagnosticData(user.uid);
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
      toast({ title: "¡Informe Generado!", description: `Diagnóstico listo basado en ${extraction.sourcesReviewed} fuentes.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al generar", description: error.message || "No se pudo procesar la solicitud de IA." });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- HANDLERS DE EXPORTACIÓN (FASE 5) ---

  const handleExportExcel = () => {
    if (!activeReport) return;
    setIsExporting('excel');
    try {
      const pData = Object.entries(activeReport.data.pillars).map(([key, p]: [string, any]) => ({
        'Pilar': PILLAR_LABELS[key] || key,
        'Hallazgo': p.realState,
        'Oportunidad': p.hasOpportunity ? 'SÍ' : 'NO',
        'Dato Respaldo': p.opportunityData || '---',
        'Prioridad': p.priority,
        'Acción Recomendada': p.recommendation
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(pData);
      XLSX.utils.book_append_sheet(wb, ws, "Diagnóstico Comercial");
      XLSX.writeFile(wb, `Diagnostico_Markix_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Excel generado", description: "El reporte se ha descargado correctamente." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error al exportar Excel" });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPDF = () => {
    if (!activeReport) return;
    setIsExporting('pdf');
    try {
      const docPdf = new jsPDF();
      const bizName = profile?.name || 'Mi Negocio';
      const now = format(new Date(activeReport.createdAt), "dd/MM/yyyy HH:mm", { locale: es });

      docPdf.setFontSize(20);
      docPdf.text("INFORME DE DIAGNÓSTICO COMERCIAL", 14, 22);
      docPdf.setFontSize(10);
      docPdf.text(`Negocio: ${bizName.toUpperCase()} | Fecha Informe: ${now}`, 14, 30);

      docPdf.setFontSize(12);
      docPdf.text("Resumen Ejecutivo", 14, 45);
      const splitSummary = docPdf.splitTextToSize(activeReport.data.executiveSummary, 180);
      docPdf.setFontSize(10);
      docPdf.text(splitSummary, 14, 52);

      const tableData = Object.entries(activeReport.data.pillars).map(([key, p]: [string, any]) => [
        PILLAR_LABELS[key] || key,
        p.realState.substring(0, 80) + '...',
        p.priority,
        p.recommendation.substring(0, 80) + '...'
      ]);

      (docPdf as any).autoTable({
        startY: 52 + (splitSummary.length * 5) + 10,
        head: [['Pilar', 'Estado Real', 'Prioridad', 'Recomendación']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 }
      });

      docPdf.save(`Diagnostico_Ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado", description: "El informe listo para presentar se ha descargado." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Error al exportar PDF" });
    } finally {
      setIsExporting(null);
    }
  };

  const handleShareWhatsApp = () => {
    if (!activeReport) return;
    setIsExporting('whatsapp');
    try {
      const summary = activeReport.data.executiveSummary;
      const url = window.location.href;
      const message = `*Diagnóstico Comercial Markix 📊*\n\nHola, te comparto el resumen de mi negocio hoy:\n\n_"${summary}"_\n\nVer informe detallado aquí: ${url}`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
      toast({ title: "WhatsApp abierto", description: "El resumen ha sido preparado para compartir." });
    } finally {
      setIsExporting(null);
    }
  };

  const isLoading = loadingSub || loadingUsage || loadingHistory;

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
          <p className="text-muted-foreground font-medium">Análisis estratégico bajo demanda con IA.</p>
        </div>

        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <Button 
                onClick={() => handleRequestGeneration()}
                disabled={isGenerating || !hasRemainingAttempts || isLoading}
                className="h-12 px-8 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 w-full md:w-auto"
            >
                {isGenerating ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generando análisis...</>
                ) : (
                    <><RefreshCw className="mr-2 h-5 w-5" /> Generar Informe Actualizado</>
                )}
            </Button>
            <Badge variant="outline" className="h-8 px-4 rounded-lg border-2 font-bold bg-white">
                Informe basado en [{activeReport?.sourcesReviewed || 0}] de 15 fuentes revisadas
            </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 border-2 border-primary/10 shadow-sm rounded-3xl h-full flex flex-col justify-center p-6">
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Uso {format(new Date(), 'MMMM', {locale: es})}</p>
                    <span className="text-xs font-bold">{usedCount} / {currentLimit === Infinity ? '∞' : currentLimit}</span>
                </div>
                <Progress value={currentLimit === Infinity ? 0 : (usedCount / currentLimit) * 100} className="h-2" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase text-center pt-1">{plan || 'Plan Crecimiento'}</p>
            </div>
        </Card>

        <Card className="lg:col-span-3 border-2 border-gray-100 shadow-sm rounded-3xl p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input placeholder="Buscar en recomendaciones..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-11 bg-white border-2 rounded-xl" />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("h-11 border-2 rounded-xl font-bold gap-2 bg-white min-w-[240px]", !dateRange && "text-muted-foreground")}>
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</> : format(dateRange.from, "dd/MM/yy")) : "Historial por fecha"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} />
                        </PopoverContent>
                    </Popover>
                    <Select value={pilarFilter} onValueChange={setPilarFilter}><SelectTrigger className="h-11 border-2 rounded-xl w-40 font-bold bg-white"><SelectValue placeholder="Pilar" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los Pilares</SelectItem>{Object.entries(PILLAR_LABELS).map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent></Select>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="h-11 border-2 rounded-xl w-32 font-bold bg-white"><SelectValue placeholder="Prioridad" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="High" className="text-red-600 font-bold">Alta</SelectItem><SelectItem value="Medium" className="text-orange-600 font-bold">Media</SelectItem><SelectItem value="Low" className="text-blue-600 font-bold">Baja</SelectItem></SelectContent></Select>
                </div>
            </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed rounded-[2rem] bg-muted/20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando con la nube...</p>
        </div>
      ) : activeReport ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <Card className="rounded-[2.5rem] border-2 border-gray-100 shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black tracking-tight text-gray-900">Análisis Seleccionado</CardTitle>
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                Generado el {format(new Date(activeReport.createdAt), "d 'de' MMMM, yyyy 'a las' p", { locale: es })}
                            </p>
                        </div>
                        {/* --- BARRA DE ACCIONES / EXPORTACIÓN (FASE 5) --- */}
                        <div className="flex flex-wrap gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportExcel}
                                disabled={isExporting !== null}
                                className="font-bold border-primary text-primary hover:bg-primary/5 h-10 gap-2"
                            >
                                {isExporting === 'excel' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                                Excel
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleExportPDF}
                                disabled={isExporting !== null}
                                className="font-bold border-primary text-primary hover:bg-primary/5 h-10 gap-2"
                            >
                                {isExporting === 'pdf' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-4 w-4 text-primary" />}
                                PDF
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleShareWhatsApp}
                                disabled={isExporting !== null}
                                className="font-bold border-green-200 text-green-600 hover:bg-green-50 h-10 gap-2"
                            >
                                {isExporting === 'whatsapp' ? <Loader2 className="h-3 w-3 animate-spin" /> : <WhatsAppIcon className="h-4 w-4" />}
                                WhatsApp
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10">
                    <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><FileBarChart size={80} /></div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-4">Resumen Ejecutivo</h3>
                        <p className="text-lg font-medium text-gray-700 leading-relaxed italic">
                            &quot;{activeReport.data.executiveSummary}&quot;
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredPillars.map((p) => (
                    <PillarCard key={p.key} title={p.title} data={p} />
                ))}
            </div>

            {filteredPillars.length === 0 && (
                <Card className="border-2 border-dashed bg-muted/20 py-20 rounded-[2rem]">
                    <CardContent className="text-center space-y-4">
                        <Filter className="h-10 w-10 mx-auto text-muted-foreground/30" />
                        <p className="text-sm font-medium text-muted-foreground">No se encontraron hallazgos con los filtros aplicados.</p>
                        <Button variant="ghost" onClick={() => { setSearchTerm(''); setPilarFilter('all'); setPriorityFilter('all'); }} className="text-xs font-bold uppercase">Limpiar filtros</Button>
                    </CardContent>
                </Card>
            )}
        </div>
      ) : (
        <Card className="border-2 border-dashed bg-muted/20 py-24 rounded-[2rem]">
            <CardContent className="text-center space-y-6">
                <div className="p-4 bg-white rounded-3xl shadow-sm border w-fit mx-auto"><Target className="h-12 w-12 text-primary/30" /></div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tighter">Sin Datos en este Rango</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium">No hay informes generados para las fechas seleccionadas.</p>
                </div>
            </CardContent>
        </Card>
      )}

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-md">
            <DialogHeader className="p-8 pb-2 bg-amber-50">
                <DialogTitle className="flex items-center gap-2 text-amber-700"><ShieldAlert className="h-5 w-5" /> Confirmación de Gasto</DialogTitle>
                <DialogDescription className="font-medium text-amber-600/80">Ya generaste un informe hoy.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-4"><p className="text-sm text-gray-600 leading-relaxed">¿Seguro que quieres generar uno nuevo ahora? Esto descontará <strong>1 intento</strong> de tu límite mensual.</p></div>
            <DialogFooter className="p-6 pt-0 flex flex-col sm:flex-row gap-2">
                <Button variant="ghost" onClick={() => setShowConfirmDialog(false)} className="flex-1 font-bold">Cancelar</Button>
                <Button onClick={() => handleRequestGeneration(true)} className="flex-1 font-black bg-amber-600 hover:bg-amber-700 text-white">Sí, generar nuevo</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
