const fs = require('fs');
const path = require('path');

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`[BACKUP CREADO] ${backupPath}`);
  }
}

console.log('=== INICIANDO IMPLEMENTACIÓN DE JEV COPILOTO EN LOYALTY ===\n');

// 1. CREAR src/jev/contextAggregatorLoyalty.ts (NUEVO)
const aggregatorPath = path.join('src', 'jev', 'contextAggregatorLoyalty.ts');
const aggregatorContent = `import { getAdminFirestore } from '@/firebase/server-init';
import { getVipRanking, getChurnStatistics, getRecoveryStats } from '@/actions/loyalty';
import { obtenerAccionesJev } from './jevMemory';

export interface ContextoLoyalty {
  businessId: string;
  vipCustomers: any[];
  churnCustomers: any[];
  totalChurnCount: number;
  recoveredRevenue: number;
  recoveredCount: number;
  recentReviews: any[];
  promedioCalificacion: number;
  puntosConfig: {
    pointsPerCurrencyUnit: number;
    currencyValuePerPoint: number;
  };
  historialMemoria: any[];
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Fidelización e Inteligencia (SOLO LECTURA).
 */
export async function getLoyaltyContext(businessId: string): Promise<ContextoLoyalty> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT LOYALTY] businessId es obligatorio.');
  }

  const db = await getAdminFirestore();

  // 1. Obtener datos en paralelo desde las actions existentes de loyalty
  const [vipRanking, churnStats, recoveryStats] = await Promise.all([
    getVipRanking(businessId).catch(() => []),
    getChurnStatistics(businessId).catch(() => ({ customers: [], totalCount: 0 })),
    getRecoveryStats(businessId).catch(() => ({ totalRevenue: 0, recoveredCount: 0 })),
  ]);

  // 2. Obtener configuración de puntos desde Firestore
  let puntosConfig = { pointsPerCurrencyUnit: 1, currencyValuePerPoint: 0.05 };
  try {
    const configSnap = await db.collection('businesses').doc(businessId).collection('loyalty_config').doc('main').get();
    if (configSnap.exists) {
      const data = configSnap.data();
      if (data?.pointsPerCurrencyUnit !== undefined) puntosConfig.pointsPerCurrencyUnit = data.pointsPerCurrencyUnit;
      if (data?.currencyValuePerPoint !== undefined) puntosConfig.currencyValuePerPoint = data.currencyValuePerPoint;
    }
  } catch (e) {}

  // 3. Obtener últimas reseñas
  let recentReviews: any[] = [];
  let promedioCalificacion = 5.0;
  try {
    const reviewsSnap = await db.collection('reviews')
      .where('businessId', '==', businessId)
      .limit(15)
      .get();
    
    if (!reviewsSnap.empty) {
      recentReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const ratings = recentReviews.map(r => Number(r.rating) || 5);
      promedioCalificacion = ratings.length > 0 
        ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 5.0;
    }
  } catch (e) {}

  // 4. Memoria JEV
  let historialMemoria: any[] = [];
  try {
    historialMemoria = await obtenerAccionesJev(businessId, 20);
  } catch (e) {}

  return {
    businessId,
    vipCustomers: vipRanking,
    churnCustomers: churnStats.customers || [],
    totalChurnCount: churnStats.totalCount || 0,
    recoveredRevenue: recoveryStats.totalRevenue || 0,
    recoveredCount: recoveryStats.recoveredCount || 0,
    recentReviews,
    promedioCalificacion,
    puntosConfig,
    historialMemoria,
    ultimaActualizacion: new Date().toISOString(),
  };
}
`;

fs.writeFileSync(aggregatorPath, aggregatorContent, 'utf8');
console.log(`[CREADO] ${aggregatorPath}`);


