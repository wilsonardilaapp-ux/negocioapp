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
  SelectGroup,
  SelectLabel,
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
import { Check, Plus, Search, Building2, Eye, Puzzle, Tag, AlertCircle, TrendingUp, Mail, User, ShieldCheck, Loader2, Sparkles, Trash2, Clock, Smartphone, ScanLine, Calculator, Package } from 'lucide-react';
import { cn, normalizeModuleId } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { validateModuleExtra, validateLimitesExtra } from '@/utils/validateModuleExtra';

// Import models
import type { Business, EntityStatus } from '@/models/business';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { SystemService } from '@/models/system-service';
import { Module, DEFAULT_MODULES } from '@/models/module';
import type { HybridPlan } from '@/models/hybrid-plan';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '@/components/icons';

type ModuleState = { active: boolean; isAddon: boolean; isPlanDefault: boolean };

const iconMap: { [key: string]: React.ReactNode } = {
  catalogo: <Building2 className="w-4 h-4" />,
  'chatbot-integrado-con-whatsapp-para-soporte-y-ventas': <WhatsAppIcon className="w-4 h-4" />,
  'ycloud-whatsapp': <Smartphone className="w-4 h-4" />,
  promotions: <Tag className="w-4 h-4" />,
  loyalty: <Sparkles className="w-4 h-4" />,
  contabilidad: <Calculator className="w-4 h-4" />,
  'inventario-kardex': <Package className="w-4 h-4" />,
  'pistola-escaner': <ScanLine className="w-4 h-4" />,
  default: <Puzzle className="w-4 h-4" />,
};

const StatusBadge = ({ status }: { status: EntityStatus | string | undefined }) => {
  if (!status) {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
        Pendiente
      </Badge>
    );
  }
  
  const currentStatus = status.toLowerCase();
  
  const statusConfig: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    activo: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    inactivo: 'bg-gray-100 text-gray-800 border-gray-200',
    suspended: 'bg-red-100 text-red-800 border-red-200',
    suspendido: 'bg-red-100 text-red-800 border-red-200',
    pending_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const label: Record<string, string> = {
    active: 'Activo',
    activo: 'Activo',
    inactive: 'Inactivo',
    inactivo: 'Inactivo',
    suspended: 'Suspendido',
    suspendido: 'Suspendido',
    pending_payment: 'Pago Pendiente',
  };

  return (
    <Badge variant="outline" className={cn('capitalize font-medium', statusConfig[currentStatus] || statusConfig.inactive)}>
      {label[currentStatus] || currentStatus.replace('_', ' ')}
    </Badge>
  );
};

