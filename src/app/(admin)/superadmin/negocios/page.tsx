'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Building2, 
  Eye, 
  Puzzle, 
  Tag, 
  TrendingUp, 
  Mail, 
  User, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  Trash2, 
  Smartphone, 
  ScanLine, 
  Calculator, 
  Package, 
  CalendarCheck,
  LogIn,
  Store
} from 'lucide-react';
import { cn, normalizeModuleId } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Import models
import type { Business, EntityStatus } from '@/models/business';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import { Module, DEFAULT_MODULES } from '@/models/module';
import type { HybridPlan } from '@/models/hybrid-plan';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '@/components/icons';

type ModuleState = { active: boolean; isAddon: boolean; isPlanDefault: boolean };

const LEGACY_MODULE_ALIASES: Record<string, string> = {
  'chatbot-de-soporte-whatsapp': 'whapi-whatsapp',
  'chatbot-integrado-con-whatsapp-para-soporte-y-ventas': 'whapi-whatsapp',
  'api-whatsapp': 'whapi-whatsapp',
  'whatsapp': 'whapi-whatsapp'
};

const getCanonicalModuleId = (id: string) => {
  const normalized = normalizeModuleId(id);
  return LEGACY_MODULE_ALIASES[normalized] || normalized;
};

const iconMap: { [key: string]: React.ReactNode } = {
  catalogo: <Building2 className="w-4 h-4 text-blue-600" />,
  'whapi-whatsapp': <WhatsAppIcon className="w-4 h-4 text-green-600" />,
  'ycloud-whatsapp': <Smartphone className="w-4 h-4 text-primary" />,
  promotions: <Tag className="w-4 h-4 text-orange-600" />,
  loyalty: <Sparkles className="w-4 h-4 text-amber-600" />,
  contabilidad: <Calculator className="w-4 h-4 text-slate-600" />,
  'inventario-kardex': <Package className="w-4 h-4 text-indigo-600" />,
  'pistola-escaner': <ScanLine className="w-4 h-4 text-purple-600" />,
  'motor-de-sugerencias-inteligentes': <Sparkles className="w-4 h-4 text-yellow-600" />,
  'reservas-agendamiento': <CalendarCheck className="w-4 h-4 text-red-600" />,
  default: <Puzzle className="w-4 h-4 text-gray-400" />,
};

const resourceLabels: Record<string, string> = {
    products: 'Productos',
    blogPosts: 'Posts Blog',
    landingPages: 'Landing Pages',
    promotions: 'Promociones',
    coupons: 'Cupones',
    orders: 'Pedidos / mes',
    suggestions: 'Sugerencias',
};

const StatusBadge = ({ status }: { status: EntityStatus | string | undefined }) => {
  if (!status) return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pendiente</Badge>;
  const currentStatus = status.toLowerCase();
  const config: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  return <Badge variant="outline" className={cn('capitalize font-bold', config[currentStatus] || config.inactive)}>{currentStatus.replace('_', ' ')}</Badge>;
};

