
"use client";

import React, { useState, useMemo, Component, ReactNode, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Slider } from '../../components/ui/slider';
import { 
  DollarSign, 
  ShoppingBag, 
  ArrowRight, 
  Info, 
  AlertCircle,
  Zap,
  Calculator,
  TrendingUp,
  Sparkles,
  Percent,
  Activity,
  Rocket,
  CheckCircle,
  ShieldCheck,
  HelpCircle,
  X,
  Check,
  Star,
  Smartphone,
  Loader2,
  ChevronDown,
  Scissors,
  Utensils,
  Briefcase,
  Target,
  Globe,
  Clock,
  Building2
} from 'lucide-react';
import { cn, normalizePhoneNumber } from '../../lib/utils';
import PublicHeader from '../../components/layout/public-header';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Simulador Comercial Menfy (Public Mode).
 * LÓGICA UNIFICADA: Recomendación viable + Desglose transparente de precios.
 */

const HYBRID_PLANS_DATA = [
  { 
    id: 'crecimiento', 
    name: 'Plan Crecimiento', 
    base: 0, 
    fee: 0.15, 
    maxOrders: 300, 
    icon: Zap, 
    color: 'blue', 
    order: 1,
    features: [
      'Catálogo online con código QR',
      'Pedidos directos por WhatsApp',
      'Hasta 20 Productos en catálogo',
      '1 Landing Page & 1 Post de Blog',
      'Soporte estándar de plataforma'
    ]
  },
  { 
    id: 'basico', 
    name: 'Plan Básico', 
    base: 19900, 
    fee: 0.10, 
    maxOrders: 800, 
    icon: TrendingUp, 
    color: 'green', 
    order: 2,
    features: [
      'Todo lo del Plan Crecimiento',
      'Asistente WHAPI (WhatsApp)',
      'Hasta 40 Productos en catálogo',
      'Hasta 20 Artículos de Blog',
      'Gestión de Pedidos y Empaque'
    ]
  },
  { 
    id: 'estandar', 
    name: 'Plan Estándar', 
    base: 39900, 
    fee: 0.09, 
    maxOrders: 2000, 
    icon: Star, 
    color: 'purple', 
    order: 3, 
    isMostPopular: true,
    features: [
      'Todo lo del Plan Básico',
      'Asistente YCloud oficial v2',
      'Sistema de Fidelización y Puntos',
      'Hasta 80 Productos en catálogo',
      'Hasta 50 Artículos de Blog',
      'Módulo de Inventario Kardex'
    ]
  },
  { 
    id: 'profesional', 
    name: 'Plan Profesional', 
    base: 69900, 
    fee: 0.08, 
    maxOrders: 999999, 
    icon: Rocket, 
    color: 'orange', 
    order: 4,
    features: [
      'Todo lo del Plan Estándar',
      'Catálogo y Productos Ilimitados',
      'Motor de Sugerencias con IA',
      'Radar de Churn y Recuperación',
      'Soporte prioritario 24/7'
    ]
  }
];

class SimulatorErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase text-red-900">Algo salió mal</h2>
          <p className="text-red-700 mt-2">Hubo un error en los cálculos financieros. Por favor recarga la página.</p>
          <Button onClick={() => window.location.reload()} className="mt-6 bg-red-600 rounded-xl text-white">Reintentar</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function SimulatorView() {
  const [mounted, setMounted] = useState(false);
  
  // Estados para Sliders
  const [pedidosActuales, setPedidosActuales] = useState<number>(300);
  const [ticketPromedio, setTicketPromedio] = useState<number>(45000);
  const [margenNeto, setMargenNeto] = useState<number>(30);
  const [crecimientoEstimado, setCrecimientoEstimado] = useState<number>(20);
  const [comisionApps, setComisionApps] = useState<number>(20);
  
  // Estados del Asesor Inteligente
  const [businessType, setBusinessType] = useState<'salon' | 'restaurant' | 'store' | 'services'>('salon');
  const [mainChallenge, setMainChallenge] = useState<'no_shows' | 'commissions' | 'no_online' | 'automation'>('no_shows');

  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const { user } = useUser();
  const { ordersCount } = useSubscription();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCOP = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  const loadRealMetrics = () => {
    if (!user) return;
    if (ordersCount > 0) {
        setPedidosActuales(ordersCount);
    }
    toast({
        title: "✨ Métricas reales cargadas",
        description: "Hemos ajustado el volumen de pedidos con tu historial de Markix.",
    });
  };

  // MOTOR DE RECOMENDACIÓN Y CÁLCULOS (UNIFICADO)
  const { kpis, initialCalculated, recommendation } = useMemo(() => {
    const ventasActuales = pedidosActuales * ticketPromedio;
    const utilidadActual = ventasActuales * (margenNeto / 100);
    
    const incrementoPedidos = Math.round(pedidosActuales * (crecimientoEstimado / 100));
    const pedidosProyectados = pedidosActuales + incrementoPedidos;
    const ventasProyectadas = pedidosProyectados * ticketPromedio;
    const utilidadProyectada = ventasProyectadas * (margenNeto / 100);
    
    const utilidadIncremental = utilidadProyectada - utilidadActual;
    const ahorroAppsProyectado = ventasProyectadas * (comisionApps / 100);
    const gananciaBrutaTotal = utilidadIncremental + ahorroAppsProyectado;

    // 1. Determinar plan ideal según desafío (Perfil de usuario)
    let challengePlanId = 'crecimiento';
    
    if (mainChallenge === 'no_shows') {
      challengePlanId = 'basico';
    } else if (mainChallenge === 'commissions') {
      challengePlanId = 'estandar';
    } else if (mainChallenge === 'no_online') {
      challengePlanId = 'crecimiento';
    } else if (mainChallenge === 'automation') {
      challengePlanId = 'profesional';
    }

    const calculated = HYBRID_PLANS_DATA.map(plan => {
      const costoMenfy = plan.base + (ventasProyectadas * plan.fee);
      
      const ahorroComisionVsGratis = Math.max(0, ventasProyectadas * (0.15 - plan.fee));
      const tieneWhatsApp = plan.id !== 'crecimiento';
      const valorRescatadoWhatsApp = tieneWhatsApp ? Math.round(ventasProyectadas * 0.10) : 0;
      const beneficioNetoTotal = (ahorroComisionVsGratis + valorRescatadoWhatsApp) - plan.base;

      const gananciaNetaExtra = gananciaBrutaTotal - costoMenfy;
      const isProfitable = gananciaNetaExtra > 0;
      const roi = costoMenfy > 0 ? (gananciaNetaExtra / costoMenfy) : 0;
      
      // Validación de Capacidad
      const isSuitable = plan.maxOrders === 999999 || pedidosProyectados <= plan.maxOrders;
      const utilization = plan.maxOrders === 999999 ? 0.75 : (pedidosProyectados / plan.maxOrders);

      return {
        ...plan,
        totalCost: Math.round(costoMenfy),
        ahorroComisionVsGratis,
        valorRescatadoWhatsApp,
        beneficioNetoTotal,
        gananciaNetaExtra: Math.round(gananciaNetaExtra),
        roi: Number(roi.toFixed(2)),
        utilization: Math.round(utilization * 100),
        isSuitable,
        isProfitable
      };
    });

    // 2. Lógica de Selección de Ganador (Viabilidad + Perfil)
    // El ganador debe ser el plan preferido del desafío PERO que tenga capacidad suficiente.
    let winner = calculated.find(p => p.id === challengePlanId);
    
    // Si el plan sugerido por el desafío NO tiene capacidad, buscamos el primer superior que sí la tenga.
    if (!winner || !winner.isSuitable) {
      winner = calculated
        .filter(p => p.isSuitable)
        .sort((a, b) => a.order - b.order)[0];
    }

    return {
      initialCalculated: calculated,
      kpis: {
        ventasActuales,
        ventasProyectadas,
        crecimientoVentas: ventasProyectadas - ventasActuales,
        pedidosProyectados,
        incrementoPedidos,
        utilidadIncremental,
        ahorroAppsProyectado,
        gananciaBrutaTotal
      },
      recommendation: winner || calculated[0]
    };
  }, [pedidosActuales, ticketPromedio, margenNeto, crecimientoEstimado, comisionApps, mainChallenge]);

  /**
   * Helper para generar el copy estratégico dinámico según el desafío seleccionado.
   */
  const getStrategicAnalysisText = () => {
    if (!recommendation) return "";

    const planName = recommendation.name;
    const comisionActual = comisionApps; // % ingresado en slider
    const feePlan = Math.round(recommendation.fee * 100);
    const ahorroComision = formatCOP(recommendation.ahorroComisionVsGratis || 0);
    const gananciaExtra = formatCOP(recommendation.gananciaNetaExtra || 0);
    const basePlan = formatCOP(recommendation.base);
    const roi = recommendation.roi || '1.0';

    switch (mainChallenge) {
      case 'commissions':
        return `Hoy pagas el ${comisionActual}% en comisiones en apps externas. Con el ${planName} bajas tu comisión al ${feePlan}%, ahorrando ${ahorroComision} cada mes en comisiones. Sumado a tu crecimiento proyectado, este cambio pone ${gananciaExtra} adicionales en tu bolsillo mensualmente.`;

      case 'no_shows':
        return `Al activar los recordatorios automáticos de WhatsApp de este plan, reduces drásticamente las citas perdidas y cancelaciones. Recuperar la asistencia de tus clientes te permite capturar una utilidad extra de ${gananciaExtra} al mes, logrando un retorno de inversión estimado de ${roi}x sobre el costo del software.`;

      case 'no_online':
        return `Digitalizas tu operación con un catálogo online profesional y pedidos directos por WhatsApp. Con una inversión base de solo ${basePlan}/mes, eliminas intermediarios y generas una ganancia neta estimada de ${gananciaExtra} mensuales desde tu propia plataforma independiente.`;

      case 'automation':
        return `Desbloqueas el Radar de Clientes y el Asistente con IA para recuperar ventas inactivas y atender a tus clientes 24/7. Esta automatización no solo libera tu tiempo, sino que proyecta un incremento de ingresos de ${gananciaExtra} cada mes gracias a una gestión inteligente.`;

      default:
        return `El ${planName} es la opción más equilibrada para tu volumen de ventas. Te permite optimizar tus costos y capturar una utilidad adicional de ${gananciaExtra} mensuales.`;
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-12 pricing-simulator-sandbox pb-24">
      {/* CARGA DE MÉTRICAS REALES */}
      {user && (
        <div className="flex justify-center animate-in fade-in zoom-in duration-500">
            <button 
                onClick={loadRealMetrics}
                className="rounded-full px-8 h-12 border-2 border-primary/20 bg-primary/5 text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg flex items-center"
            >
                <Sparkles className="mr-2 h-4 w-4" />
                Cargar métricas reales de mi negocio
            </button>
        </div>
      )}

      {/* PANEL DE ENTRADA CON ASESOR INTELIGENTE */}
      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b py-8 px-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 shadow-inner">
                  <Calculator size={32} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tight">Asesor de Estrategia</CardTitle>
                  <CardDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">
                    Define tu perfil para recibir una recomendación inteligente.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="h-10 px-4 rounded-xl border-2 font-black text-primary bg-white">
                Moneda: COP
              </Badge>
           </div>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          
          <div className="space-y-6 pb-8 border-b border-dashed">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Building2 size={12} /> 1. ¿Qué tipo de negocio tienes?
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'salon', label: 'Belleza / Spa', icon: Scissors },
                  { id: 'restaurant', label: 'Restaurante', icon: Utensils },
                  { id: 'store', label: 'Tienda / Retail', icon: ShoppingBag },
                  { id: 'services', label: 'Servicios', icon: Briefcase },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setBusinessType(type.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                      businessType === type.id 
                        ? "bg-primary/10 text-primary border-primary shadow-sm" 
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    <type.icon size={14} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Target size={12} /> 2. ¿Cuál es tu mayor desafío hoy?
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'no_shows', label: 'Inasistencias', icon: Clock },
                  { id: 'commissions', label: 'Altas Comisiones', icon: DollarSign },
                  { id: 'no_online', label: 'Sin Venta Online', icon: Globe },
                  { id: 'automation', label: 'Atención e IA', icon: Sparkles },
                ].map(challenge => (
                  <button
                    key={challenge.id}
                    onClick={() => setMainChallenge(challenge.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                      mainChallenge === challenge.id 
                        ? "bg-primary/10 text-primary border-primary shadow-sm" 
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                    )}
                  >
                    <challenge.icon size={14} />
                    {challenge.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <ShoppingBag size={14} className="text-orange-50" /> Pedidos Mensuales Actuales
                </Label>
                <span className="font-black text-sm">{pedidosActuales}</span>
              </div>
              <Slider value={[pedidosActuales]} min={10} max={3000} step={10} onValueChange={(v) => setPedidosActuales(v[0])} className="py-4" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <DollarSign size={14} className="text-green-500" /> Ticket Promedio
                </Label>
                <span className="font-black text-sm">{formatCOP(ticketPromedio)}</span>
              </div>
              <Slider value={[ticketPromedio]} min={5000} max={250000} step={1000} onValueChange={(v) => setTicketPromedio(v[0])} className="py-4" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Percent size={14} className="text-blue-500" /> Margen Neto (Utilidad)
                </Label>
                <span className="font-black text-sm">{margenNeto}%</span>
              </div>
              <Slider value={[margenNeto]} min={5} max={60} step={1} onValueChange={(v) => setMargenNeto(v[0])} className="py-4" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <TrendingUp size={14} className="text-purple-500" /> Crecimiento Estimado
                </Label>
                <span className="font-black text-sm text-purple-600">+{crecimientoEstimado}%</span>
              </div>
              <Slider value={[crecimientoEstimado]} min={0} max={100} step={5} onValueChange={(v) => setCrecimientoEstimado(v[0])} className="py-4" />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <Smartphone size={14} className="text-red-500" /> Comisión App Externa
                </Label>
                <span className="font-black text-sm text-red-600">{comisionApps}%</span>
              </div>
              <Slider value={[comisionApps]} min={0} max={35} step={1} onValueChange={(v) => setComisionApps(v[0])} className="py-4" />
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border flex flex-col justify-center text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Pedidos Proyectados</p>
                <p className="text-2xl font-black text-primary">{kpis.pedidosProyectados} / mes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem] group-hover:bg-orange-600 group-hover:text-white transition-colors shadow-inner">
                  <Activity size={32} />
              </div>
              <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ventas Proyectadas</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCOP(kpis.ventasProyectadas)}</p>
              </div>
            </CardContent>
        </Card>
        
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden group hover:scale-[1.02] transition-all relative border-2 border-orange-500/20">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={100} /></div>
            <CardContent className="p-8 flex items-center gap-6 relative z-10">
              <div className="p-4 bg-white/10 text-orange-400 rounded-[1.5rem] group-hover:bg-orange-500 group-hover:text-white transition-colors shadow-inner">
                  <Zap size={32} className="fill-current" />
              </div>
              <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Ganancia Neta Extra</p>
                  <p className="text-3xl font-black text-white tracking-tighter">
                    {recommendation?.isProfitable ? formatCOP(recommendation.gananciaNetaExtra) : 'Fase Inversión'}
                  </p>
              </div>
            </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-xl bg-orange-600 text-white overflow-hidden group hover:scale-[1.02] transition-all">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="p-4 bg-white/20 text-white rounded-[1.5rem] group-hover:bg-white group-hover:text-orange-600 transition-colors shadow-inner">
                  <TrendingUp size={32} />
              </div>
              <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">ROI Proyectado</p>
                  <p className="text-3xl font-black text-white tracking-tighter">
                    {recommendation?.isProfitable ? `${recommendation.roi}x` : 'En Desarrollo'}
                  </p>
              </div>
            </CardContent>
        </Card>
      </div>

      {/* CATÁLOGO DE PLANES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {initialCalculated?.map((res, idx) => {
          const isRecommended = res.id === recommendation.id;
          const isBlocked = !res.isSuitable;
          const isExpanded = expandedPlan === res.id;
          const Icon = res.icon;

          return (
            <motion.div 
              key={res.id} 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: isRecommended ? 1.03 : 1 
              }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={cn(
                "relative h-full rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden shadow-lg flex flex-col",
                isRecommended ? "border-primary shadow-2xl z-10 bg-white" : "border-slate-100 hover:border-primary/10 bg-white/80",
                isBlocked && "opacity-60 grayscale bg-slate-50"
              )}>
                <CardHeader className="pb-6 text-center space-y-4 pt-8">
                  <div className="flex justify-center mb-2">
                     {isRecommended ? (
                       <Badge className="bg-primary text-white border-none font-black text-[9px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                         ✨ Recomendado para ti
                       </Badge>
                     ) : isBlocked ? (
                       <Badge variant="destructive" className="uppercase font-black text-[9px] px-4 h-7 border-none shadow-md">
                         ✕ Capacidad Insuficiente
                       </Badge>
                     ) : (
                       <Badge variant="outline" className={cn("uppercase font-black text-[9px] px-4 h-7 border-2", res.isProfitable ? "text-green-600 border-green-200" : "text-slate-400")}>
                         {res.isProfitable ? '✓ Rentable' : '✓ Fase Inversión'}
                       </Badge>
                     )}
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                      <div className={cn("p-4 rounded-2xl shadow-inner", isRecommended ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400")}>
                          <Icon size={32} />
                      </div>
                      <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-2">{res.name}</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="px-8 pb-4 space-y-6 flex-1 text-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inversión Total Proyectada</p>
                    <h4 className="text-3xl sm:text-4xl font-black tracking-tighter text-gray-900">{formatCOP(res.totalCost)}</h4>
                    
                    {/* DESGLOSE TRANSPARENTE */}
                    <div className="flex flex-col text-[11px] font-semibold text-slate-500 mt-1">
                        <span>Cuota fija: <strong className="text-gray-700">{formatCOP(res.base)} / mes</strong></span>
                        <span className="text-orange-600">
                            Comisión estimada ({res.fee * 100}%): <strong>{formatCOP(res.totalCost - res.base)}</strong>
                        </span>
                    </div>
                  </div>

                  <div className="space-y-2 py-4 border-y border-dashed border-slate-200">
                    {res.id === 'crecimiento' ? (
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Comisión estándar del 15%</p>
                    ) : (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-green-600 uppercase tracking-tighter">
                                <Sparkles className="h-3 w-3" /> Ahorras {formatCOP(res.ahorroComisionVsGratis)} en comisiones
                            </div>
                            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                <Smartphone className="h-3 w-3" /> +{formatCOP(res.valorRescatadoWhatsApp)} rescatados por IA
                            </div>
                        </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                    <div className="flex flex-col items-center border-r border-slate-200">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Retorno (ROI)</span>
                       <span className={cn("text-lg font-black", res.isProfitable ? "text-green-600" : "text-red-500")}>{res.roi}x</span>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Utilización</span>
                       <span className={cn("text-lg font-black", res.utilization > 85 ? "text-orange-600" : "text-primary")}>
                         {res.utilization}%
                       </span>
                    </div>
                  </div>

                  <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedPlan(isExpanded ? null : res.id)}
                        className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary flex items-center justify-center gap-2 py-2 transition-colors border rounded-xl hover:bg-muted/30"
                      >
                        <span>{isExpanded ? 'Ocultar funciones' : 'Ver funciones incluidas'}</span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden text-left"
                          >
                            <div className="pt-6 space-y-3">
                                {res.features.map((feature, fIdx) => (
                                    <div key={fIdx} className="flex items-start gap-2.5 group/feat">
                                        <div className="p-1 bg-green-50 rounded-md group-hover/feat:bg-green-500 transition-colors">
                                            <Check className="w-3 h-3 text-green-600 group-hover/feat:text-white" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600 leading-tight">
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
                </CardContent>

                <CardFooter className="p-8 pt-4">
                   <Button asChild disabled={isBlocked} className={cn(
                     "w-full h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl border-none transition-all active:scale-95 text-lg",
                     isRecommended ? "bg-primary hover:bg-primary/90 text-white" : "bg-slate-900 hover:bg-black text-white"
                   )}>
                      <a href={!isBlocked ? `/register?plan=${res.id}` : '#'}>
                        {isBlocked ? 'Capacidad Insuficiente' : `Elegir ${res.name}`} <ArrowRight className="ml-3 h-6 w-6" />
                      </a>
                   </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ANÁLISIS ESTRATÉGICO */}
      <Card className="rounded-[3rem] border-2 border-slate-100 bg-white shadow-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b p-10">
             <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-blue-100 rounded-[2rem] text-blue-600 shadow-lg">
                   <HelpCircle size={40} />
                </div>
                <div className="text-center md:text-left space-y-1">
                  <CardTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900">¿Cómo calculamos tu proyección?</CardTitle>
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                    Análisis detallado de eficiencia operativa y financiera.
                  </p>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-10 md:p-16 space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                <div className="space-y-4 p-8 rounded-[2rem] border-2 bg-slate-50 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={60} /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">1. Situación Actual</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b pb-2"><span className="text-xs font-bold text-slate-500">Ventas:</span><span className="font-black text-sm">{formatCOP(kpis.ventasActuales)}</span></div>
                    <div className="flex justify-between items-end border-b pb-2"><span className="text-xs font-bold text-slate-500">Pedidos:</span><span className="font-black text-sm">{pedidosActuales}</span></div>
                    <div className="flex justify-between items-end"><span className="text-xs font-bold text-slate-500">Ticket:</span><span className="font-black text-sm">{formatCOP(ticketPromedio)}</span></div>
                  </div>
                </div>

                <div className="space-y-4 p-8 rounded-[2rem] border-2 bg-orange-50 border-orange-100 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={60} /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">2. Proyección Futura</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b pb-2"><span className="text-xs font-bold text-orange-800">Proyectados:</span><span className="font-black text-sm">{kpis.pedidosProyectados}</span></div>
                    <div className="flex justify-between items-end text-orange-600 font-black pt-2"><span className="text-xs uppercase">Incremento:</span><span className="text-xl">+{kpis.incrementoPedidos} ped.</span></div>
                    <p className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter">Crecimiento esperado: +{crecimientoEstimado}%</p>
                  </div>
                </div>

                <div className="space-y-4 p-8 rounded-[2rem] border-2 bg-green-50 border-green-100 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign size={60} /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600">3. Impacto en Ventas</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b pb-2"><span className="text-xs font-bold text-green-800">Ventas Extra:</span><span className="font-black text-sm text-green-600">{formatCOP(kpis.crecimientoVentas)}</span></div>
                    <div className="flex justify-between items-end text-orange-600 font-black pt-2"><span className="text-xs uppercase">Ahorro Apps:</span><span className="text-xl">{formatCOP(kpis.ahorroAppsProyectado)}</span></div>
                    <p className="text-[8px] text-green-700 italic border-t border-green-200 pt-2">Eficiencia en comisiones de terceros</p>
                  </div>
                </div>

                <div className="space-y-4 p-8 rounded-[2rem] border-2 bg-slate-900 border-primary/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-white"><CheckCircle size={60} /></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">4. Rentabilidad Neta</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-white/10 pb-2"><span className="text-xs font-bold text-white/60">Margen:</span><span className="font-black text-sm text-white">{margenNeto}%</span></div>
                    <div className="flex flex-col pt-3">
                        <span className="text-[9px] font-black uppercase text-orange-400 tracking-widest mb-1">Ganancia Neta Extra:</span>
                        <span className="text-2xl font-black text-white">{recommendation?.isProfitable ? formatCOP(recommendation.gananciaNetaExtra) : 'Fase Inversión'}</span>
                    </div>
                  </div>
                </div>
             </div>

             <div className="p-10 bg-slate-900 rounded-[3.5rem] text-white relative overflow-hidden ring-1 ring-white/10 shadow-2xl group mt-8">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                   <div className="p-6 bg-white/10 rounded-[2.5rem] text-orange-400 shadow-inner border border-white/5 transition-transform group-hover:scale-105 duration-500">
                      <ShieldCheck size={48} />
                   </div>
                   <div className="flex-1 space-y-4 text-center md:text-left">
                      <h3 className="text-2xl font-black uppercase tracking-tight text-white">Análisis Estratégico: {recommendation?.name}</h3>
                      <p className="text-base sm:text-lg text-white/80 font-medium leading-relaxed max-w-4xl">
                        {getStrategicAnalysisText()}
                      </p>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                           <CheckCircle size={14} className="text-green-400" /> Eficiencia de Inversión
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-white">
                           <CheckCircle size={14} className="text-green-400" /> Escalabilidad Garantizada
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          </CardContent>
      </Card>
    </div>
  );
}

export default function PricingSimulatorPage() {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-slate-50 pt-32 pb-20">
        <div className="container max-w-7xl mx-auto px-4 md:px-8">
          <header className="mb-10 space-y-2 text-center md:text-left animate-in slide-in-from-left-4 duration-700">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 shadow-md">
                <Rocket size={32} />
              </div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary">Simulador de Estrategia</h1>
            </div>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] md:ml-16">Optimización de Inversión y Escalabilidad para Restaurantes</p>
          </header>

          <SimulatorErrorBoundary>
            <SimulatorView />
          </SimulatorErrorBoundary>
        </div>
      </main>

      <style jsx global>{`
        .pricing-simulator-sandbox input[type=number]::-webkit-inner-spin-button,
        .pricing-simulator-sandbox input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </>
  );
}

