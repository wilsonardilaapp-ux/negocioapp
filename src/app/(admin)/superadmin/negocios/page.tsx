'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { Check, Plus, Search, Building2, Eye, Puzzle, Tag, AlertCircle, TrendingUp, Mail, User, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { validateModuleExtra, validateLimitesExtra } from '@/utils/validateModuleExtra';

// Import models
import type { Business, EntityStatus } from '@/models/business';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { SystemService } from '@/models/system-service';
import type { Module } from '@/models/module';
import type { HybridPlan } from '@/models/hybrid-plan';

const iconMap: { [key: string]: React.ReactNode } = {
  catalogo: <Building2 className="w-4 h-4" />,
  'chatbot-integrado-con-whatsapp-para-soporte-y-ventas': <Building2 className="w-4 h-4" />,
  promotions: <Tag className="w-4 h-4" />,
  default: <Puzzle className="w-4 h-4" />,
};

const StatusBadge = ({ status }: { status: EntityStatus | string | undefined }) => {
  // Resiliencia para estados nulos o no normalizados
  // Si no hay estado definido, pero el negocio existe, mostramos un estado neutral para evitar "Inactivo" falso
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

export default function BusinessesPage() {
  const router = useRouter();
  const firestore = useFirestore();

  // Data fetching
  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(useMemoFirebase(() => collection(firestore, 'businesses'), [firestore]));
  const { data: plans } = useCollection<SubscriptionPlan>(useMemoFirebase(() => collection(firestore, 'plans'), [firestore]));
  const { data: hybridPlans } = useCollection<HybridPlan>(useMemoFirebase(() => collection(firestore, 'hybrid_plans'), [firestore]));
  const { data: services } = useCollection<SystemService>(useMemoFirebase(() => collection(firestore, 'systemServices'), [firestore]));
  const { data: modules } = useCollection<Module>(useMemoFirebase(() => collection(firestore, 'modules'), [firestore]));

  // Filter State
  const [searchBusiness, setSearchBusiness] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  
  // Modules State
  const [assignedModules, setAssignedModules] = useState<string[]>([]);
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
      const planMatch = filterPlan === 'all' || business.planName === plans?.find(p => p.id === filterPlan)?.name;
      const statusMatch = filterStatus === 'all' || business.status === filterStatus;
      return searchMatch && planMatch && statusMatch;
    });
  }, [businesses, searchBusiness, filterPlan, filterStatus, plans]);

  const handleSaveBusiness = async () => {
    if (!businessForm.name || !businessForm.ownerName || !businessForm.ownerEmail || !businessForm.planId) {
      alert('Por favor, completa todos los campos obligatorios.');
      return;
    }
    const selectedPlan = plans?.find(p => p.id === businessForm.planId);
    const newBusinessRef = doc(collection(firestore, 'businesses'));
    const newBusiness: Omit<Business, 'id'> = {
      ...businessForm,
      planName: selectedPlan?.name,
      logoURL: 'https://seeklogo.com/images/E/eco-friendly-logo-7087A22106-seeklogo.com.png',
      description: 'Bienvenido a Negocio V03',
    };
    await setDocumentNonBlocking(newBusinessRef, newBusiness);
    setBusinessForm(initialFormState);
    setShowBusinessModal(false);
  };

  const openManageBusiness = async (business: Business) => {
    // 0. Fetch the actual subscription from subcollection (Source of Truth)
    // Esto asegura que si el plan real es Híbrido, el modal lo detecte aunque en el doc principal diga 'Gratuito'
    const subSnap = await getDoc(doc(firestore, `businesses/${business.id}/subscription`, 'current'));
    const subData = subSnap.exists() ? subSnap.data() as any : null;
    const actualPlanId = subData?.plan || 'free';

    // Unify all plans for lookup
    const allAvailablePlans = [...(plans || []), ...(hybridPlans || [])];
    const currentPlanDetails = allAvailablePlans.find(p => p.id === actualPlanId || p.name === business.planName);

    // Aseguramos fallbacks para visualización en el modal
    setSelectedBusiness({ 
      ...business, 
      status: business.status || subData?.status || 'active', 
      ownerName: business.ownerName || business.name || 'N/A',
      ownerEmail: business.ownerEmail || business.contactEmail || 'N/A',
      planName: currentPlanDetails?.name || business.planName || (actualPlanId !== 'free' ? actualPlanId : 'Plan Gratuito'), 
      imageLimit: business.imageLimit ?? undefined,
      productLimit: business.productLimit ?? undefined 
    });
    
    // 1. Load assigned modules and services
    const modulesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/modules`));
    const activeModuleIds: string[] = [];
    const extras: Record<string, number> = {};
    
    modulesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active') {
        activeModuleIds.push(doc.id);
        extras[doc.id] = data.extra || 0;
      }
    });
    
    setAssignedModules(activeModuleIds);
    setModuleExtras(extras);

    const servicesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/services`));
    setAssignedServices(servicesSnapshot.docs.filter(doc => doc.data().status === 'active').map(doc => doc.id));

    // 2. Load Plan Limits and Hierarchy
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
    } else {
      setCurrentPlanLimits({});
      setNextPlanLimits(null);
    }

    // 3. Load existing LimitesExtra from Business document
    const businessDoc = businesses?.find(b => b.id === business.id) as any;
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
  };
  
  const handleSaveManageBusiness = async () => {
    if (!selectedBusiness) return;
    
    // 1. Validate module extras
    for (const moduleId of assignedModules) {
      const extra = moduleExtras[moduleId] || 0;
      const validation = validateModuleExtra(selectedBusiness.planName, extra);
      if (!validation.valid) {
        alert(`Error en módulo ${moduleId}: ${validation.error}`);
        return;
      }
    }

    // 2. Validate Plan Limits Extra
    const validation = validateLimitesExtra(
      nextPlanName || 'Superior',
      currentPlanLimits,
      nextPlanLimits,
      limitesExtra
    );

    if (!validation.valid) {
      const errorMsg = Object.values(validation.errors).join('\n');
      alert(`Error en Límites Extra:\n${errorMsg}`);
      return;
    }
    
    const businessUpdateData: any = {
      status: selectedBusiness.status,
      imageLimit: selectedBusiness.imageLimit && Number(selectedBusiness.imageLimit) > 0 ? Number(selectedBusiness.imageLimit) : null,
      productLimit: selectedBusiness.productLimit && Number(selectedBusiness.productLimit) > 0 ? Number(selectedBusiness.productLimit) : null,
      limitesExtra: limitesExtra
    };

    await updateDocumentNonBlocking(doc(firestore, `businesses/${selectedBusiness.id}`), businessUpdateData);
    
    const batch = writeBatch(firestore);
    const currentModules = await getDocs(collection(firestore, `businesses/${selectedBusiness.id}/modules`));
    currentModules.forEach(doc => batch.update(doc.ref, { status: 'inactive' }));
    
    const currentServices = await getDocs(collection(firestore, `businesses/${selectedBusiness.id}/services`));
    currentServices.forEach(doc => batch.update(doc.ref, { status: 'inactive' }));
    
    assignedModules.forEach(id => {
      const extra = moduleExtras[id] || 0;
      batch.set(doc(firestore, `businesses/${selectedBusiness.id}/modules`, id), { status: 'active', extra }, { merge: true });
    });
    assignedServices.forEach(id => batch.set(doc(firestore, `businesses/${selectedBusiness.id}/services`, id), { status: 'active' }, { merge: true }));

    await batch.commit();
    setShowManageModal(false);
  };
  
  const toggleModuleAssignment = (moduleId: string) => {
    setAssignedModules(prev => prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]);
    if (assignedModules.includes(moduleId)) {
      setModuleExtras(prev => {
        const newExtras = { ...prev };
        delete newExtras[moduleId];
        return newExtras;
      });
    } else {
      setModuleExtras(prev => ({ ...prev, [moduleId]: 0 }));
    }
  };

  const handleExtraChange = (moduleId: string, value: string) => {
    const numericValue = parseInt(value, 10) || 0;
    setModuleExtras(prev => ({ ...prev, [moduleId]: numericValue }));
  };

  const handleLimiteExtraChange = (key: string, value: string) => {
    const numericValue = Math.max(0, parseInt(value, 10) || 0);
    setLimitesExtra(prev => ({ ...prev, [key]: numericValue }));
  };

  const toggleServiceAssignment = (serviceId: string) => {
    setAssignedServices(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
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
            <SelectTrigger className="w-40"><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los planes</SelectItem>
              {(plans || []).map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
              {(hybridPlans || []).map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
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
                  <th className="text-left px-6 py-4 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-6 py-4 font-medium text-gray-600">Teléfono</th>
                  <th className="text-right px-6 py-4 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(filteredBusinesses || []).map(business => (
                  <tr key={business.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{business.name}</p>
                          <p className="text-xs text-gray-500 font-medium">
                            {business.ownerName || business.name || 'Propietario N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2 bg-muted/30">
                            {business.planName || 'Plan Gratuito'}
                        </Badge>
                    </td>
                    <td className="px-6 py-4">
                        <StatusBadge status={business.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium text-sm">
                        {business.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" className="font-bold" onClick={() => openManageBusiness(business)}>
                            <Eye className="w-4 h-4 mr-1.5" />
                            Gestionar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => router.push(`/landing/${business.id}`)} className="text-primary hover:text-primary hover:bg-primary/5 font-bold">
                            Ingresar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Nuevo Negocio Modal */}
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
                <Label>Plan</Label>
                <Select value={businessForm.planId} onValueChange={v => setBusinessForm(prev => ({ ...prev, planId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                  <SelectContent>
                    {(plans || []).map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                    {(hybridPlans || []).map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
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
      
       {/* Gestionar Negocio Modal */}
       <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="text-primary h-5 w-5" />
                Gestionar Negocio
            </DialogTitle>
            <DialogDescription>{selectedBusiness?.name} - Asigna módulos y servicios</DialogDescription>
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
                <div className="mt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Plan de Suscripción</p>
                    <p className="font-black text-primary text-sm">{selectedBusiness.planName}</p>
                </div>
                <div className="mt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Estado en Plataforma</p>
                    <StatusBadge status={selectedBusiness.status} />
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3 flex items-center gap-2">
                    <Puzzle className="h-4 w-4 text-primary" />
                    Módulos Asignados
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {(modules || []).map(moduleItem => {
                    const isActive = assignedModules.includes(moduleItem.id);
                    const validation = validateModuleExtra(selectedBusiness.planName, moduleExtras[moduleItem.id] || 0);
                    return (
                      <div key={moduleItem.id} className={cn('flex flex-col p-3 border rounded-lg transition-all', isActive ? 'border-primary bg-primary/5 shadow-sm' : 'hover:bg-muted/30', moduleItem.status === 'inactive' && 'opacity-60')}>
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => moduleItem.status !== 'inactive' && toggleModuleAssignment(moduleItem.id)}>
                          <div className="flex items-center gap-3">
                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>{iconMap[moduleItem.id] || iconMap.default}</div>
                            <div>
                                <p className="text-sm font-bold">{moduleItem.name}</p>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase">{moduleItem.status}</p>
                            </div>
                          </div>
                          {isActive && <Check className="w-5 h-5 text-primary" />}
                        </div>
                        {isActive && (
                          <div className="mt-3 pt-3 border-t grid grid-cols-3 items-end gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Base</Label><div className="h-9 flex items-center px-3 bg-muted rounded-md font-bold text-xs">{validation.baseLimit}</div></div>
                            <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Extra</Label><Input type="number" className="h-9 text-xs" value={moduleExtras[moduleItem.id] ?? 0} onChange={(e) => handleExtraChange(moduleItem.id, e.target.value)} /></div>
                            <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Total Real</Label><div className="h-9 flex items-center px-3 bg-primary/20 text-primary rounded-md font-black text-xs">{validation.totalLimit}</div></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-black flex items-center gap-2 mb-4 text-lg text-gray-800">
                    <TrendingUp className="w-5 h-5 text-primary" /> 
                    Límites Extra del Plan
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
                        <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Base</Label><div className="h-9 flex items-center px-3 bg-muted rounded-md text-xs font-semibold">{base === -1 ? '∞' : base}</div></div>
                        <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Extra</Label><Input type="number" min="0" className={cn("h-9 text-xs font-bold", isOverLimit && "border-destructive text-destructive")} value={limitesExtra[field.key] || 0} onChange={(e) => handleLimiteExtraChange(field.key, e.target.value)} /></div>
                        <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Total</Label><div className={cn("h-9 flex items-center px-3 rounded-md font-black text-xs transition-colors", isOverLimit ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>{total === -1 ? '∞' : total}</div></div>
                      </div>
                    );
                  })}
                </div>
                {nextPlanName && (
                  <p className="mt-4 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    El total real no puede igualar al plan superior ({nextPlanName}).
                  </p>
                )}
              </div>

              <div className="border-t pt-6">
                <h4 className="font-bold mb-3 text-gray-800">Estado del Negocio</h4>
                <Select value={selectedBusiness.status} onValueChange={(v: EntityStatus) => setSelectedBusiness(prev => prev ? {...prev, status: v} : null)}>
                    <SelectTrigger className="w-full font-semibold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active" className="font-bold text-green-700">Activo (Full Access)</SelectItem>
                        <SelectItem value="pending_payment" className="font-bold text-yellow-700">Pago Pendiente (Limitado)</SelectItem>
                        <SelectItem value="inactive" className="font-bold text-gray-700">Inactivo (No accesible)</SelectItem>
                        <SelectItem value="suspended" className="font-bold text-red-700">Suspendido (Bloqueado)</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 border-t">
            <Button variant="ghost" className="font-bold" onClick={() => setShowManageModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveManageBusiness} className="bg-primary hover:bg-primary/90 font-black px-8">
                Guardar Cambios Atómicos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}