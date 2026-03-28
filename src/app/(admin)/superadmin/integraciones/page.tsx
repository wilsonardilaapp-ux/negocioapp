'use client';

import { useState, useEffect, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Plug, Cloud, CheckCircle, XCircle, Loader2, Eye, EyeOff, Bot } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';
import type { Integration, CloudinaryFields, AIProviderFields, WhapiFields } from '@/models/integration';
import { testApiKey } from '@/ai/flows/test-api-key-flow';
import { testWhapiConnection } from '@/ai/flows/test-whapi-connection-flow';
import { saveIntegration } from '@/actions/save-integration';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    ),
  ]);
};

// Integraciones que el sistema garantiza que existan
const REQUIRED_INTEGRATIONS = [
  { id: 'cloudinary', name: 'Cloudinary' },
  { id: 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas', name: 'Chatbot IA (Google/OpenAI/Groq)' },
  { id: 'whapi-whatsapp', name: 'WHAPI (WhatsApp)' },
];

// --- Formularios de Configuración ---

const CloudinaryForm = ({ integration, onSave, onCancel, isSaving }: { integration: Integration; onSave: (data: CloudinaryFields) => void; onCancel: () => void; isSaving: boolean; }) => {
  const [fields, setFields] = useState<CloudinaryFields>(() => {
    let parsed: Partial<CloudinaryFields> = {};
    try {
      if (typeof integration.fields === 'string' && integration.fields.trim()) {
        parsed = JSON.parse(integration.fields);
      } else if (typeof integration.fields === 'object' && integration.fields !== null) {
        parsed = integration.fields as Partial<CloudinaryFields>;
      }
    } catch (e) { console.error('Cloudinary parse error', e); }
    return { cloud_name: parsed.cloud_name || '', api_key: parsed.api_key || '', api_secret: parsed.api_secret || '' };
  });
  const [showApiSecret, setShowApiSecret] = useState(false);

  return (
    <div className="space-y-4">
      <div><Label>Cloud Name</Label><Input value={fields.cloud_name} onChange={(e) => setFields(prev => ({ ...prev, cloud_name: e.target.value }))} disabled={isSaving} /></div>
      <div><Label>API Key</Label><Input value={fields.api_key} onChange={(e) => setFields(prev => ({ ...prev, api_key: e.target.value }))} disabled={isSaving} /></div>
      <div className="relative">
        <Label>API Secret</Label>
        <Input type={showApiSecret ? 'text' : 'password'} value={fields.api_secret} onChange={(e) => setFields(prev => ({ ...prev, api_secret: e.target.value }))} className="pr-10" disabled={isSaving} />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7" onClick={() => setShowApiSecret(!showApiSecret)} disabled={isSaving}>
          {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar Cambios</Button>
      </DialogFooter>
    </div>
  );
};

type Provider = 'google' | 'openai' | 'groq';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ModalState = { isOpen: boolean; title: string; message: string };

const AIProviderForm = ({ integration, onSave, onCancel, isSaving }: any) => {
  const [fields, setFields] = useState<AIProviderFields>(() => {
    let parsed: any = {};
    try {
      parsed = typeof integration.fields === 'string' && integration.fields.trim() ? JSON.parse(integration.fields) : (integration.fields || {});
    } catch { parsed = {}; }
    return {
      google: { apiKey: parsed?.google?.apiKey || '' },
      openai: { apiKey: parsed?.openai?.apiKey || '' },
      groq:   { apiKey: parsed?.groq?.apiKey   || '' },
    };
  });
  const [testStatus, setTestStatus] = useState<Record<Provider, TestStatus>>({ google: 'idle', openai: 'idle', groq: 'idle' });
  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: '', message: '' });

  const handleTest = async (p: Provider) => {
    if (!fields[p]?.apiKey) {
      setModal({ isOpen: true, title: 'Error', msg: `Introduce la API Key para ${p}.` });
      return;
    }
    setTestStatus(prev => ({ ...prev, [p]: 'testing' }));
    const res = await testApiKey({ provider: p, apiKey: fields[p]!.apiKey });
    setTestStatus(prev => ({ ...prev, [p]: res.success ? 'success' : 'error' }));
    setModal({ isOpen: true, title: res.success ? 'Éxito' : 'Error', msg: res.message });
  };

  return (
    <div className="space-y-6">
      {(['google', 'openai', 'groq'] as Provider[]).map((p) => (
        <Card key={p}>
          <CardHeader><CardTitle className="text-lg capitalize">{p}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label>API Key</Label>
            <Input type="password" value={fields[p]?.apiKey || ''} onChange={(e) => setFields(prev => ({ ...prev, [p]: { ...prev[p], apiKey: e.target.value } }))} />
            <Button variant="outline" size="sm" onClick={() => handleTest(p)} disabled={testStatus[p] === 'testing'}>
              {testStatus[p] === 'testing' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Probar'}
            </Button>
          </CardContent>
        </Card>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>Guardar</Button>
      </DialogFooter>
      <AlertDialog open={modal.isOpen} onOpenChange={(o) => setModal(m => ({ ...m, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{modal.title}</AlertDialogTitle><AlertDialogDescription>{modal.msg}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction>Cerrar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const WhapiForm = ({ integration, onSave, onCancel, isSaving }: any) => {
  const [fields, setFields] = useState<WhapiFields>(() => {
    let parsed: any = {};
    try { parsed = typeof integration.fields === 'string' && integration.fields.trim() ? JSON.parse(integration.fields) : (integration.fields || {}); } catch { parsed = {}; }
    return { apiKey: parsed?.apiKey || '', instanceId: parsed?.instanceId || '' };
  });

  return (
    <div className="space-y-4">
      <div><Label>API Key</Label><Input type="password" value={fields.apiKey} onChange={(e) => setFields(prev => ({ ...prev, apiKey: e.target.value }))} /></div>
      <div><Label>Instance ID</Label><Input value={fields.instanceId} onChange={(e) => setFields(prev => ({ ...prev, instanceId: e.target.value }))} /></div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>Guardar</Button>
      </DialogFooter>
    </div>
  );
};

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const newIntegrationSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres.'),
  description: z.string().optional(),
});

export default function IntegrationsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const didInit = useRef(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof newIntegrationSchema>>({
    resolver: zodResolver(newIntegrationSchema),
  });

  const integrationsQuery = useMemoFirebase(
    () => (!firestore ? null : collection(firestore, 'integrations')),
    [firestore],
  );
  const { data: integrations, isLoading } = useCollection<Integration>(integrationsQuery);

  // Inicialización segura de integraciones requeridas
  useEffect(() => {
    if (!firestore || isLoading || !Array.isArray(integrations) || didInit.current) return;

    const initialize = async () => {
      didInit.current = true;
      const existingIds = new Set(integrations.map(i => i.id));
      for (const req of REQUIRED_INTEGRATIONS) {
        if (!existingIds.has(req.id)) {
          const docRef = doc(firestore, 'integrations', req.id);
          try {
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
              await setDoc(docRef, { 
                id: req.id, 
                name: req.name, 
                status: 'inactive',
                fields: '{}',
                updatedAt: new Date().toISOString() 
              });
            }
          } catch (e) {
            console.warn(`Firestore no disponible para verificar ${req.id}, se reintentará.`, e);
          }
        }
      }
    };
    initialize();
  }, [firestore, isLoading, integrations]);

  const handleStatusChange = async (integration: Integration) => {
    if (!firestore) return;
    const newStatus = integration.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(firestore, 'integrations', integration.id), { status: newStatus });
      toast({ title: "Estado actualizado" });
    } catch {
      toast({ variant: 'destructive', title: "Error al actualizar" });
    }
  };

  const handleSave = async (formData: any) => {
    if (!editingIntegration || !firestore) return;
    setIsSaving(true);
    try {
      await saveIntegration(editingIntegration.id, { fields: JSON.stringify(formData) });
      toast({ title: 'Configuración guardada' });
      setEditingIntegration(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateIntegration = async (data: z.infer<typeof newIntegrationSchema>) => {
    if (!firestore) return;
    const id = slugify(data.name);
    try {
      await setDoc(doc(firestore, 'integrations', id), { 
          id, 
          name: data.name, 
          description: data.description || '', 
          fields: '{}', 
          status: 'inactive', 
          updatedAt: new Date().toISOString() 
      }, { merge: true });
      toast({ title: 'Integración Creada' });
      setCreateDialogOpen(false);
      reset();
    } catch {
      toast({ variant: 'destructive', title: 'Error al crear' });
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Gestión de Integraciones</CardTitle>
            <CardDescription>Conecta servicios de terceros para ampliar funcionalidades.</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Crear Integración</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Nueva Integración</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(handleCreateIntegration)} className="space-y-4">
                <div><Label>Nombre</Label><Input {...register('name')} />{errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}</div>
                <div><Label>Descripción</Label><Input {...register('description')} /></div>
                <DialogFooter><Button type="submit">Crear</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(integrations ?? []).map((item) => {
          const icon = item.id === 'cloudinary' ? <Cloud className="h-8 w-8" /> : item.id === 'whapi-whatsapp' ? <WhatsAppIcon className="h-8 w-8" /> : <Bot className="h-8 w-8" />;
          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4"><div className="p-3 bg-muted rounded-lg">{icon}</div><CardTitle className="text-base">{item.name}</CardTitle></div>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between border p-4 rounded-md">
                  <Label>Estado</Label>
                  <Switch checked={item.status === 'active'} onCheckedChange={() => handleStatusChange(item)} />
                </div>
              </CardContent>
              <CardFooter>
                 <Dialog open={editingIntegration?.id === item.id} onOpenChange={(o) => !o && setEditingIntegration(null)}>
                  <DialogTrigger asChild><Button variant="outline" className="w-full" onClick={() => setEditingIntegration(item)}>Editar</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Configurar {item.name}</DialogTitle></DialogHeader>
                    {item.id === 'cloudinary' && <CloudinaryForm integration={item} onSave={handleSave} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />}
                    {item.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas' && <AIProviderForm integration={item} onSave={handleSave} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />}
                    {item.id === 'whapi-whatsapp' && <WhapiForm integration={item} onSave={handleSave} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />}
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
