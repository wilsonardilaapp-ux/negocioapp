
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { 
  CalendarCheck, 
  PlusCircle, 
  Clock, 
  DollarSign, 
  Edit, 
  Trash2, 
  Loader2, 
  Frown, 
  Tag, 
  AlertCircle,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import type { BookingService } from '@/models/booking';
import { cn } from '@/lib/utils';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function BookingServicesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // No bloqueamos toda la UI con isSubLoading para evitar bloqueos por queries pesadas
  const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<BookingService | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Firestore Query
  const servicesQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return collection(firestore, `businesses/${user.uid}/bookingServices`);
  }, [user?.uid, firestore]);

  const { data: services, isLoading: areServicesLoading } = useCollection<BookingService>(servicesQuery);

  const isAuthorized = useMemo(() => isModuleAuthorized('reservas-agendamiento'), [isModuleAuthorized]);

  const handleOpenModal = (service: BookingService | null = null) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (service: BookingService) => {
    if (!user || !firestore) return;
    try {
      const docRef = doc(firestore, `businesses/${user.uid}/bookingServices`, service.id);
      await updateDocumentNonBlocking(docRef, { 
        isActive: !service.isActive,
        updatedAt: new Date().toISOString()
      });
      toast({ title: `Servicio ${!service.isActive ? 'activado' : 'pausado'}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al cambiar estado' });
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!user || !firestore) return;
    try {
      const docRef = doc(firestore, `businesses/${user.uid}/bookingServices`, id);
      await deleteDocumentNonBlocking(docRef);
      toast({ title: 'Servicio eliminado permanentemente' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  };

  const handleSaveService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !firestore) return;

    const formData = new FormData(event.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      durationMinutes: Number(formData.get('durationMinutes')),
      price: Number(formData.get('price')),
      category: formData.get('category') as string,
      isActive: editingService ? editingService.isActive : true,
      updatedAt: new Date().toISOString()
    };

    if (!data.name || data.durationMinutes <= 0) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'El nombre y la duración son obligatorios.' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingService) {
        const docRef = doc(firestore, `businesses/${user.uid}/bookingServices`, editingService.id);
        await setDocumentNonBlocking(docRef, data, { merge: true });
      } else {
        const colRef = collection(firestore, `businesses/${user.uid}/bookingServices`);
        const newDocRef = doc(colRef);
        await setDocumentNonBlocking(newDocRef, {
          ...data,
          id: newDocRef.id,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      toast({ title: 'Servicio guardado con éxito' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  // Solo mostramos el loader principal si los datos básicos del usuario y los servicios están cargando
  if (isUserLoading || areServicesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Cargando servicios...</p>
      </div>
    );
  }

  // Si ya terminó de cargar el plan y no está autorizado, mostramos el aviso
  if (!isSubLoading && !isAuthorized) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center text-center p-10 min-h-[400px] gap-4">
          <Frown className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-bold">Módulo de Reservas No Activo</h3>
          <p className="text-muted-foreground max-w-sm">
            Este módulo no está incluido en tu plan actual. Contacta al administrador para habilitar el agendamiento online.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <CalendarCheck className="h-8 w-8 text-primary" />
            Servicios de Citas
          </h1>
          <p className="text-muted-foreground">Gestiona los servicios que tus clientes pueden agendar online.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="font-bold shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo Servicio
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services && services.length > 0 ? (
          services.map((service) => (
            <Card key={service.id} className={cn("overflow-hidden border-gray-100 transition-all hover:shadow-lg", !service.isActive && "opacity-60 grayscale")}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold">{service.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                      {service.category || 'General'}
                    </Badge>
                  </div>
                  <Switch 
                    checked={service.isActive} 
                    onCheckedChange={() => handleToggleStatus(service)} 
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                  {service.description || 'Sin descripción.'}
                </p>
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <div className="flex items-center gap-1.5 font-medium text-gray-700">
                    <Clock className="h-4 w-4 text-primary" />
                    {service.durationMinutes} min
                  </div>
                  <div className="font-black text-primary text-base">
                    {formatCurrency(service.price)}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 font-bold" onClick={() => handleOpenModal(service)}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar este servicio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción es permanente. Los clientes ya no podrán agendar este servicio.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteService(service.id)} className="bg-destructive hover:bg-destructive/90">
                        Sí, eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2 lg:col-span-3 border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="p-4 bg-white rounded-full shadow-sm">
                <Tag className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Sin servicios registrados</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Crea tu primer servicio para que tus clientes puedan empezar a agendar citas.
                </p>
              </div>
              <Button onClick={() => handleOpenModal()} variant="outline" className="font-bold border-primary text-primary hover:bg-primary/5">
                Crear mi primer servicio
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MODAL DE CREACIÓN / EDICIÓN */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !isSaving && setIsModalOpen(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Editar Servicio' : 'Nuevo Servicio de Cita'}</DialogTitle>
            <DialogDescription>Define la duración y el valor de tu servicio profesional.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveService} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Servicio *</Label>
              <Input id="name" name="name" defaultValue={editingService?.name} placeholder="Ej: Corte de Cabello, Consulta Médica..." required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duración (minutos) *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="durationMinutes" 
                    name="durationMinutes" 
                    type="number" 
                    defaultValue={editingService?.durationMinutes || 30} 
                    className="pl-10"
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio ($) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="price" 
                    name="price" 
                    type="number" 
                    defaultValue={editingService?.price || 0} 
                    className="pl-10"
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría (Opcional)</Label>
              <Input id="category" name="category" defaultValue={editingService?.category} placeholder="Ej: Peluquería, Consultoría..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" defaultValue={editingService?.description} placeholder="Detalla lo que incluye el servicio..." className="resize-none" rows={3} />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="font-bold px-8">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingService ? 'Guardar Cambios' : 'Crear Servicio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
