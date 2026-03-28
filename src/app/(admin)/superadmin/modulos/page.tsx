
"use client";

import { useCollection, useFirestore, updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import { PlusCircle, Trash2, Box, FileText, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useState, useEffect } from 'react';

const moduleSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
  description: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres." }),
  limit: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? -1 : Number(val)),
    z.number().min(-1, "El límite debe ser -1 (ilimitado) o un número positivo.")
  ),
});

const slugify = (text: string) => 
  text
    .toLowerCase()
    .normalize("NFD") // Normaliza los caracteres con tilde (ej: á -> a + ´)
    .replace(/[\u0300-\u036f]/g, "") // Elimina los diacríticos (acentos)
    .replace(/\s+/g, '-') // Reemplaza espacios por guiones
    .replace(/[^a-z0-9-]/g, ''); // Elimina cualquier otro caracter no válido

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

  useEffect(() => {
    if (!firestore) return;

    const bootstrapModules = async () => {
        const requiredModules: { [id: string]: Omit<Module, 'id' | 'createdAt'> } = {
            'cloudinary': { name: 'Cloudinary', description: 'Almacenamiento y entrega de imágenes y videos.', status: 'inactive' },
            'chatbot-integrado-con-whatsapp-para-soporte-y-ventas': { name: 'Chatbot IA (Google/OpenAI/Groq)', description: 'Motores de IA para el chatbot (Google, OpenAI, Groq).', status: 'inactive' },
            'whapi-whatsapp': { name: 'WHAPI (WhatsApp)', description: 'Envío de mensajes de WhatsApp a través de WHAPI.', status: 'inactive' },
            'catalogo': { name: 'Catálogo', description: 'Módulo para gestionar el catálogo de productos.', status: 'inactive' },
            'blog': { name: 'Blog', description: 'Módulo para gestionar el blog', status: 'inactive' },
            'motor-de-sugerencias-inteligentes': { name: 'Motor de Sugerencias Inteligentes', description: 'Motor para sugerir productos', status: 'inactive' },
            'google-analytics': { name: 'Google Analytics', description: 'Integración con Google Analytics', status: 'inactive' },
        };
        
         for (const id in requiredModules) {
            const docRef = doc(firestore, 'modules', id);
            try {
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    await setDocumentNonBlocking(docRef, { ...requiredModules[id], id, createdAt: new Date().toISOString() });
                }
            } catch (e) {
                console.error("Error bootstrapping module:", id, e);
            }
        }
    };
    bootstrapModules();
  }, [firestore]);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<z.infer<typeof moduleSchema>>({
    resolver: zodResolver(moduleSchema),
  });

  // Effect to populate form when editingModule changes
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
  
  const handleCloseDialog = () => {
    setEditingModule(null);
    setDialogOpen(false);
  }

  const handleStatusChange = (module: Module) => {
    if (!firestore) return;
    const newStatus = module.status === 'active' ? 'inactive' : 'active';
    const moduleDocRef = doc(firestore, 'modules', module.id);
    updateDocumentNonBlocking(moduleDocRef, { status: newStatus });
    toast({ title: "Estado actualizado", description: `El módulo "${module.name}" ahora está ${newStatus === 'active' ? 'activo' : 'inactivo'}.` });
  };
  
  const handleDelete = (module: Module) => {
    if (!firestore) return;
    if (confirm(`¿Estás seguro de que quieres eliminar el módulo "${module.name}"?`)) {
      const moduleDocRef = doc(firestore, 'modules', module.id);
      deleteDocumentNonBlocking(moduleDocRef);
      toast({ title: "Módulo eliminado", description: `El módulo "${module.name}" ha sido eliminado.`, variant: 'destructive' });
    }
  }

  const onSubmit = (data: z.infer<typeof moduleSchema>) => {
    if (!firestore) return;
    
    const moduleId = editingModule?.id || slugify(data.name);
    
    const moduleRef = doc(firestore, 'modules', moduleId);
    
    const moduleData: Partial<Module> = {
        name: data.name,
        description: data.description,
        limit: data.limit,
    };
    
    if (!editingModule) {
        moduleData.status = 'active';
        moduleData.createdAt = new Date().toISOString();
    }

    setDocumentNonBlocking(moduleRef, moduleData, { merge: true });
    
    toast({ title: `Módulo ${editingModule ? 'Actualizado' : 'Creado'}`, description: `El módulo "${data.name}" ha sido guardado.` });
    handleCloseDialog();
  };

  if (isLoading) {
    return <div>Cargando módulos...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Módulos de la Plataforma</CardTitle>
            <CardDescription>
              Gestiona las funcionalidades principales que estarán disponibles para los clientes.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Módulo
          </Button>
        </CardHeader>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseDialog() }}>
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
              <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules && modules.length > 0 ? (
          modules.map((module) => (
            <Card key={module.id} className="flex flex-col">
              <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                        <CardTitle className="flex items-center gap-2">
                          {module.name}
                        </CardTitle>
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
                    <Label className="text-base cursor-pointer">
                      Límite
                    </Label>
                    <p className="text-sm text-muted-foreground">
                       {module.limit === -1 || module.limit === undefined ? 'Ilimitado' : `${module.limit} registros`}
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor={`status-${module.id}`} className="text-base">
                      Estado
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Activa o desactiva este módulo.
                    </p>
                  </div>
                  <Switch
                    id={`status-${module.id}`}
                    checked={module.status === 'active'}
                    onCheckedChange={() => handleStatusChange(module)}
                  />
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                 <Button variant="destructive" size="sm" className="w-full" onClick={() => handleDelete(module)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Módulo
                </Button>
              </div>
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
                Empieza añadiendo tu primer módulo. Los módulos representan las principales áreas de funcionalidad que ofreces, como "Landing Pages", "Catálogo de Productos" o "Google Analytics".
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
