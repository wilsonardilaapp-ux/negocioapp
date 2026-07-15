"use client";

import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Settings, Loader2, Package, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { useState, useEffect } from 'react';
import type { Module } from '@/models/module';
import { PUBLIC_MENU_CHATBOT_MODULE_ID } from '@/models/public-menu-chatbot';

const moduleSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  description: z.string().min(5, { message: "La descripción es muy corta." }),
  limit: z.number().min(-1, { message: "El límite debe ser un número válido." }),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

const DEFAULT_MODULES = [
  { name: 'Catálogo de Productos', description: 'Permite a los negocios gestionar un catálogo digital con carrito de WhatsApp.', limit: -1, idOverride: 'catalogo' },
  { name: 'Blog Profesional', description: 'Módulo de artículos y noticias para SEO y fidelización.', limit: 5, idOverride: 'blog' },
  { name: 'Promociones y Ofertas', description: 'Gestión de banners promocionales y cupones de descuento.', limit: 2, idOverride: 'promotions' },
  { name: 'Chatbot de Soporte WhatsApp', description: 'Asistente IA para atención al cliente integrado con WhatsApp API.', limit: -1, idOverride: 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas' },
  { name: 'Google Analytics', description: 'Integración de métricas avanzadas para la landing page.', limit: -1, idOverride: 'google-analytics' },
  { name: 'Directorio de Negocios', description: 'Módulo para listar el negocio en el directorio público de la plataforma.', limit: -1, idOverride: 'business-directory' },
  { name: 'Chatbot Menú Público', description: 'Asistente virtual para el menú público que responde preguntas de los visitantes sobre productos, precios, horarios y promociones del negocio.', limit: -1, idOverride: PUBLIC_MENU_CHATBOT_MODULE_ID },
  { 
    name: 'Fidelización e Inteligencia (IA)', 
    description: 'Sistema de puntos, ranking VIP, reseñas y recuperación automática de clientes mediante IA por WhatsApp.', 
    limit: -1, 
    idOverride: 'loyalty' 
  },
  { 
    name: 'Contabilidad', 
    description: 'Módulo integral de gestión contable, plan de cuentas y asientos para el negocio.', 
    limit: -1, 
    idOverride: 'contabilidad' 
  },
  { 
    name: 'Inventario Kardex', 
    description: 'Control detallado de inventario, movimientos de entrada/salida y valuación de stock.', 
    limit: -1, 
    idOverride: 'inventario-kardex' 
  },
  { 
    name: 'Pistola Escáner', 
    description: 'Configuración y gestión de lectores de códigos de barras para puntos de venta y bodega.', 
    limit: -1, 
    idOverride: 'pistola-escaner' 
  },
];

export default function ModulesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const modulesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'modules');
  }, [firestore]);

  const { data: modules, isLoading } = useCollection<Module>(modulesQuery);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
  });

  useEffect(() => {
    if (!isLoading && modules && firestore) {
      // 1. Sincronización de módulos por defecto (Seeding)
      DEFAULT_MODULES.forEach(async (m) => {
        const moduleId = m.idOverride || m.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, "");
        const exists = modules.some(existing => existing.id === moduleId);

        if (!exists) {
          console.log(`[ModuleSeeder] Sincronizando módulo faltante: ${m.name} (${moduleId})`);
          const docRef = doc(firestore, 'modules', moduleId);
          await setDocumentNonBlocking(docRef, {
            id: moduleId,
            name: m.name,
            description: m.description,
            limit: m.limit,
            status: 'inactive',
            createdAt: new Date().toISOString(),
          });
          console.log(`[ModuleSeeder] Módulo ${m.name} sincronizado con éxito.`);
        }
      });

      // 2. Limpieza de módulos huérfanos/legacy conocidos (Mantenimiento)
      const legacyIds = ['kardex']; 
      legacyIds.forEach(async (id) => {
        const orphaned = modules.find(m => m.id === id);
        if (orphaned) {
          console.log(`[Cleanup] Eliminando módulo huérfano detectado: ${id}`);
          const docRef = doc(firestore, 'modules', id);
          // Eliminación física para limpiar la colección global y los paneles administrativos
          await deleteDocumentNonBlocking(docRef);
          toast({ title: "Limpieza de sistema", description: `Módulo duplicado "${id}" eliminado.` });
        }
      });
    }
  }, [modules, isLoading, firestore, toast]);

  const onSubmit = async (data: ModuleFormData) => {
    if (!firestore) return;

    const moduleId = editingModule?.id || data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, "");
    const docRef = doc(firestore, 'modules', moduleId);

    const moduleData: any = {
      id: moduleId,
      name: data.name,
      description: data.description,
      limit: data.limit,
      updatedAt: new Date().toISOString(),
    };

    if (!editingModule) {
      moduleData.status = 'active';
      moduleData.createdAt = new Date().toISOString();
    }

    try {
      await setDocumentNonBlocking(docRef, moduleData, { merge: true });
      toast({ title: editingModule ? "Módulo actualizado" : "Módulo creado" });
      handleCloseDialog();
    } catch (e) {
      toast({ variant: 'destructive', title: "Error al guardar" });
    }
  };

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setValue('name', module.name);
    setValue('description', module.description);
    setValue('limit', module.limit || -1);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setEditingModule(null);
    reset();
    setDialogOpen(false);
  };

  const handleToggleStatus = (module: Module) => {
    if (!firestore) return;
    const newStatus = module.status === 'active' ? 'inactive' : 'active';
    const docRef = doc(firestore, 'modules', module.id);
    updateDocumentNonBlocking(docRef, { status: newStatus });
    toast({ title: "Estado actualizado" });
  };

  const handleDelete = (id: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'modules', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Módulo eliminado" });
  };

  if (isLoading && !modules) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Módulos de la Plataforma</CardTitle>
            <CardDescription>Configura las funcionalidades disponibles para los negocios.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingModule(null); reset(); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Módulo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}</DialogTitle>
                <DialogDescription>Define el comportamiento global del módulo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" {...register('description')} />
                  {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
                </div>
                <div>
                  <Label htmlFor="limit">Límite por defecto (-1 para ilimitado)</Label>
                  <Input id="limit" type="number" {...register('limit', { valueAsNumber: true })} />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules?.map((module) => (
          <Card key={module.id} className="flex flex-col">
            <CardHeader className="flex flex-row justify-between items-start space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {module.name}
                </CardTitle>
                <Badge variant={module.status === 'active' ? 'default' : 'secondary'}>
                  {module.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(module)}>
                  <Settings className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción afectará a todos los negocios que usen este módulo.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(module.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">{module.description}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-2 uppercase tracking-tighter">ID: {module.id}</p>
            </CardContent>
            <CardFooter className="border-t bg-muted/10 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={module.status === 'active'} 
                  onCheckedChange={() => handleToggleStatus(module)} 
                />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado Global</span>
              </div>
              <div className="text-right">
                 <span className="text-[10px] text-muted-foreground uppercase font-bold">Límite base</span>
                 <p className="text-sm font-black">{module.limit === -1 ? '∞' : module.limit}</p>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {(!modules || modules.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="h-40 flex flex-col items-center justify-center text-center gap-2">
             <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
             <p className="text-muted-foreground">No hay módulos configurados. Los módulos por defecto se están inicializando...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
