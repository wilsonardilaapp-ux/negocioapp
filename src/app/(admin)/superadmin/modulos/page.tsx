"use client";

import { useState, useEffect, useTransition } from 'react';
import { 
    useCollection, 
    useFirestore, 
    useMemoFirebase, 
    setDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
    updateDocumentNonBlocking 
} from '../../../../firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../../../components/ui/card';
import { Switch } from '../../../../components/ui/switch';
import { Label } from '../../../../components/ui/label';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "../../../../hooks/use-toast";
import { PlusCircle, Trash2, Settings, Loader2, Package, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "../../../../components/ui/dialog";
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
} from '../../../../components/ui/alert-dialog';
import { Module, DEFAULT_MODULES } from '../../../../models/module';

const moduleSchema = z.object({
  id: z.string().min(1, "El ID es requerido para la persistencia técnica.").optional(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  description: z.string().min(5, "La descripción es muy corta."),
  limit: z.number().min(-1, "Usa -1 para ilimitado."),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

export default function ModulesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  const modulesQuery = useMemoFirebase(() => collection(firestore, 'modules'), [firestore]);
  const { data: modules, isLoading } = useCollection<Module>(modulesQuery);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
  });

  // Efecto de inicialización / sincronización
  useEffect(() => {
    if (!isLoading && modules && firestore && !isSyncing) {
      const missingModules = DEFAULT_MODULES.filter(m => !modules.some(existing => existing.id === m.id));
      if (missingModules.length > 0) {
        syncDefaultModules(missingModules);
      }
    }
  }, [modules, isLoading]);

  const syncDefaultModules = async (missing: any[]) => {
    setIsSyncing(true);
    try {
        for (const m of missing) {
            await setDocumentNonBlocking(doc(firestore, 'modules', m.id), { 
                ...m, 
                status: 'inactive', 
                createdAt: new Date().toISOString() 
            });
        }
        toast({ title: "Sincronización completa", description: `Se han inyectado ${missing.length} módulos base.` });
    } catch (e) {
        console.error("Sync error", e);
    } finally {
        setIsSyncing(false);
    }
  };

  const handleOpenEdit = (mod: Module) => {
    setEditingModule(mod);
    reset({
        id: mod.id,
        name: mod.name,
        description: mod.description,
        limit: mod.limit || -1,
    });
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingModule(null);
    reset({ id: '', name: '', description: '', limit: -1 });
    setDialogOpen(true);
  };

  const onSubmit = async (data: ModuleFormData) => {
    if (!firestore) return;
    const moduleId = editingModule?.id || data.id || data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    try {
        await setDocumentNonBlocking(doc(firestore, 'modules', moduleId), { 
            ...data, 
            id: moduleId, 
            status: editingModule?.status || 'inactive',
            updatedAt: new Date().toISOString(),
            ...( !editingModule && { createdAt: new Date().toISOString() } )
        }, { merge: true });

        toast({ title: editingModule ? "Módulo actualizado" : "Módulo creado" });
        setDialogOpen(false);
        reset();
    } catch (e) {
        toast({ variant: 'destructive', title: "Error al guardar" });
    }
  };

  const handleToggleStatus = (mod: Module, checked: boolean) => {
    if (!firestore) return;
    startStatusTransition(async () => {
        try {
            await updateDocumentNonBlocking(doc(firestore, 'modules', mod.id), { 
                status: checked ? 'active' : 'inactive',
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            toast({ variant: 'destructive', title: "Fallo al cambiar estado" });
        }
    });
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
        await deleteDocumentNonBlocking(doc(firestore, 'modules', id));
        toast({ title: "Módulo eliminado", variant: 'destructive' });
    } catch (e) {
        toast({ variant: 'destructive', title: "Error al eliminar" });
    }
  };

  if (isLoading && !modules) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Catálogo Maestro de Módulos</CardTitle>
            <CardDescription>Gestiona las funcionalidades disponibles para los negocios en Markix.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => syncDefaultModules(DEFAULT_MODULES)} disabled={isSyncing}>
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar Base
            </Button>
            <Button onClick={handleOpenCreate}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Módulo
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules?.map(m => (
          <Card key={m.id} className="flex flex-col overflow-hidden border-gray-100 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold">{m.name}</CardTitle>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">{m.id}</Badge>
                    </div>
                    <Switch 
                        checked={m.status === 'active'} 
                        onCheckedChange={(c) => handleToggleStatus(m, c)}
                        disabled={isUpdatingStatus}
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">{m.description}</p>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-muted/50 p-2 rounded-md">
                    <Package className="h-3.5 w-3.5" />
                    Límite Base: {m.limit === -1 ? 'Ilimitado' : m.limit}
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 font-bold" onClick={() => handleOpenEdit(m)}>
                    <Settings className="h-4 w-4 mr-2" /> Configurar
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar módulo permanentemente?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción es irreversible y afectará a todos los negocios que utilicen este módulo.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(m.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}</DialogTitle>
            <DialogDescription>Define la identidad técnica y comercial del componente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            {!editingModule && (
                <div>
                    <Label htmlFor="id">Identificador Técnico (ID)</Label>
                    <Input id="id" {...register('id')} placeholder="ej: inventario-pro" />
                    {errors.id && <p className="text-xs text-destructive mt-1">{errors.id.message}</p>}
                </div>
            )}
            <div>
              <Label htmlFor="name">Nombre Público</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="description">Descripción Detallada</Label>
              <Textarea id="description" {...register('description')} className="resize-none" rows={4} />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <Label htmlFor="limit">Límite Base de Registros (-1 = Infinito)</Label>
              <Input id="limit" type="number" {...register('limit', { valueAsNumber: true })} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Módulo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
