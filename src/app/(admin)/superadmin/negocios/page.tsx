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
import { Check, Plus, Search, Building2, Eye, Puzzle, Tag, AlertCircle, TrendingUp, Mail, User, ShieldCheck, Loader2, Sparkles, Trash2, Clock, Smartphone, ScanLine, Calculator, Package, MessageSquare, CalendarCheck } from 'lucide-react';
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
  catalogo: <Building2 className="w-4 h-4" />,
  'whapi-whatsapp': <WhatsAppIcon className="w-4 h-4" />,
  'ycloud-whatsapp': <Smartphone className="w-4 h-4" />,
  promotions: <Tag className="w-4 h-4" />,
  loyalty: <Sparkles className="w-4 h-4" />,
  contabilidad: <Calculator className="w-4 h-4" />,
  'inventario-kardex': <Package className="w-4 h-4" />,
  'pistola-escaner': <ScanLine className="w-4 h-4" />,
  'motor-de-sugerencias-inteligentes': <Sparkles className="w-4 h-4" />,
  'google-analytics': <TrendingUp className="w-4 h-4" />,
  'reservas-agendamiento': <CalendarCheck className="w-4 h-4" />,
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

  // displayedModules combinando Firestore con los módulos del sistema para asegurar visibilidad constante
  const displayedModules = useMemo(() => {
      const dbModules = modules || [];
      const modulesMap = new Map<string, Module>();

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

      dbModules.forEach(m => {
          const canonicalId = getCanonicalModuleId(m.id);
          if (!modulesMap.has(canonicalId)) {
              modulesMap.set(canonicalId, { ...m, id: canonicalId });
          }
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
  
  const [businessToDeactivate, setBusinessToDeactivate] = useState<Business | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const [businessModulesState, setBusinessModulesState] = useState<Record<string, ModuleState>>({});
  const [moduleExtras, setModuleExtras] = useState<Record<string, number>>({});
  const [assignedServices, setAssignedServices] = useState<string[]>([]);

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
        const planModules = (currentPlanDetails as any)?.includedModuleKeys?.map((k: string) => getCanonicalModuleId(k)) || [];

        setSelectedBusiness({ 
            ...business, 
            status: business.status || subData?.status || 'active', 
            ownerName: business.ownerName || business.name || 'Propietario',
            ownerEmail: business.ownerEmail || business.contactEmail || 'N/A',
            planName: resolvedPlanName
        });
        
        const modulesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/modules`));
        const extras: Record<string, number> = {};
        const initialState: Record<string, ModuleState> = {};
        planModules.forEach((id: string) => {
          initialState[id] = { active: true, isAddon: false, isPlanDefault: true };
        });

        modulesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const cleanId = getCanonicalModuleId(doc.id);
            const isIncludedInPlan = planModules.includes(cleanId);
            initialState[cleanId] = { active: data.status === 'active', isAddon: data.isAddon === true, isPlanDefault: isIncludedInPlan };
            if (data.extra !== undefined) extras[cleanId] = data.extra;
        });
        
        setBusinessModulesState(initialState);
        setModuleExtras(extras);

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
        }
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
        batch.update(businessRef, { status: selectedBusiness.status, planName: selectedBusiness.planName, limitesExtra });
        await batch.commit();
        toast({ title: "Cambios guardados" });
        setShowManageModal(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error' });
    } finally {
        setIsSavingChanges(false);
    }
  };

  const toggleModuleAssignment = (moduleId: string) => {
    const cleanId = getCanonicalModuleId(moduleId);
    setBusinessModulesState(prev => {
        const current = prev[cleanId] || { active: false, isAddon: true, isPlanDefault: false };
        return { ...prev, [cleanId]: { ...current, active: !current.active } };
    });
  };

  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Gestión de Negocios</CardTitle></CardHeader></Card>
      <div className="flex items-center gap-4">
          <Button onClick={() => setShowBusinessModal(true)}><Plus className="w-4 h-4 mr-2" />Agregar</Button>
          <Input placeholder="Buscar..." value={searchBusiness} onChange={e => setSearchBusiness(e.target.value)} className="max-w-xs" />
      </div>
      <Card><CardContent className="p-0">
          <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="px-6 py-4">Negocio</th><th className="px-6 py-4">Plan</th><th className="px-6 py-4">Acciones</th></tr></thead>
              <tbody className="divide-y">{filteredBusinesses.map(business => (
                  <tr key={business.id}>
                      <td className="px-6 py-4 font-bold">{business.name}</td>
                      <td className="px-6 py-4"><Badge>{business.planName}</Badge></td>
                      <td className="px-6 py-4 flex gap-2"><Button size="sm" onClick={() => openManageBusiness(business)}>Gestionar</Button></td>
                  </tr>
              ))}</tbody>
          </table>
      </CardContent></Card>
    </div>
  );
}