// 2. CREAR src/jev/jevEngineLoyalty.ts (NUEVO)
const enginePath = path.join('src', 'jev', 'jevEngineLoyalty.ts');
const engineContent = `'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';
import { getLoyaltyContext, ContextoLoyalty } from './contextAggregatorLoyalty';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface CopilotoLoyaltyOutput {
  diagnostico: string;
  totalVip: number;
  totalEnRiesgo: number;
  revenueRecuperado: number;
  promedioResenas: number;
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor JEV Copiloto para Fidelización e Inteligencia
 */
export async function obtenerCopilotoLoyalty(businessId: string): Promise<CopilotoLoyaltyOutput> {
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return new Proxy({
      diagnostico: "El módulo JEV Copiloto no está activo para el plan actual de este negocio.",
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return 0;
      }
    }) as any;
  }

  if (!limitsInfo.canConsume) {
    return new Proxy({
      diagnostico: \`Has alcanzado el límite diario de consultas (\${limitsInfo.usageToday}/\${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.\`,
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return 0;
      }
    }) as any;
  }

  await consumeJevCopilotCredit(businessId);
  const contexto = await getLoyaltyContext(businessId);

  const accionesPrevias = contexto.historialMemoria.filter((m: any) => m.tipo === 'loyalty' || m.tipo === 'retencion');
  const patronesAprendidos: string[] = [];

  if (accionesPrevias.length > 0) {
    patronesAprendidos.push(\`JEV recuerda \${accionesPrevias.length} acción(es) previas de fidelización ejecutadas con éxito.\`);
  }
  if (contexto.recoveredRevenue > 0) {
    patronesAprendidos.push(\`La IA ha recuperado $\${contexto.recoveredRevenue.toLocaleString('es-CO')} en ventas atribuidas a campañas de fidelización.\`);
  }
  if (contexto.promedioCalificacion >= 4.5) {
    patronesAprendidos.push(\`Excelente reputación: calificación promedio de \${contexto.promedioCalificacion}/5 basada en reseñas recientes.\`);
  }

  const diagnostico = contexto.totalChurnCount > 0
    ? \`Atención: se detectaron \${contexto.totalChurnCount} cliente(s) en riesgo crítico de abandono. Tu comunidad VIP cuenta con \${contexto.vipCustomers.length} clientes destacados y se han recuperado $\${contexto.recoveredRevenue.toLocaleString('es-CO')} mediante IA.\`
    : \`Tu programa de fidelización opera en condiciones óptimas. \${contexto.vipCustomers.length} clientes en el ranking VIP y reputación de \${contexto.promedioCalificacion} estrellas.\`;

  return {
    diagnostico,
    totalVip: contexto.vipCustomers.length,
    totalEnRiesgo: contexto.totalChurnCount,
    revenueRecuperado: contexto.recoveredRevenue,
    promedioResenas: contexto.promedioCalificacion,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta contextual para el panel de fidelización
 */
export async function consultarJevLoyalty(businessId: string, pregunta: string): Promise<string> {
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return \`Has alcanzado el límite diario de consultas (\${limitsInfo.usageToday}/\${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.\`;
  }

  await consumeJevCopilotCredit(businessId);
  const contexto = await getLoyaltyContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('vip') || q.includes('mejores') || q.includes('ranking')) {
    if (contexto.vipCustomers.length === 0) return "Aún no hay clientes registrados en el ranking VIP.";
    const top = contexto.vipCustomers.slice(0, 3).map((c, i) => \`\${i+1}. \${c.name || 'Cliente'} (\${c.points || 0} pts, $\${(c.totalSpent || 0).toLocaleString('es-CO')})\`).join(', ');
    return \`Top clientes VIP: \${top}. Hay un total de \${contexto.vipCustomers.length} clientes en el ranking.\`;
  }

  if (q.includes('riesgo') || q.includes('abandono') || q.includes('churn') || q.includes('recuperar')) {
    if (contexto.totalChurnCount === 0) return "Excelente noticia: actualmente no tienes clientes con alertas de abandono según el umbral configurado.";
    return \`Hay \${contexto.totalChurnCount} cliente(s) en riesgo de churn. Puedes usar el botón 'Recuperar con IA' para reactivarlos automáticamente por WhatsApp.\`;
  }

  if (q.includes('revenue') || q.includes('ingreso') || q.includes('recuperado') || q.includes('dinero') || q.includes('ventas')) {
    return \`El revenue total recuperado por la IA es de $\${contexto.recoveredRevenue.toLocaleString('es-CO')} en \${contexto.recoveredCount} cliente(s) reactivado(s).\`;
  }

  if (q.includes('puntos') || q.includes('valor') || q.includes('premio')) {
    return \`Configuración actual de puntos: 1 punto por cada $\${contexto.puntosConfig.pointsPerCurrencyUnit} en compras. Cada punto equivale a $\${contexto.puntosConfig.currencyValuePerPoint} al ser canjeado.\`;
  }

  if (q.includes('reseña') || q.includes('review') || q.includes('opinión') || q.includes('calificacion')) {
    return \`Calificación media actual: \${contexto.promedioCalificacion}/5 con \${contexto.recentReviews.length} reseñas registradas recientemente.\`;
  }

  return \`Resumen de Fidelización: \${contexto.vipCustomers.length} VIPs, \${contexto.totalChurnCount} en riesgo de abandono y $\${contexto.recoveredRevenue.toLocaleString('es-CO')} recuperados por IA.\`;
}

export async function registrarAccionFidelizacion({
  businessId,
  accion,
  detalle,
}: {
  businessId: string;
  accion: string;
  detalle: string;
}) {
  return registrarAccionJev({
    businessId,
    modulo: 'fidelizacion',
    tipo: 'loyalty',
    accion,
    detalle,
    estado: 'completado',
  });
}
`;