const ActivityBadge = ({ status }: { status: string | undefined }) => {
    const config: Record<string, string> = {
        active: 'bg-green-100 text-green-800 border-green-200',
        at_risk: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        dormant: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels: Record<string, string> = { active: 'Activo', at_risk: 'En Riesgo', dormant: 'Inactivo' };
    return <Badge variant="outline" className={cn('capitalize font-bold', config[status || ''] || 'bg-gray-50 text-gray-500 border-gray-200')}>{labels[status || ''] || 'Sin datos'}</Badge>;
};

export default function BusinessesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(useMemoFirebase(() => collection(firestore, 'businesses'), [firestore]));
  const { data: plans } = useCollection<SubscriptionPlan>(useMemoFirebase(() => collection(firestore, 'plans'), [firestore]));
  const { data: hybridPlans } = useCollection<HybridPlan>(useMemoFirebase(() => collection(firestore, 'hybrid_plans'), [firestore]));
  const { data: modules } = useCollection<Module>(useMemoFirebase(() => collection(firestore, 'modules'), [firestore]));

  const allPlans = useMemo(() => [...(plans || []), ...(hybridPlans || [])], [plans, hybridPlans]);

  const displayedModules = useMemo(() => {
      const modulesMap = new Map<string, Module>();
      DEFAULT_MODULES.forEach(dm => modulesMap.set(dm.id, { ...dm, status: 'active', createdAt: new Date().toISOString() } as Module));
      (modules || []).forEach(m => {
          const canonicalId = getCanonicalModuleId(m.id);
          if (!modulesMap.has(canonicalId)) modulesMap.set(canonicalId, { ...m, id: canonicalId });
      });
      return Array.from(modulesMap.values());
  }, [modules]);

  const [searchBusiness, setSearchBusiness] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  
  const [businessModulesState, setBusinessModulesState] = useState<Record<string, ModuleState>>({});
  const [moduleExtras, setModuleExtras] = useState<Record<string, number>>({});
  const [limitesExtra, setLimitesExtra] = useState<Record<string, number>>({
    products: 0, blogPosts: 0, landingPages: 0, promotions: 0, coupons: 0, orders: 0, suggestions: 0,
  });
  
  const [businessForm, setBusinessForm] = useState({ name: '', ownerName: '', ownerEmail: '', planId: '' });

  const filteredBusinesses = useMemo(() => {
    return (businesses || []).filter(b => {
      const searchMatch = !searchBusiness || b.name.toLowerCase().includes(searchBusiness.toLowerCase()) || b.ownerEmail.toLowerCase().includes(searchBusiness.toLowerCase());
      const planMatch = filterPlan === 'all' || b.planName === allPlans.find(p => p.id === filterPlan)?.name;
      const statusMatch = filterStatus === 'all' || b.status === filterStatus;
      return searchMatch && planMatch && statusMatch;
    });
  }, [businesses, searchBusiness, filterPlan, filterStatus, allPlans]);

  const handleToggleStatus = async (business: Business, checked: boolean) => {
    if (!firestore) return;
    try {
      await updateDocumentNonBlocking(doc(firestore, 'businesses', business.id), { status: checked ? 'active' : 'inactive' });
      toast({ title: checked ? "Negocio Activado" : "Negocio Desactivado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const openManageBusiness = async (business: Business) => {
    setIsManaging(true);
    try {
        const subSnap = await getDoc(doc(firestore, `businesses/${business.id}/subscription`, 'current'));
        const subData = subSnap.exists() ? subSnap.data() : null;
        const currentPlan = allPlans.find(p => p.id === subData?.plan || p.name === business.planName) || allPlans[0];

        setSelectedBusiness({ ...business, planName: currentPlan?.name || business.planName });
        
        const modulesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/modules`));
        const extras: Record<string, number> = {};
        const initialState: Record<string, ModuleState> = {};
        
        const planModules = (currentPlan as any)?.includedModuleKeys?.map((k: string) => getCanonicalModuleId(k)) || [];

        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            initialState[cleanId] = { active: data.status === 'active', isAddon: data.isAddon === true, isPlanDefault: planModules.includes(cleanId) };
            if (data.extra !== undefined) extras[cleanId] = data.extra;
        });
        
        setBusinessModulesState(initialState);
        setModuleExtras(extras);
        setLimitesExtra((business as any).limitesExtra || { products: 0, blogPosts: 0, landingPages: 0, promotions: 0, coupons: 0, orders: 0, suggestions: 0 });
        setShowManageModal(true);
    } catch (e) {
        console.error(e);
    } finally {
        setIsManaging(false);
    }
  };
  
  const handleSaveManageBusiness = async () => {
    if (!selectedBusiness || !firestore) return;
    setIsSavingChanges(true);
    try {
        const batch = writeBatch(firestore);
        const businessRef = doc(firestore, 'businesses', selectedBusiness.id);
        batch.update(businessRef, { status: selectedBusiness.status, planName: selectedBusiness.planName, limitesExtra, updatedAt: new Date().toISOString() });
        
        for (const [modId, state] of Object.entries(businessModulesState)) {
            const modRef = doc(firestore, `businesses/${selectedBusiness.id}/modules`, modId);
            batch.set(modRef, { id: modId, status: state.active ? 'active' : 'inactive', isAddon: state.isAddon, extra: moduleExtras[modId] || 0, updatedAt: new Date().toISOString() }, { merge: true });
        }

        await batch.commit();
        toast({ title: "Cambios guardados con éxito" });
        setShowManageModal(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error al guardar' });
    } finally {
        setIsSavingChanges(false);
    }
  };

  const toggleModuleAssignment = (moduleId: string) => {
    setBusinessModulesState(prev => {
        const current = prev[moduleId] || { active: false, isAddon: true, isPlanDefault: false };
        return { ...prev, [moduleId]: { ...current, active: !current.active } };
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black tracking-tight">Gestión de Negocios</CardTitle>
              <CardDescription>Control centralizado de inquilinos y sus suscripciones.</CardDescription>
            </div>
            <Button onClick={() => setShowBusinessModal(true)} className="font-bold shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Agregar Negocio
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar negocios..." value={searchBusiness} onChange={e => setSearchBusiness(e.target.value)} className="pl-10 h-11" />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Todos los planes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            {allPlans.map(p => <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase">Negocio</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Plan</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Actividad</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Estado</TableHead>
                <TableHead className="font-bold text-[10px] uppercase">Teléfono</TableHead>
                <TableHead className="font-bold text-[10px] uppercase text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessesLoading ? (
                <TableRow><TableCell colSpan={6} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : filteredBusinesses.map(b => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary"><Store className="w-4 h-4" /></div>
                      <div className="flex flex-col"><span className="font-bold text-sm">{b.name}</span><span className="text-[10px] text-muted-foreground">{b.ownerEmail}</span></div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-bold">{b.planName}</Badge></TableCell>
                  <TableCell><ActivityBadge status={b.activityStatus} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={b.status} />
                      <Switch checked={b.status === 'active'} onCheckedChange={(c) => handleToggleStatus(b, c)} />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{b.phone || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openManageBusiness(b)} className="font-bold"><Eye className="w-3 h-3 mr-1.5" /> Gestionar</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 font-bold"><LogIn className="w-3 h-3 mr-1.5" /> Ingresar</Button>
                    <Button size="sm" variant="destructive" className="font-bold" onClick={() => deleteDocumentNonBlocking(doc(firestore!, 'businesses', b.id))}><Trash2 className="w-3 h-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <ShieldCheck className="text-green-600 w-6 h-6" /> Gestionar Negocio
            </DialogTitle>
            <DialogDescription>{selectedBusiness?.name} - Valida características y permisos del plan</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-8 py-4">
            <Card className="bg-muted/30 border-none shadow-none">
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5"><User className="w-4 h-4" /> Propietario</Label>
                  <p className="font-bold text-sm truncate">{selectedBusiness?.ownerName || selectedBusiness?.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5"><Mail className="w-4 h-4" /> Email Principal</Label>
                  <p className="font-medium text-sm truncate">{selectedBusiness?.ownerEmail}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Plan de Suscripción</Label>
                  <Select value={selectedBusiness?.planName} onValueChange={(v) => setSelectedBusiness(prev => prev ? {...prev, planName: v} : null)}>
                    <SelectTrigger className="h-8 font-bold text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{allPlans.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Estado</Label>
                  <Select value={selectedBusiness?.status} onValueChange={(v: EntityStatus) => setSelectedBusiness(prev => prev ? {...prev, status: v} : null)}>
                    <SelectTrigger className="h-8 font-bold text-xs bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Inactivo</SelectItem></SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2 text-gray-800"><Puzzle className="w-5 h-5 text-green-600" /> Módulos y Herramientas</h3>
              <div className="flex flex-col gap-4">
                {displayedModules.map(mod => {
                  const state = businessModulesState[mod.id] || { active: false, isAddon: true, isPlanDefault: false };
                  const extra = moduleExtras[mod.id] || 0;
                  const base = mod.limit === -1 ? '∞' : (mod.limit || 0);
                  const total = mod.limit === -1 ? '∞' : (mod.limit || 0) + extra;
                  return (
                    <Card key={mod.id} className={cn("transition-all border-2", state.active ? "border-primary/20 bg-primary/5" : "border-muted opacity-60")}>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-background rounded-xl border shadow-sm">{iconMap[mod.id] || iconMap.default}</div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-gray-900">{mod.name}</span>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn("text-[9px] font-black uppercase", state.isPlanDefault ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700")}>{state.isPlanDefault ? 'Incluido en Plan' : 'Add-on'}</Badge>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{state.active ? 'ACTIVE (NEGOCIO)' : 'INACTIVE (NEGOCIO)'}</span>
                                </div>
                            </div>
                          </div>
                          <Switch checked={state.active} onCheckedChange={() => toggleModuleAssignment(mod.id)} />
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-dashed">
                            <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-muted-foreground">Límite Base</Label><div className="h-9 flex items-center px-3 bg-muted rounded-md font-bold text-sm">{base}</div></div>
                            <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-muted-foreground">Extra (+)</Label><Input type="number" value={extra} onChange={e => setModuleExtras(prev => ({...prev, [mod.id]: Number(e.target.value)}))} className="h-9 font-bold bg-white" disabled={!state.active} /></div>
                            <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-muted-foreground">Total Real</Label><div className="h-9 flex items-center px-3 bg-green-100 text-green-800 rounded-md font-black text-sm">{total}</div></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                <TrendingUp className="w-5 h-5 text-green-600" /> Capacidades y Límites Adicionales
              </h3>
              <div className="flex flex-col gap-3">
                {Object.keys(resourceLabels).map(key => {
                  const planDetails = allPlans.find(p => p.name === selectedBusiness?.planName || p.id === selectedBusiness?.planName);
                  const base = (planDetails?.limits as any)?.[key] ?? 0;
                  const extra = limitesExtra[key] || 0;
                  const total = base === -1 ? '∞' : base + extra;
                  
                  return (
                    <div key={key} className="flex flex-col md:flex-row items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:border-primary/20 group">
                      <div className="flex items-center gap-3 w-full md:w-auto mb-4 md:mb-0">
                        <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-gray-800">{resourceLabels[key]}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 w-full md:w-[420px]">
                        <div className="space-y-1 text-center">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Base Plan</Label>
                          <div className="h-9 flex items-center justify-center bg-muted/50 rounded-lg font-bold text-xs border border-transparent">
                            {base === -1 ? '∞' : base}
                          </div>
                        </div>
                        
                        <div className="space-y-1 text-center">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Aumento</Label>
                          <Input 
                            type="number" 
                            value={extra} 
                            onChange={e => setLimitesExtra(prev => ({...prev, [key]: Number(e.target.value)}))} 
                            className="h-9 text-center font-bold bg-white border-gray-200 focus-visible:ring-primary/30" 
                          />
                        </div>

                        <div className="space-y-1 text-center">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Final</Label>
                          <div className={cn(
                            "h-9 flex items-center justify-center rounded-lg font-black text-sm border shadow-sm transition-all",
                            total === base 
                              ? "bg-muted/20 text-muted-foreground border-transparent" 
                              : "bg-green-50 text-green-700 border-green-200"
                          )}>
                            {total}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <DialogFooter className="bg-muted/50 -mx-6 -mb-6 p-6 border-t">
            <Button variant="ghost" onClick={() => setShowManageModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveManageBusiness} disabled={isSavingChanges} className="font-black shadow-lg">
              {isSavingChanges && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Configuración de Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