const ActivityBadge = ({ status }: { status: string | undefined }) => {
    if (!status) {
        return (
            <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 font-medium">
                Sin datos
            </Badge>
        );
    }
    
    const config: Record<string, string> = {
        active: 'bg-green-100 text-green-800 border-green-200',
        at_risk: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        dormant: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels: Record<string, string> = {
        active: 'Activo',
        at_risk: 'En Riesgo',
        dormant: 'Inactivo',
    };

    return (
        <Badge variant="outline" className={cn('capitalize font-medium', config[status] || 'bg-gray-100 text-gray-800 border-gray-200')}>
            {labels[status] || status.replace('_', ' ')}
        </Badge>
    );
};

export default function BusinessesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Data fetching
  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(useMemoFirebase(() => collection(firestore, 'businesses'), [firestore]));
  const { data: plans } = useCollection<SubscriptionPlan>(useMemoFirebase(() => collection(firestore, 'plans'), [firestore]));
  const { data: hybridPlans } = useCollection<HybridPlan>(useMemoFirebase(() => collection(firestore, 'hybrid_plans'), [firestore]));
  const { data: services } = useCollection<SystemService>(useMemoFirebase(() => collection(firestore, 'systemServices'), [firestore]));
  const { data: modules } = useCollection<Module>(useMemoFirebase(() => collection(firestore, 'modules'), [firestore]));

  // Unify all available plans for easy lookup with origin tracking
  const allPlans = useMemo(() => [
    ...(plans || []).map(p => ({ ...p, origin: 'standard' as const })),
    ...(hybridPlans || []).map(p => ({ ...p, origin: 'hybrid' as const }))
  ], [plans, hybridPlans]);

  // NUEVO: displayedModules combinando Firestore con los módulos del sistema para asegurar visibilidad constante de YCloud y otros
  const displayedModules = useMemo(() => {
      const dbModules = modules || [];
      const modulesMap = new Map<string, Module>();

      // 1. Inyectar módulos del sistema (fuente de verdad absoluta)
      DEFAULT_MODULES.forEach(dm => {
          modulesMap.set(dm.id, {
              id: dm.id,
              name: dm.name,
              description: dm.description,
              limit: dm.limit,
              status: 'active',
              createdAt: new Date().toISOString()
          } as Module);
      });

      // 2. Mezclar con módulos reales de la DB (sobreescribe si existe para capturar personalizaciones de Super Admin)
      dbModules.forEach(m => {
          modulesMap.set(normalizeModuleId(m.id), m);
      });

      return Array.from(modulesMap.values());
  }, [modules]);

  // Filter State
  const [searchBusiness, setSearchBusiness] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [isSavingChanges, setIsSavingChanges] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  
  // Status Toggle State
  const [businessToDeactivate, setBusinessToDeactivate] = useState<Business | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // Modules Enriched State
  const [businessModulesState, setBusinessModulesState] = useState<Record<string, ModuleState>>({});
  const [moduleExtras, setModuleExtras] = useState<Record<string, number>>({});
  const [assignedServices, setAssignedServices] = useState<string[]>([]);

  // Limits Extra State
  const [limitesExtra, setLimitesExtra] = useState<Record<string, number>>({
    products: 0,
    blogPosts: 0,
    landingPages: 0,
    promotions: 0,
    coupons: 0,
    orders: 0,
    suggestions: 0,
  });
  const [currentPlanLimits, setCurrentPlanLimits] = useState<Record<string, number>>({});
  const [nextPlanLimits, setNextPlanLimits] = useState<Record<string, number> | null>(null);
  const [nextPlanName, setNextPlanName] = useState<string>('');
  
  const initialFormState = {
    name: '', ownerName: '', ownerEmail: '', phone: '', address: '', planId: '', status: 'active' as EntityStatus
  };
  const [businessForm, setBusinessForm] = useState(initialFormState);

  const filteredBusinesses = useMemo(() => {
    return (businesses || []).filter(business => {
      const searchMatch = searchBusiness === '' ||
        business.name.toLowerCase().includes(searchBusiness.toLowerCase()) ||
        (business.ownerName && business.ownerName.toLowerCase().includes(searchBusiness.toLowerCase())) ||
        (business.ownerEmail && business.ownerEmail.toLowerCase().includes(searchBusiness.toLowerCase()));
      
      const matchedPlan = allPlans.find(p => p.id === business.planName || p.name === business.planName || ('slug' in p && p.slug === business.planName));
      const planNameForFilter = matchedPlan?.id || business.planName || 'WxZYuL7JwmkSKBXGn1QZ';
      
      const planMatch = filterPlan === 'all' || planNameForFilter === filterPlan;
      const statusMatch = filterStatus === 'all' || business.status === filterStatus;
      
      return searchMatch && planMatch && statusMatch;
    });
  }, [businesses, searchBusiness, filterPlan, filterStatus, allPlans]);

  const handleSaveBusiness = async () => {
    if (!businessForm.name || !businessForm.ownerName || !businessForm.ownerEmail || !businessForm.planId) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }
    const selectedPlan = allPlans.find(p => p.id === businessForm.planId);
    const newBusinessRef = doc(collection(firestore, 'businesses'));
    const newBusiness: Omit<Business, 'id'> = {
      ...businessForm,
      planName: selectedPlan?.name || businessForm.planId,
      logoURL: 'https://seeklogo.com/images/E/eco-friendly-logo-7087A22106-seeklogo.com.png',
      description: 'Bienvenido a Zentry',
    };
    await setDocumentNonBlocking(newBusinessRef, newBusiness);
    setBusinessForm(initialFormState);
    setShowBusinessModal(false);
  };

  const handleDeleteBusiness = async (businessId: string) => {
    if (!firestore) return;
    try {
      await deleteDocumentNonBlocking(doc(firestore, 'businesses', businessId));
      toast({
        title: "Negocio Eliminado",
        description: "El negocio ha sido eliminado permanentemente del sistema.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el negocio.",
      });
    }
  };

  const handleToggleStatus = async (business: Business, checked: boolean) => {
    if (!firestore) return;
    
    if (!checked) {
      setBusinessToDeactivate(business);
      setIsStatusDialogOpen(true);
    } else {
      try {
        const businessRef = doc(firestore, 'businesses', business.id);
        await updateDocumentNonBlocking(businessRef, { status: 'active' });
        toast({
          title: "Negocio Activado",
          description: `${business.name} ahora tiene acceso a la plataforma.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo activar el negocio.",
        });
      }
    }
  };

  const confirmDeactivate = async () => {
    if (!businessToDeactivate || !firestore) return;
    try {
      const businessRef = doc(firestore, 'businesses', businessToDeactivate.id);
      await updateDocumentNonBlocking(businessRef, { status: 'inactive' });
      toast({
        title: "Negocio Desactivado",
        description: `Se ha bloqueado el acceso a ${businessToDeactivate.name}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo desactivar el negocio.",
      });
    } finally {
      setIsStatusDialogOpen(false);
      setBusinessToDeactivate(null);
    }
  };

  const openManageBusiness = async (business: Business) => {
    setIsManaging(true);
    try {
        const subSnap = await getDoc(doc(firestore, `businesses/${business.id}/subscription`, 'current'));
        const subData = subSnap.exists() ? subSnap.data() as any : null;
        
        const actualPlanId = (subData?.status === 'active' ? subData.plan : null) || business.planName || 'WxZYuL7JwmkSKBXGn1QZ';
        const currentPlanDetails = allPlans.find(p => p.id === actualPlanId || p.name === actualPlanId || ('slug' in p && p.slug === actualPlanId));
        const resolvedPlanName = currentPlanDetails?.name || business.planName || 'Plan Crecimiento';
        const planModules = (currentPlanDetails as any)?.includedModuleKeys?.map((k: string) => normalizeModuleId(k)) || [];

        if (business.planName !== resolvedPlanName) {
            updateDocumentNonBlocking(doc(firestore, 'businesses', business.id), { planName: resolvedPlanName });
        }

        setSelectedBusiness({ 
            ...business, 
            status: business.status || subData?.status || 'active', 
            ownerName: business.ownerName || business.name || 'Propietario',
            ownerEmail: business.ownerEmail || business.contactEmail || 'N/A',
            planName: resolvedPlanName,
            imageLimit: business.imageLimit ?? undefined,
            productLimit: business.productLimit ?? undefined 
        });
        
        const modulesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/modules`));
        const extras: Record<string, number> = {};
        
        // Inicializar con el Plan
        const initialState: Record<string, ModuleState> = {};
        planModules.forEach((id: string) => {
          initialState[id] = { active: true, isAddon: false, isPlanDefault: true };
        });

        // Corregir con la subcolección
        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = normalizeModuleId(doc.id);
            const isAddon = data.isAddon === true;
            const isPlanDefault = planModules.includes(cleanId);
            
            initialState[cleanId] = {
              active: data.status === 'active',
              isAddon: isAddon,
              isPlanDefault: isPlanDefault
            };
            
            if (data.extra !== undefined) {
              extras[cleanId] = data.extra;
            }
        });
        
        setBusinessModulesState(initialState);
        setModuleExtras(extras);

        const servicesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/services`));
        setAssignedServices(servicesSnapshot.docs.filter(doc => doc.data().status === 'active').map(doc => doc.id));

        if (currentPlanDetails && 'limits' in currentPlanDetails) {
            setCurrentPlanLimits(currentPlanDetails.limits);
            const tiers = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
            const currentTierId = currentPlanDetails.id?.toUpperCase() || '';
            const tierIndex = tiers.findIndex(t => currentTierId.includes(t));
            
            if (tierIndex !== -1 && tierIndex < tiers.length - 1) {
                const nextTierId = tiers[tierIndex + 1];
                const nextPlan = plans?.find(p => p.id.toUpperCase().includes(nextTierId));
                if (nextPlan) {
                    setNextPlanLimits(nextPlan.limits);
                    setNextPlanName(nextPlan.name);
                } else {
                    setNextPlanLimits(null);
                }
            } else {
                setNextPlanLimits(null);
            }
        }

        const businessDoc = business as any;
        if (businessDoc?.limitesExtra) {
            setLimitesExtra({
                products: businessDoc.limitesExtra.products || 0,
                blogPosts: businessDoc.limitesExtra.blogPosts || 0,
                landingPages: businessDoc.limitesExtra.landingPages || 0,
                promotions: businessDoc.limitesExtra.promotions || 0,
                coupons: businessDoc.limitesExtra.coupons || 0,
                orders: businessDoc.limitesExtra.orders || 0,
                suggestions: businessDoc.limitesExtra.suggestions || 0,
            });
        } else {
            setLimitesExtra({ products: 0, blogPosts: 0, landingPages: 0, promotions: 0, coupons: 0, orders: 0, suggestions: 0 });
        }
        
        setShowManageModal(true);
    } catch (e) {
        console.error("Error al abrir gestión de negocio:", e);
    } finally {
        setIsManaging(false);
    }
  };
  
  const handleSaveManageBusiness = async () => {
    if (!selectedBusiness || !firestore) return;
    setIsSavingChanges(true);

    try {
        const batch = writeBatch(firestore);

        // Validar límites extras
        for (const [moduleId, state] of Object.entries(businessModulesState)) {
          if (!state.active) continue;
          const extra = moduleExtras[moduleId] || 0;
          const validation = validateModuleExtra(selectedBusiness.planName, extra);
          if (!validation.valid) throw new Error(`Error en módulo ${moduleId}: ${validation.error}`);
        }

        const validation = validateLimitesExtra(nextPlanName || 'Superior', currentPlanLimits, nextPlanLimits, limitesExtra);
        if (!validation.valid) throw new Error(`Error en Límites Extra:\n${Object.values(validation.errors).join('\n')}`);
        
        const businessRef = doc(firestore, 'businesses', selectedBusiness.id);
        const businessUpdateData: any = {
          status: selectedBusiness.status,
          planName: selectedBusiness.planName,
          imageLimit: selectedBusiness.imageLimit ? Number(selectedBusiness.imageLimit) : null,
          productLimit: selectedBusiness.productLimit ? Number(selectedBusiness.productLimit) : null,
          limitesExtra: limitesExtra
        };
        batch.update(businessRef, businessUpdateData);

        const currentPlan = allPlans.find(p => p.name === selectedBusiness.planName || p.id === selectedBusiness.planName || ('slug' in p && p.slug === selectedBusiness.planName));
        const planIdToSync = currentPlan?.id || 'WxZYuL7JwmkSKBXGn1QZ';
        
        const subscriptionRef = doc(firestore, `businesses/${selectedBusiness.id}/subscription`, 'current');
        batch.set(subscriptionRef, {
            plan: planIdToSync,
            status: 'active',
            updatedAt: Timestamp.now()
        }, { merge: true });
        
        // PERSISTENCIA UNIFICADA Y OBLIGATORIA (FASE 3.1)
        // 1. Crear un Set con todos los IDs relevantes para no dejar huérfanos
        const allModuleIds = new Set<string>();
        displayedModules.forEach(m => allModuleIds.add(normalizeModuleId(m.id)));
        Object.keys(businessModulesState).forEach(id => allModuleIds.add(id));
        
        // 2. Iterar y grabar estado explícito para cada uno
        allModuleIds.forEach(moduleId => {
            const state = businessModulesState[moduleId];
            const extra = moduleExtras[moduleId] || 0;
            const currentPlanDetails = allPlans.find(p => p.name === selectedBusiness.planName || p.id === selectedBusiness.planName || ('slug' in p && p.slug === selectedBusiness.planName));
            const planModules = (currentPlanDetails as any)?.includedModuleKeys?.map((k: string) => normalizeModuleId(k)) || [];
            const isIncludedInPlan = planModules.includes(moduleId);
            
            // Decisión de guardado: Add-on o Discrepancia con el Plan
            if (state) {
              const isCurrentlyActive = state.active;
              
              // Persistencia obligatoria si es Add-on o si el estado difiere del plan (para guardar el 'inactive' físico)
              if (!isIncludedInPlan || (isIncludedInPlan && !isCurrentlyActive)) {
                batch.set(doc(firestore, `businesses/${selectedBusiness.id}/modules`, moduleId), { 
                  status: isCurrentlyActive ? 'active' : 'inactive', 
                  isAddon: !isIncludedInPlan,
                  extra,
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              }
            }
        });
        
        const currentServices = await getDocs(collection(firestore, `businesses/${selectedBusiness.id}/services`));
        currentServices.forEach(sDoc => batch.update(sDoc.ref, { status: 'inactive' }));
        assignedServices.forEach(id => {
            batch.set(doc(firestore, `businesses/${selectedBusiness.id}/services`, id), { status: 'active' }, { merge: true });
        });

        await batch.commit();
        toast({ title: "Cambios guardados", description: `Se ha sincronizado el perfil de ${selectedBusiness.name}.` });
        setShowManageModal(false);
    } catch (e: any) {
        console.error("Error al guardar gestión de negocio:", e);
        toast({ variant: 'destructive', title: 'No se pudo guardar', description: e.message || 'Ocurrió un error inesperado.' });
    } finally {
        setIsSavingChanges(false);
    }
  };
  
  const toggleModuleAssignment = (moduleId: string) => {
    const cleanId = normalizeModuleId(moduleId);
    setBusinessModulesState(prev => {
        if (!selectedBusiness) return prev;
        
        const currentPlan = allPlans.find(p => p.name === selectedBusiness.planName || p.id === selectedBusiness.planName || ('slug' in p && p.slug === selectedBusiness.planName));
        const planModules = (currentPlan as any)?.includedModuleKeys?.map((k: string) => normalizeModuleId(k)) || [];
        const isIncludedInPlan = planModules.includes(cleanId);

        const current = prev[cleanId] || { 
            active: false, 
            isAddon: !isIncludedInPlan, 
            isPlanDefault: isIncludedInPlan 
        };
        
        return {
            ...prev,
            [cleanId]: {
                ...current,
                active: !current.active
            }
        };
    });
  };

  const handleExtraChange = (moduleId: string, value: string) => {
    const numericValue = parseInt(value, 10) || 0;
    setModuleExtras(prev => ({ ...prev, [normalizeModuleId(moduleId)]: numericValue }));
  };

  const handleLimiteExtraChange = (key: string, value: string) => {
    const numericValue = Math.max(0, parseInt(value, 10) || 0);
    setLimitesExtra(prev => ({ ...prev, [key]: numericValue }));
  };

  const limiteFields = [
    { key: 'products', label: 'Productos' },
    { key: 'blogPosts', label: 'Posts Blog' },
    { key: 'landingPages', label: 'Landing Pages' },
    { key: 'promotions', label: 'Promociones' },
    { key: 'coupons', label: 'Cupones' },
    { key: 'orders', label: 'Pedidos/mes' },
    { key: 'suggestions', label: 'Sugerencias' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Negocios</CardTitle>
          <CardDescription>Administra todos los negocios registrados en la plataforma.</CardDescription>
        </CardHeader>
      </Card>
      
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={() => setShowBusinessModal(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Negocio
        </Button>
        <div className="flex-1 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar negocios..."
              value={searchBusiness}
              onChange={e => setSearchBusiness(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los planes</SelectItem>
              <SelectGroup>
                <SelectLabel>Planes Estándar</SelectLabel>
                {allPlans.filter(p => p.origin === 'standard' && p.isActive).map(plan => (
                  <SelectItem key={plan.id} value={plan.id!}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Planes Híbridos</SelectLabel>
                {allPlans.filter(p => p.origin === 'hybrid' && p.isActive).map(plan => (
                  <SelectItem key={plan.id} value={plan.id!}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="inactive">Inactivo</SelectItem>
              <SelectItem value="suspended">Suspendido</SelectItem>
              <SelectItem value="pending_payment">Pago Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-4 font-medium text-gray-600">Negocio</th>
                  <th className="text-left px-6 py-4 font-medium text-gray-600">Plan</th>
                  <th className="text-left px-6 py-4 font-medium text-gray-600">Actividad</th>
                  <th className="text-left px-6 py-4 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-6 py-4 font-medium text-gray-600">Teléfono</th>
                  <th className="text-right px-6 py-4 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {businessesLoading ? (
                    <tr>
                        <td colSpan={6} className="py-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">Cargando negocios...</p>
                        </td>
                    </tr>
                ) : filteredBusinesses.map(business => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{business.name}</p>
                          <p className="text-xs text-gray-500 font-medium">
                            {business.ownerName || business.name || 'Propietario'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2 bg-muted/30">
                            {(() => {
                                const matched = allPlans.find(p => p.id === business.planName || p.name === business.planName || ('slug' in p && p.slug === business.planName));
                                return matched ? matched.name : (business.planName || 'Plan Crecimiento');
                            })()}
                        </Badge>
                    </td>
                    <td className="px-6 py-4">
                        <ActivityBadge status={business.activityStatus} />
                    </td>
                    <td className="px-6 py-4">
                        <StatusBadge status={business.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium text-sm">
                        {business.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-3">
                        <div className="flex items-center gap-2 mr-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">{business.status === 'active' ? 'ON' : 'OFF'}</Label>
                          <Switch 
                            checked={business.status === 'active'}
                            onCheckedChange={(checked) => handleToggleStatus(business, checked)}
                          />
                        </div>

                        <Button size="sm" variant="outline" className="font-bold" onClick={() => openManageBusiness(business)} disabled={isManaging}>
                            {isManaging && selectedBusiness?.id === business.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Eye className="w-4 h-4 mr-1.5" />}
                            Gestionar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => router.push(`/landing/${business.id}`)} className="text-primary hover:text-primary hover:bg-primary/5 font-bold">
                            Ingresar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="font-bold">
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Eliminar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el negocio <strong>{business.name}</strong> y todos sus datos asociados de la plataforma. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteBusiness(business.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Eliminar Negocio
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={showBusinessModal} onOpenChange={setShowBusinessModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Negocio</DialogTitle><DialogDescription>Registra un nuevo negocio en la plataforma</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Nombre del Negocio</Label><Input value={businessForm.name} onChange={e => setBusinessForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Restaurante El Sabor" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nombre del Propietario</Label><Input value={businessForm.ownerName} onChange={e => setBusinessForm(prev => ({ ...prev, ownerName: e.target.value }))} placeholder="Juan Pérez" /></div>
              <div><Label>Email del Propietario</Label><Input type="email" value={businessForm.ownerEmail} onChange={e => setBusinessForm(prev => ({ ...prev, ownerEmail: e.target.value }))} placeholder="juan@email.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Teléfono</Label><Input value={businessForm.phone} onChange={e => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="+57 300 123 4567" /></div>
              <div>
                <Label>Plan Inicial</Label>
                <Select value={businessForm.planId} onValueChange={v => setBusinessForm(prev => ({ ...prev, planId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                  <SelectContent>
                    {allPlans.map(plan => <SelectItem key={plan.id} value={plan.id!}>{plan.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={businessForm.status} onValueChange={(v: EntityStatus) => setBusinessForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Inactivo</SelectItem><SelectItem value="suspended">Suspendido</SelectItem><SelectItem value="pending_payment">Pago Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowBusinessModal(false)}>Cancelar</Button><Button onClick={handleSaveBusiness} className="bg-primary hover:bg-primary/90">Crear Negocio</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar Negocio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea desactivar este negocio?
              <br /><br />
              Mientras el negocio permanezca desactivado, sus administradores y usuarios no podrán acceder a la plataforma.
              <br /><br />
              Esta acción puede revertirse en cualquier momento desde el panel de Super Administración.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBusinessToDeactivate(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive hover:bg-destructive/90">
              Desactivar Negocio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="text-primary h-5 w-5" />
                Gestionar Negocio
            </DialogTitle>
            <DialogDescription>{selectedBusiness?.name} - Valida características y permisos del plan</DialogDescription>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 border rounded-lg">
                <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Propietario</p>
                    <p className="font-semibold flex items-center gap-2 text-sm">
                        <User className="w-3.5 h-3.5 text-primary"/> {selectedBusiness.ownerName}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Email Principal</p>
                    <p className="font-semibold flex items-center gap-2 text-sm">
                        <Mail className="w-3.5 h-3.5 text-primary"/> {selectedBusiness.ownerEmail}
                    </p>
                </div>
                <div className="mt-2 col-span-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Plan de Suscripción (Fuente de Verdad)</p>
                    <Select 
                        value={allPlans.find(p => p.id === selectedBusiness.planName || p.name === selectedBusiness.planName || ('slug' in p && p.slug === selectedBusiness.planName))?.id || 'WxZYuL7JwmkSKBXGn1QZ'} 
                        onValueChange={(val) => {
                            const newPlan = allPlans.find(p => p.id === val);
                            if (newPlan) {
                                setSelectedBusiness({...selectedBusiness, planName: newPlan.name});
                            }
                        }}
                    >
                        <SelectTrigger className="w-full font-black text-primary border-primary/20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {allPlans.map(plan => (
                                <SelectItem key={plan.id} value={plan.id!}>{plan.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="mt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Estado en Plataforma</p>
                    <Select value={selectedBusiness.status} onValueChange={(v: EntityStatus) => setSelectedBusiness({...selectedBusiness, status: v})}>
                        <SelectTrigger className="w-full h-8">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="pending_payment">Pago Pendiente</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="suspended">Suspendido</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold flex items-center gap-2 text-gray-800">
                        <Puzzle className="h-4 w-4 text-primary" />
                        Módulos y Herramientas
                    </h4>
                    <span className="text-[10px] text-muted-foreground italic">Valida que coincidan con el plan contratado</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    const currentPlan = allPlans.find(p => p.name === selectedBusiness.planName || p.id === selectedBusiness.planName || ('slug' in p && p.slug === selectedBusiness.planName));
                    const planModules = (currentPlan as any)?.includedModuleKeys?.map((k: string) => normalizeModuleId(k)) || [];

                    return displayedModules.map(moduleItem => {
                      const cleanId = normalizeModuleId(moduleItem.id);
                      const itemState = businessModulesState[cleanId] || { 
                          active: false, 
                          isAddon: false, 
                          isPlanDefault: planModules.includes(cleanId) 
                      };
                      
                      const isActive = itemState.active;
                      const isPlanDefault = itemState.isPlanDefault;
                      const isAddon = itemState.isAddon;
                      
                      const validation = validateModuleExtra(selectedBusiness.planName, moduleExtras[cleanId] || 0);
                      
                      return (
                        <div key={moduleItem.id} className={cn(
                            'flex flex-col p-3 border rounded-lg transition-all cursor-pointer', 
                            isActive ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/30', 
                            isActive && !isPlanDefault && 'border-blue-500 bg-blue-50/30'
                        )} onClick={() => toggleModuleAssignment(moduleItem.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                                {iconMap[moduleItem.id] || iconMap.default}
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold">{moduleItem.name}</p>
                                      {isPlanDefault && <Badge className="text-[8px] h-4 bg-green-600">Incluido en Plan</Badge>}
                                      {isAddon && (
                                        <Badge className={cn("text-[8px] h-4 border-none shadow-sm", isActive ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700")}>
                                            Add-on {isActive ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                      )}
                                      {!isPlanDefault && !isAddon && <Badge variant="outline" className="text-[8px] h-4 border-gray-300 text-gray-500">No Incluido</Badge>}
                                  </div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      {isActive ? 'ACTIVE' : 'INACTIVE'} (Negocio)
                                  </p>
                              </div>
                            </div>
                            <Switch checked={isActive} />
                          </div>
                          
                          {isActive && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-3 items-end gap-4 animate-in fade-in slide-in-from-top-1 duration-200" onClick={(e) => e.stopPropagation()}>
                              <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Límite Base</Label><div className="h-9 flex items-center px-3 bg-muted rounded-md font-bold text-xs">{validation.baseLimit === -1 ? '∞' : validation.baseLimit}</div></div>
                              <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Extra (+)</Label><Input type="number" className="h-9 text-xs" value={moduleExtras[cleanId] ?? 0} onChange={(e) => handleExtraChange(moduleItem.id, e.target.value)} /></div>
                              <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Total Real</Label><div className="h-9 flex items-center px-3 bg-primary/20 text-primary rounded-md font-black text-xs">{validation.totalLimit === -1 ? '∞' : validation.totalLimit}</div></div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-black flex items-center gap-2 mb-4 text-lg text-gray-800">
                    <TrendingUp className="w-5 h-5 text-primary" /> 
                    Capacidades y Límites Adicionales
                </h4>
                <div className="space-y-4">
                  {limiteFields.map((field) => {
                    const base = currentPlanLimits[field.key] || 0;
                    const extra = limitesExtra[field.key] || 0;
                    const total = base + extra;
                    const nextLimit = nextPlanLimits?.[field.key];
                    const isOverLimit = nextLimit !== undefined && nextLimit !== -1 && total >= nextLimit;
                    return (
                      <div key={field.key} className="grid grid-cols-4 items-end gap-3 p-3 border rounded-xl bg-white shadow-sm hover:border-primary/30 transition-colors">
                        <Label className="text-sm font-bold text-gray-700 pb-2">{field.label}</Label>
                        <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Base Plan</Label><div className="h-9 flex items-center px-3 bg-muted rounded-md text-xs font-semibold">{base === -1 ? '∞' : base}</div></div>
                        <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Aumento</Label><Input type="number" min="0" className={cn("h-9 text-xs font-bold", isOverLimit && "border-destructive text-destructive")} value={limitesExtra[field.key] || 0} onChange={(e) => handleLimiteExtraChange(field.key, e.target.value)} /></div>
                        <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Total Final</Label><div className={cn("h-9 flex items-center px-3 rounded-md font-black text-xs transition-colors", isOverLimit ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{total === -1 ? '∞' : total}</div></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 border-t">
            <Button variant="ghost" className="font-bold" onClick={() => setShowManageModal(false)} disabled={isSavingChanges}>Cancelar</Button>
            <Button onClick={handleSaveManageBusiness} className="bg-primary hover:bg-primary/90 font-black px-8" disabled={isSavingChanges}>
                {isSavingChanges ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Guardar Configuración de Plan
            </Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
  );
}