fs.writeFileSync(enginePath, engineContent, 'utf8');
console.log(`[CREADO] ${enginePath}`);


// 3. CREAR src/jev/JevCopilotWidgetLoyalty.tsx (NUEVO)
const widgetPath = path.join('src', 'jev', 'JevCopilotWidgetLoyalty.tsx');
const widgetContent = `'use client';

import React, { useState, useTransition } from 'react';
import {
  obtenerCopilotoLoyalty,
  consultarJevLoyalty,
  CopilotoLoyaltyOutput,
} from './jevEngineLoyalty';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  X,
  Crown,
  Sparkles,
  Users,
  Send,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Info,
  DollarSign,
  Star,
  Brain,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JevWidgetLoyaltyProps {
  businessId?: string;
}

export function JevCopilotWidgetLoyalty({ businessId }: JevWidgetLoyaltyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<CopilotoLoyaltyOutput | null>(null);
  const [isLoading, startTransition] = useTransition();
  const [chatPregunta, setChatPregunta] = useState('');
  const [chatRespuesta, setChatRespuesta] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const { toast } = useToast();

  const cargarCopiloto = () => {
    if (!businessId) return;
    startTransition(async () => {
      try {
        const resultado = await obtenerCopilotoLoyalty(businessId);
        setData(resultado);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error JEV Fidelización',
          description: e.message || 'No se pudo cargar el análisis.',
        });
      }
    });
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!data) {
      cargarCopiloto();
    }
  };

  const handleConsultar = async (e?: React.FormEvent, preguntaFija?: string) => {
    if (e) e.preventDefault();
    const query = preguntaFija || chatPregunta;
    if (!query.trim() || !businessId) return;

    setIsAnswering(true);
    setChatRespuesta(null);
    try {
      const resp = await consultarJevLoyalty(businessId, query);
      setChatRespuesta(resp);
      if (!preguntaFija) setChatPregunta('');
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error de consulta',
        description: e.message || 'No se pudo obtener respuesta.',
      });
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <>
      {/* Botón flotante para abrir el panel */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleOpen}
            className="rounded-full shadow-2xl h-14 w-14 p-0 bg-primary hover:bg-primary/95 text-primary-foreground border-2 border-primary-foreground/20 hover:scale-105 transition-all"
            title="Abrir JEV Copiloto"
          >
            <Bot className="h-7 w-7 animate-pulse" />
          </Button>
        </div>
      )}

      {/* Panel Lateral Flotante */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[95vw] shadow-2xl rounded-2xl overflow-hidden border border-border bg-background animate-in slide-in-from-bottom-5">
          <Card className="border-0 shadow-none rounded-none">
            <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary-foreground/10 rounded-lg">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-1.5 text-primary-foreground">
                    JEV Copiloto
                    <Badge variant="secondary" className="text-[10px] uppercase font-black px-1.5 py-0">
                      Fidelización
                    </Badge>
                  </CardTitle>
                  <p className="text-[11px] text-primary-foreground/80">Inteligencia de Clientes y Churn</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cargarCopiloto}
                  disabled={isLoading}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <RefreshCw className={\`h-4 w-4 \${isLoading ? 'animate-spin' : ''}\`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {isLoading && !data ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground font-medium">Analizando inteligencia de fidelización...</p>
                </div>
              ) : (
                <>
                  {/* Banner de diagnóstico */}
                  {data?.diagnostico && (
                    <div className="p-3 bg-muted/60 rounded-xl border border-border text-xs flex gap-2.5 items-start">
                      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="leading-relaxed text-foreground">{data.diagnostico}</p>
                    </div>
                  )}

                  {/* Resumen Métricas Clave */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/40 p-2 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Clientes VIP</p>
                      <p className="text-base font-black text-primary">{data?.totalVip || 0}</p>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">En Riesgo</p>
                      <p className="text-base font-black text-destructive">{data?.totalEnRiesgo || 0}</p>
                    </div>
                    <div className="bg-muted/40 p-2 rounded-lg border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Reseñas</p>
                      <p className="text-base font-black text-amber-500 flex items-center justify-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-500" />
                        {data?.promedioResenas || '5.0'}
                      </p>
                    </div>
                  </div>

                  {/* Pestañas Preguntas / Memoria JEV */}
                  <Tabs defaultValue="preguntas" className="w-full">
                    <TabsList className="grid grid-cols-2 w-full h-8 text-[11px]">
                      <TabsTrigger value="preguntas">Preguntas</TabsTrigger>
                      <TabsTrigger value="memoria">Memoria JEV</TabsTrigger>
                    </TabsList>

                    {/* PESTAÑA 1: PREGUNTAS (CHAT IA) */}
                    <TabsContent value="preguntas" className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground">Consultas sugeridas:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            '¿Quiénes son los clientes VIP en riesgo?',
                            '¿Cuánto revenue ha recuperado la IA?',
                            '¿Cómo están las calificaciones y reseñas?',
                            '¿Cuál es el valor configurado de puntos?',
                          ].map((query, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleConsultar(undefined, query)}
                              disabled={isAnswering}
                              className="text-[11px] bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2.5 py-1 rounded-md text-left transition-colors"
                            >
                              {query}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Caja de respuesta */}
                      {isAnswering && (
                        <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center gap-2 text-xs">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>JEV está analizando los datos...</span>
                        </div>
                      )}

                      {chatRespuesta && !isAnswering && (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-xs space-y-1">
                          <p className="font-bold text-primary flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Respuesta de JEV:
                          </p>
                          <p className="text-foreground leading-relaxed">{chatRespuesta}</p>
                        </div>
                      )}

                      {/* Formulario de Pregunta */}
                      <form onSubmit={handleConsultar} className="flex gap-2 pt-1">
                        <Input
                          placeholder="Pregúntale a JEV sobre fidelización..."
                          value={chatPregunta}
                          onChange={(e) => setChatPregunta(e.target.value)}
                          disabled={isAnswering}
                          className="text-xs h-9"
                        />
                        <Button type="submit" size="sm" disabled={isAnswering || !chatPregunta.trim()} className="h-9 px-3">
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </TabsContent>

                    {/* PESTAÑA 2: MEMORIA JEV */}
                    <TabsContent value="memoria" className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <Brain className="h-4 w-4 text-primary" />
                          <span>Aprendizaje y Memoria Histórica</span>
                        </div>
                        {data?.patronesAprendidos && data.patronesAprendidos.length > 0 ? (
                          <div className="space-y-2">
                            {data.patronesAprendidos.map((patron, i) => (
                              <div key={i} className="p-2.5 bg-muted/40 border border-border rounded-lg text-xs flex gap-2">
                                <span className="text-primary font-bold">✓</span>
                                <span className="text-foreground">{patron}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            Sin historial de aprendizajes previos en memoria.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
`;

