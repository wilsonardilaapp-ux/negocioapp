
"use client";

import { useCollection, useFirestore, updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { SystemService } from '@/models/system-service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';

const serviceSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  limit: z.number().min(1).max(1000),
});

export default function ServicesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const servicesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'systemServices');
  }, [firestore]);

  const { data: services, isLoading } = useCollection<SystemService>(servicesQuery);

  useEffect(() => {
    if (!isLoading && services && firestore) {
      const imageLimitServiceExists = services.some(s => s.id === 'limite-de-imagenes-por-producto');
      if (!imageLimitServiceExists) {
        const newImageLimitService: SystemService = {
          id: 'limite-de-imagenes-por-producto',
          name: 'Límite de Imágenes por Producto',
          limit: 18,
          status: 'active',
          lastUpdate: new Date().toISOString(),
        };
        const serviceDocRef = doc(firestore, 'systemServices', newImageLimitService.id);
        setDocumentNonBlocking(serviceDocRef, newImageLimitService);
      }
    }
  }, [services, isLoading, firestore]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      limit: 500,
    }
  });

  const handleStatusChange = (service: SystemService) => {
    if (!firestore) return;
    const newStatus = service.status === 'active' ? 'inactive' : 'active';
    const serviceDocRef = doc(firestore, 'systemServices', service.id);
    updateDocumentNonBlocking(serviceDocRef, { status: newStatus, lastUpdate: new Date().toISOString() });
    toast({ title: "Estado actualizado", description: `El servicio "${service.name}" ahora está ${newStatus === 'active' ? 'activo' : 'inactivo'}.` });
  };

  const handleLimitChange = (serviceId: string, newLimit: number[]) => {
    if (!firestore) return;
    const serviceDocRef = doc(firestore, 'systemServices', serviceId);
    updateDocumentNonBlocking(serviceDocRef, { limit: newLimit[0], lastUpdate: new Date().toISOString() });
  };
  
  const handleDelete = (service: SystemService) => {
    if (!firestore) return;
    if (confirm(`¿Estás seguro de que quieres eliminar el servicio "${service.name}"?`)) {
      const serviceDocRef = doc(firestore, 'systemServices', service.id);
      deleteDocumentNonBlocking(serviceDocRef);
      toast({ title: "Servicio eliminado", description: `El servicio "${service.name}" ha sido eliminado.` });
    }
  }

  const onSubmit = (data: z.infer<typeof serviceSchema>) => {
    if (!firestore) return;
    
    const serviceId = data.name.toLowerCase().replace(/\s+/g, '-');

    const newService: SystemService = {
      id: serviceId,
      name: data.name,
      limit: data.limit,
      status: 'inactive',
      lastUpdate: new Date().toISOString(),
    };
    
    const serviceDocRef = doc(firestore, 'systemServices', serviceId);
    setDocumentNonBlocking(serviceDocRef, newService);

    toast({ title: "Servicio Creado", description: `El servicio "${data.name}" ha sido creado con el ID "${serviceId}".` });
    reset();
    setDialogOpen(false);
  };

  if (isLoading) {
    return <div>Cargando servicios...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Servicios del Sistema</CardTitle>
            <CardDescription>
              Activa, desactiva y configura los servicios globales de la plataforma.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Servicio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Servicio</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Servicio</Label>
                  <Input id="name" {...register("name")} />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                   <Label htmlFor="limit">Límite de Uso (1-1000)</Label>
                   <Input id="limit" type="number" {...register("limit", { valueAsNumber: true })} />
                   {errors.limit && <p className="text-sm text-destructive mt-1">{errors.limit.message}</p>}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit">Crear Servicio</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services && services.length > 0 ? (
          services.map((service) => (
            <Card key={service.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="space-y-1.5">
                  <CardTitle>{service.name}</CardTitle>
                  <CardDescription>Última actualización: {new Date(service.lastUpdate).toLocaleString()}</CardDescription>
                </div>
                <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                  {service.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-6 flex-grow">
                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor={`status-${service.id}`} className="text-base">
                      Estado del servicio
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Activa o desactiva este servicio.
                    </p>
                  </div>
                  <Switch
                    id={`status-${service.id}`}
                    checked={service.status === 'active'}
                    onCheckedChange={() => handleStatusChange(service)}
                  />
                </div>
                {service.name !== 'Google Analytics' && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor={`limit-${service.id}`} className="text-base">
                        Límite de Uso
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Establece el límite de consumo.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Slider
                        id={`limit-${service.id}`}
                        defaultValue={[service.limit]}
                        max={1000}
                        min={1}
                        step={1}
                        onValueCommit={(value) => handleLimitChange(service.id, value)}
                        disabled={service.status !== 'active'}
                      />
                      <span className="text-lg font-bold w-12 text-center">{service.limit}</span>
                    </div>
                  </div>
                )}
              </CardContent>
              <div className="p-6 pt-0">
                 <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(service)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Servicio
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-10 flex flex-col items-center justify-center gap-4">
              <h3 className="font-semibold">No hay servicios creados</h3>
              <p className="text-center text-muted-foreground">Crea tu primer servicio para empezar a gestionar la plataforma.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
