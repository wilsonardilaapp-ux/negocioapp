
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
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
import { Check, Plus, Search, Building2, Eye, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Import models
import type { Business, EntityStatus } from '@/models/business';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { SystemService } from '@/models/system-service';
import type { Module } from '@/models/module';

const iconMap: { [key: string]: React.ReactNode } = {
  catalogo: <Building2 className="w-4 h-4" />,
  'chatbot-integrado-con-whatsapp-para-soporte-y-ventas': <Building2 className="w-4 h-4" />,
  default: <Puzzle className="w-4 h-4" />,
};

const StatusBadge = ({ status }: { status: EntityStatus | undefined }) => {
  if (!status) {
    return <Badge className="bg-gray-100 text-gray-800">Indefinido</Badge>;
  }
  const statusConfig = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
    pending_payment: 'bg-yellow-100 text-yellow-800',
  };
  return <Badge className={cn('capitalize', statusConfig[status])}>{status.replace('_', ' ')}</Badge>;
};

export default function BusinessesPage() {
  // Data State
  const firestore = useFirestore();
  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(useMemoFirebase(() => collection(firestore, 'businesses'), [firestore]));
  const { data: plans, isLoading: plansLoading } = useCollection<SubscriptionPlan>(useMemoFirebase(() => collection(firestore, 'plans'), [firestore]));
  const { data: services, isLoading: servicesLoading } = useCollection<SystemService>(useMemoFirebase(() => collection(firestore, 'systemServices'), [firestore]));
  const { data: modules, isLoading: modulesLoading } = useCollection<Module>(useMemoFirebase(() => collection(firestore, 'modules'), [firestore]));

  // Filter State
  const [searchBusiness, setSearchBusiness] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [assignedModules, setAssignedModules] = useState<string[]>([]);
  const [assignedServices, setAssignedServices] = useState<string[]>([]);
  
  const initialFormState = {
    name: '', ownerName: '', ownerEmail: '', phone: '', address: '', planId: '', status: 'active' as EntityStatus
  };
  const [businessForm, setBusinessForm] = useState(initialFormState);

  const filteredBusinesses = useMemo(() => {
    return (businesses || []).filter(business => {
      const searchMatch = searchBusiness === '' ||
        business.name.toLowerCase().includes(searchBusiness.toLowerCase()) ||
        (business.ownerName && business.ownerName.toLowerCase().includes(searchBusiness.toLowerCase()));
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
      logoURL: 'https://seeklogo.com/images/E/eco-friendly-logo-7087A22106-seeklogo.com.png', // Default logo
      description: 'Descripción por defecto', // Default description
    };
    await setDocumentNonBlocking(newBusinessRef, newBusiness);
    setBusinessForm(initialFormState);
    setShowBusinessModal(false);
  };

  const openManageBusiness = async (business: Business) => {
    setSelectedBusiness({ 
      ...business, 
      imageLimit: business.imageLimit ?? undefined,
      productLimit: business.productLimit ?? undefined 
    });
    
    // Load assigned modules and services
    const modulesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/modules`));
    setAssignedModules(modulesSnapshot.docs.filter(doc => doc.data().status === 'active').map(doc => doc.id));

    const servicesSnapshot = await getDocs(collection(firestore, `businesses/${business.id}/services`));
    setAssignedServices(servicesSnapshot.docs.filter(doc => doc.data().status === 'active').map(doc => doc.id));
    
    setShowManageModal(true);
  };
  
  const handleSaveManageBusiness = async () => {
    if (!selectedBusiness) return;
    
    // Prepare business document update
    const businessUpdateData: Partial<Business> = {
      status: selectedBusiness.status,
      imageLimit: selectedBusiness.imageLimit && Number(selectedBusiness.imageLimit) > 0 
        ? Number(selectedBusiness.imageLimit) 
        : null,
      productLimit: selectedBusiness.productLimit && Number(selectedBusiness.productLimit) > 0 
        ? Number(selectedBusiness.productLimit) 
        : null
    };

    // Update business status and imageLimit
    await updateDocumentNonBlocking(doc(firestore, `businesses/${selectedBusiness.id}`), businessUpdateData);
    
    // Deactivate all first, then activate selected in a batch
    const batch = writeBatch(firestore);
    const currentModules = await getDocs(collection(firestore, `businesses/${selectedBusiness.id}/modules`));
    currentModules.forEach(doc => batch.update(doc.ref, { status: 'inactive' }));
    
    const currentServices = await getDocs(collection(firestore, `businesses/${selectedBusiness.id}/services`));
    currentServices.forEach(doc => batch.update(doc.ref, { status: 'inactive' }));
    
    // Activate selected
    assignedModules.forEach(id => batch.set(doc(firestore, `businesses/${selectedBusiness.id}/modules`, id), { status: 'active' }, { merge: true }));
    assignedServices.forEach(id => batch.set(doc(firestore, `businesses/${selectedBusiness.id}/services`, id), { status: 'active' }, { merge: true }));

    await batch.commit();

    setShowManageModal(false);
  };
  
  const toggleModuleAssignment = (moduleId: string) => {
    setAssignedModules(prev => prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]);
  };
  const toggleServiceAssignment = (serviceId: string) => {
    setAssignedServices(prev => prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]);
  };

  const handleImpersonate = (business: Business) => {
    alert(`Funcionalidad "Ingresar" a ${business.name} no implementada.`);
  };

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
                          <p className="font-medium">{business.name}</p>
                          <p className="text-sm text-gray-500">{business.ownerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant="outline">{business.planName}</Badge></td>
                    <td className="px-6 py-4"><StatusBadge status={business.status} /></td>
                    <td className="px-6 py-4 text-gray-600">{business.phone}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openManageBusiness(business)}><Eye className="w-4 h-4 mr-1" />Gestionar</Button>
                        <Button size="sm" variant="outline" onClick={() => handleImpersonate(business)} className="text-primary hover:text-primary hover:bg-primary/5">Ingresar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBusinesses.length === 0 && <div className="text-center py-12 text-gray-500">No se encontraron negocios</div>}
          </div>
        </CardContent>
      </Card>
      
      {/* Modals */}
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
                  <SelectContent>{(plans || []).map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Dirección</Label><Input value={businessForm.address} onChange={e => setBusinessForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Calle 123 #45-67, Bogotá" /></div>
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
      
       <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Gestionar Negocio</DialogTitle><DialogDescription>{selectedBusiness?.name} - Asigna módulos y servicios</DialogDescription></DialogHeader>
          {selectedBusiness && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-sm text-gray-500">Propietario</p><p className="font-medium">{selectedBusiness.ownerName}</p></div>
                <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{selectedBusiness.ownerEmail}</p></div>
                <div><p className="text-sm text-gray-500">Plan Actual</p><p className="font-medium">{selectedBusiness.planName}</p></div>
                <div><p className="text-sm text-gray-500">Estado</p><StatusBadge status={selectedBusiness.status} /></div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Límites Personalizados</h4>
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <Label htmlFor="productLimit">Límite de Productos</Label>
                    <Input
                      id="productLimit"
                      type="number"
                      placeholder="Vacío para usar límite del plan"
                      value={selectedBusiness.productLimit ?? ''}
                      onChange={e => setSelectedBusiness(prev => prev ? { ...prev, productLimit: e.target.value === '' ? undefined : Number(e.target.value) } : null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Anula el límite de productos del plan solo para este cliente. -1 para ilimitado.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="imageLimit">Límite de Imágenes por Producto</Label>
                    <Input
                      id="imageLimit"
                      type="number"
                      placeholder="Vacío para usar límite global"
                      value={selectedBusiness.imageLimit ?? ''}
                      onChange={e => setSelectedBusiness(prev => prev ? { ...prev, imageLimit: e.target.value === '' ? undefined : Number(e.target.value) } : null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Anula el límite global de imágenes por producto solo para este cliente.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Módulos Asignados</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(modules || []).map(moduleItem => (
                    <div key={moduleItem.id} className={cn('flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors', assignedModules.includes(moduleItem.id) ? 'border-primary bg-primary/5' : 'hover:bg-gray-50', moduleItem.status === 'inactive' && 'opacity-60')} onClick={() => moduleItem.status !== 'inactive' && toggleModuleAssignment(moduleItem.id)}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-8 h-8 rounded flex items-center justify-center', assignedModules.includes(moduleItem.id) ? 'bg-primary/10' : 'bg-gray-100')}>{iconMap[moduleItem.id] || iconMap.default}</div>
                        <div><p className="text-sm font-medium">{moduleItem.name}</p><p className="text-xs text-gray-500">{moduleItem.status}</p></div>
                      </div>
                      {assignedModules.includes(moduleItem.id) && <Check className="w-5 h-5 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Servicios Adicionales</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(services || []).map(serviceItem => (
                    <div key={serviceItem.id} className={cn('flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors', assignedServices.includes(serviceItem.id) ? 'border-primary bg-primary/5' : 'hover:bg-gray-50')} onClick={() => toggleServiceAssignment(serviceItem.id)}>
                      <div><p className="text-sm font-medium">{serviceItem.name}</p><p className="text-xs text-gray-500">Límite Global: {serviceItem.limit}</p></div>
                      {assignedServices.includes(serviceItem.id) && <Check className="w-5 h-5 text-primary" />}
                    </div>
                  ))}
                </div>
                {services?.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No hay servicios disponibles</p>}
              </div>
              <div>
                <h4 className="font-medium mb-3">Cambiar Estado</h4>
                <Select value={selectedBusiness.status} onValueChange={(v: EntityStatus) => setSelectedBusiness(prev => prev ? { ...prev, status: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Inactivo</SelectItem><SelectItem value="suspended">Suspendido</SelectItem><SelectItem value="pending_payment">Pago Pendiente</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowManageModal(false)}>Cancelar</Button><Button onClick={handleSaveManageBusiness} className="bg-primary hover:bg-primary/90">Guardar Cambios</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    

    