fs.writeFileSync(widgetPath, widgetContent, 'utf8');
console.log(`[CREADO] ${widgetPath}`);


// 4. MODIFICAR src/actions/loyalty.ts (EXISTENTE - RESPALDO .bak)
const loyaltyActionsPath = path.join('src', 'actions', 'loyalty.ts');
backupFile(loyaltyActionsPath);

let loyaltyActionsContent = fs.readFileSync(loyaltyActionsPath, 'utf8');

// A. Agregar import de jevLimitsService si no existe
if (!loyaltyActionsContent.includes('getJevCopilotLimitsInfo')) {
  loyaltyActionsContent = `import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from '@/jev/jevLimitsService';\n` + loyaltyActionsContent;
  console.log('[MODIFICADO ADITIVO] Import jevLimitsService agregado a loyalty.ts');
}

// B. Envolver bulkRecoverChurnClients con validación de límite
const targetFuncHeader = 'export async function bulkRecoverChurnClients(businessId: string) {';
if (loyaltyActionsContent.includes(targetFuncHeader) && !loyaltyActionsContent.includes('// Verificación de límite JEV Copiloto (Loyalty)')) {
  const replacement = `export async function bulkRecoverChurnClients(businessId: string) {
  // Verificación de límite JEV Copiloto (Loyalty)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return { success: false, error: "El módulo JEV Copiloto no está activo para el plan actual de este negocio." };
  }
  if (!limitsInfo.canConsume) {
    return { 
      success: false, 
      limitReached: true,
      error: \`Has alcanzado el límite diario de consultas (\${limitsInfo.usageToday}/\${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana.\` 
    };
  }
  await consumeJevCopilotCredit(businessId);`;

  loyaltyActionsContent = loyaltyActionsContent.replace(targetFuncHeader, replacement);
  fs.writeFileSync(loyaltyActionsPath, loyaltyActionsContent, 'utf8');
  console.log('[MODIFICADO ADITIVO] bulkRecoverChurnClients protegido con límites y consumo atómico');
} else {
  console.log('[INFO] bulkRecoverChurnClients ya cuenta con la verificación de límites');
}


