'use client';

import { useState, useEffect, useTransition } from 'react';
import { useCollection, useFirestore, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, updateDoc } from 'firebase/firestore';
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
import type { Module } from '@/models/module';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Box, FileText, Edit, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import { saveModule } from '@/actions/modules';

const moduleSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  limit: z.preprocess(
      (val) => (val === '' || val === undefined || val === null ? -1 : Number(val)),
      z.number().min(-1, "El límite debe ser -1 (ilimitado) o un número positivo.")
  ),
});

const DEFAULT_MODULES: { name: string; description: string; limit: number; }[] = [
    { name: 'Catálogo', description: 'Módulo para gestionar el catálogo de productos.', limit: 50 },
    { name: 'Blog', description: 'Módulo para gestionar el blog', limit: 10 },
    { name: 'Chatbot Integrado con WhatsApp', description: 'Asistente IA para WhatsApp y Web', limit: -1 },
    { name: 'Motor de Sugerencias Inteligentes', description: 'Motor para sugerir productos', limit: -1 },
    { name: 'Google Analytics', description: 'Integración con Google Analytics', limit: -1 },
    { name: 'Cloudinary', description: 'Almacenamiento de medios en la nube', limit: -1 },
];

const slugify = (text: string) => 
  text
    .toLowerCase()
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

