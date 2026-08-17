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
import { Module, DEFAULT_MODULES } from '@/models/module';

const moduleSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(5),
  limit: z.number().min(-1),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

export default function ModulesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const { data: modules, isLoading } = useCollection<Module>(useMemoFirebase(() => collection(firestore, 'modules'), [firestore]));

  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
  });

  useEffect(() => {
    if (!isLoading && modules && firestore) {
      DEFAULT_MODULES.forEach(async (m) => {
        if (!modules.some(existing => existing.id === m.id)) {
          await setDocumentNonBlocking(doc(firestore, 'modules', m.id), { ...m, status: 'inactive', createdAt: new Date().toISOString() });
        }
      });
    }
  }, [modules, isLoading, firestore]);

  const onSubmit = async (data: ModuleFormData) => {
    const moduleId = editingModule?.id || data.name.toLowerCase().replace(/\s+/g, '-');
    await setDocumentNonBlocking(doc(firestore, 'modules', moduleId), { ...data, id: moduleId, updatedAt: new Date().toISOString() }, { merge: true });
    setDialogOpen(false);
    reset();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card><CardHeader className="flex flex-row justify-between items-center"><CardTitle>Módulos</CardTitle><Button onClick={() => setDialogOpen(true)}>Añadir</Button></CardHeader></Card>
      <div className="grid gap-6 md:grid-cols-3">
        {modules?.map(m => (
          <Card key={m.id}><CardHeader><CardTitle>{m.name}</CardTitle></CardHeader><CardContent>{m.description}</CardContent></Card>
        ))}
      </div>
    </div>
  );
}