// 5. MODIFICAR src/components/admin/loyalty/ChurnRiskCard.tsx (EXISTENTE - RESPALDO .bak)
const churnCardPath = path.join('src', 'components', 'admin', 'loyalty', 'ChurnRiskCard.tsx');
backupFile(churnCardPath);

let churnCardContent = fs.readFileSync(churnCardPath, 'utf8');
if (!churnCardContent.includes('result.limitReached')) {
  // Mejorar el manejo de error para distinguir límite alcanzado
  churnCardContent = churnCardContent.replace(
    'title: "Error al enviar",',
    'title: result.limitReached ? "Límite diario alcanzado" : "Error al enviar",'
  );
  fs.writeFileSync(churnCardPath, churnCardContent, 'utf8');
  console.log('[MODIFICADO ADITIVO] ChurnRiskCard actualizado para mostrar mensaje de límite');
}


// 6. MODIFICAR src/app/(dashboard)/dashboard/loyalty/page.tsx (EXISTENTE - RESPALDO .bak)
const loyaltyPagePath = path.join('src', 'app', '(dashboard)', 'dashboard', 'loyalty', 'page.tsx');
backupFile(loyaltyPagePath);

let loyaltyPageContent = fs.readFileSync(loyaltyPagePath, 'utf8');

// A. Agregar import del widget
if (!loyaltyPageContent.includes('JevCopilotWidgetLoyalty')) {
  loyaltyPageContent = `import { JevCopilotWidgetLoyalty } from '@/jev/JevCopilotWidgetLoyalty';\n` + loyaltyPageContent;
  console.log('[MODIFICADO ADITIVO] Import JevCopilotWidgetLoyalty agregado a loyalty/page.tsx');
}

// B. Renderizar el widget al final de la página (antes del último cierre de div)
if (!loyaltyPageContent.includes('<JevCopilotWidgetLoyalty')) {
  const lastDivIndex = loyaltyPageContent.lastIndexOf('</div>');
  if (lastDivIndex !== -1) {
    const injected = `      <JevCopilotWidgetLoyalty businessId={user?.uid} />\n    `;
    loyaltyPageContent = loyaltyPageContent.slice(0, lastDivIndex) + injected + loyaltyPageContent.slice(lastDivIndex);
    fs.writeFileSync(loyaltyPagePath, loyaltyPageContent, 'utf8');
    console.log('[MODIFICADO ADITIVO] <JevCopilotWidgetLoyalty /> montado en loyalty/page.tsx');
  }
} else {
  console.log('[INFO] JevCopilotWidgetLoyalty ya estaba montado en loyalty/page.tsx');
}

console.log('\n=== IMPLEMENTACIÓN FINALIZADA CON ÉXITO ===');