export default function ModulesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isSaving, startTransition] = useTransition();

  const modulesQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'modules');
  }, [firestore]);
  
  const { data: modules, isLoading } = useCollection<Module>(modulesQuery);

  // Self-healing useEffect
  useEffect(() => {
      if (isLoading || !firestore || !modules) return;
      
      const checkAndCreateModules = async () => {
          for (const defaultModule of DEFAULT_MODULES) {
              const modId = slugify(defaultModule.name);
              const exists = modules.some(m => m.id === modId);
              if (!exists) {
                  console.log(`Module "${defaultModule.name}" missing, creating...`);
                  await saveModule({
                      id: modId,
                      ...defaultModule
                  });
              }
          }
      };

      checkAndCreateModules();

  }, [isLoading, modules, firestore]);
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<z.infer<typeof moduleSchema>>({
      resolver: zodResolver(moduleSchema),
  });
  
  useEffect(() => {
      if (editingModule) {
          setValue('name', editingModule.name);
          setValue('description', editingModule.description);
          setValue('limit', editingModule.limit ?? -1);
      } else {
          reset({ name: '', description: '', limit: -1 });
      }
  }, [editingModule, setValue, reset]);
  
  const handleOpenDialog = (module: Module | null) => {
      setEditingModule(module);
      setDialogOpen(true);
  }
  
  const handleOpenChange = (open: boolean) => {
      if (isSaving) return;
      setDialogOpen(open);
      if (!open) {
          setEditingModule(null);
          reset();
      }
  };
  
  const handleStatusChange = async (module: Module) => {
      if (!firestore) return;
      const newStatus = module.status === 'active' ? 'inactive' : 'active';
      const moduleDocRef = doc(firestore, 'modules', module.id);
      try {
          await updateDoc(moduleDocRef, { status: newStatus });
          toast({ title: "Estado actualizado", description: `El módulo "${module.name}" ahora está ${newStatus === 'active' ? 'activo' : 'inactivo'}.` });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
      }
  };
  
  const handleDelete = (module: Module) => {
      if (!firestore) return;
      const moduleDocRef = doc(firestore, 'modules', module.id);
      deleteDocumentNonBlocking(moduleDocRef);
      toast({ title: "Módulo eliminado", description: `El módulo "${module.name}" ha sido eliminado.`, variant: 'destructive' });
  }
  
  const onSubmit = (data: z.infer<typeof moduleSchema>) => {
      startTransition(async () => {
          const result = await saveModule({
              id: editingModule?.id,
              name: data.name,
              description: data.description,
              limit: data.limit,
          });

          if (result.success) {
              toast({ title: `Módulo ${editingModule ? 'Actualizado' : 'Creado'}`, description: `El módulo "${data.name}" ha sido guardado.` });
              handleOpenChange(false);
          } else {
              toast({ variant: "destructive", title: "Error", description: result.error || "No se pudo guardar el módulo." });
          }
      });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> Cargando módulos...</div>;
  }

  return (
      <div className="flex flex-col gap-6">
          <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                  <div>
                      <CardTitle>Módulos de la Plataforma</CardTitle>
                      <CardDescription>Gestiona las funcionalidades principales que estarán disponibles para los clientes.</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenDialog(null)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Módulo
                  </Button>
              </CardHeader>
          </Card>
          
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
              <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                      <DialogTitle>{editingModule ? 'Editar Módulo' : 'Añadir Nuevo Módulo'}</DialogTitle>
                      <DialogDescription>
                          {editingModule ? `Editando el módulo "${editingModule.name}".` : 'El ID del módulo se generará a partir del nombre.'}
                      </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                          <Label htmlFor="name" className="text-right">Nombre del Módulo</Label>
                          <Input id="name" {...register("name")} placeholder="Ej. Blog Profesional" />
                          {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                      </div>
                      <div>
                          <Label htmlFor="description" className="text-right">Descripción</Label>
                          <Textarea id="description" {...register("description")} placeholder="Describe la función de este módulo." />
                          {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
                      </div>
                      <div>
                          <Label htmlFor="limit" className="text-right">Límite de Registros Permitidos</Label>
                          <Input id="limit" type="number" {...register("limit")} placeholder="Ej: 50. Dejar vacío o -1 para ilimitado." />
                          {errors.limit && <p className="text-sm text-destructive mt-1">{errors.limit.message}</p>}
                      </div>
                      <DialogFooter>
                          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={isSaving}>Cancelar</Button>
                          <Button type="submit" disabled={isSaving}>
                              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isSaving ? 'Guardando...' : 'Guardar'}
                          </Button>
                      </DialogFooter>
                  </form>
              </DialogContent>
          </Dialog>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(modules ?? []).length > 0 ? (
                  modules?.map((module) => (
                      <Card key={module.id} className="flex flex-col">
                          <CardHeader>
                              <div className="flex justify-between items-start gap-4">
                                  <div className="space-y-1.5">
                                      <CardTitle className="flex items-center gap-2">{module.name}</CardTitle>
                                      <CardDescription>{module.description}</CardDescription>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                      <Badge variant={module.status === 'active' ? 'default' : 'secondary'}>
                                          {module.status === 'active' ? 'Activo' : 'Inactivo'}
                                      </Badge>
                                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(module)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Configurar
                                      </Button>
                                  </div>
                              </div>
                          </CardHeader>
                          <CardContent className="grid gap-6 flex-grow">
                              <div
                                  className="flex items-center justify-between space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => handleOpenDialog(module)}
                              >
                                  <div className="space-y-0.5">
                                      <Label className="text-base cursor-pointer">Límite</Label>
                                      <p className="text-sm text-muted-foreground">
                                          {module.limit === -1 || module.limit === undefined ? 'Ilimitado' : `${module.limit} registros`}
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="flex items-center space-x-2">
                                          <Label htmlFor={`status-${module.id}`} className="text-sm font-medium">Estado</Label>
                                          <Switch
                                              id={`status-${module.id}`}
                                              checked={module.status === 'active'}
                                              onCheckedChange={() => handleStatusChange(module)}
                                          />
                                      </div>
                                  </div>
                              </div>
                          </CardContent>
                          <CardFooter>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="sm" className="w-full">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Eliminar Módulo
                                      </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta acción eliminará permanentemente el módulo "{module.name}" y no se puede deshacer.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDelete(module)} className="bg-destructive hover:bg-destructive/90">Sí, eliminar</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </CardFooter>
                      </Card>
                  ))
              ) : (
                  <Card className="md:col-span-2 lg:col-span-3">
                      <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                          <div className="p-4 bg-secondary rounded-full">
                              <Box className="h-12 w-12 text-muted-foreground" />
                          </div>
                          <h3 className="text-xl font-semibold">No hay módulos creados</h3>
                          <p className="text-muted-foreground max-w-sm">
                              Los módulos se crearán automáticamente durante el registro de un nuevo usuario.
                          </p>
                      </CardContent>
                  </Card>
              )}
          </div>
      </div>
  );
}
