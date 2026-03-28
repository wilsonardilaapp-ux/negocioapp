'use client';

import { useState, useEffect, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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

const REQUIRED_INTEGRATIONS: Array<{ id: string; name: string }> = [
  { id: 'cloudinary',                                           name: 'Cloudinary' },
  { id: 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas', name: 'Chatbot IA (Google/OpenAI/Groq)' },
  { id: 'whapi-whatsapp',                                       name: 'WHAPI (WhatsApp)' },
];

// ─── Formulario Cloudinary Corregido ─────────────────────────────────────────
const CloudinaryForm = ({
  integration, onSave, onCancel, isSaving,
}: {
  integration: Integration;
  onSave: (data: CloudinaryFields) => void;
  onCancel: () => void;
  isSaving: boolean;
}) => {
  const { toast } = useToast();
  const [fields, setFields] = useState<CloudinaryFields>(() => {
    let parsed: Partial<CloudinaryFields> = {};
    try {
      const f = integration.fields;
      parsed = typeof f === 'string' ? JSON.parse(f || '{}') : (f || {});
    } catch { parsed = {}; }
    return { 
      cloud_name: parsed.cloud_name || '', 
      api_key: parsed.api_key || '', 
      api_secret: parsed.api_secret || '' 
    };
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

// ... (AIProviderForm y WhapiForm se mantienen igual pero asegurando que manejen nulls)
type Provider = 'google' | 'openai' | 'groq';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ModalState = { isOpen: boolean; title: string; message: string };

const AIProviderForm = ({ integration, onSave, onCancel, isSaving }: any) => {
  const [fields, setFields] = useState<AIProviderFields>(() => {
    let parsed: any = {};
    try { parsed = typeof integration.fields === 'string' ? JSON.parse(integration.fields) : (integration.fields || {}); } catch { parsed = {}; }
    return {
      google: { apiKey: parsed?.google?.apiKey || '' },
      openai: { apiKey: parsed?.openai?.apiKey || '' },
      groq:   { apiKey: parsed?.groq?.apiKey   || '' },
    };
  });
  const [testStatus, setTestStatus] = useState<Record<Provider, TestStatus>>({ google: 'idle', openai: 'idle', groq: 'idle' });
  const [modal, setModal] = useState({ open: false, title: '', msg: '' });

  const handleTest = async (p: Provider) => {
    if (!fields[p]?.apiKey) return;
    setTestStatus(prev => ({ ...prev, [p]: 'testing' }));
    try {
      const res = await testApiKey({ provider: p, apiKey: fields[p]!.apiKey });
      setTestStatus(prev => ({ ...prev, [p]: res.success ? 'success' : 'error' }));
      setModal({ open: true, title: res.success ? 'Éxito' : 'Error', msg: res.message });
    } catch { setTestStatus(prev => ({ ...prev, [p]: 'error' })); }
  };

  return (
    <div className="space-y-6">
      {(['google', 'openai', 'groq'] as const).map((p) => (
        <Card key={p}>
          <CardHeader><CardTitle className="text-lg capitalize">{p}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label>API Key</Label>
            <Input type="password" value={fields[p]?.apiKey} onChange={(e) => setFields(prev => ({ ...prev, [p]: { apiKey: e.target.value } }))} />
            <Button variant="outline" size="sm" onClick={() => handleTest(p)} disabled={testStatus[p] === 'testing'}>
              {testStatus[p] === 'testing' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Probar Conexión'}
            </Button>
          </CardContent>
        </Card>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>Guardar Cambios</Button>
      </DialogFooter>
      <AlertDialog open={modal.open} onOpenChange={(o) => setModal(m => ({ ...m, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{modal.title}</AlertDialogTitle><AlertDialogDescription>{modal.msg}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setModal(m => ({ ...m, open: false }))}>Cerrar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const WhapiForm = ({ integration, onSave, onCancel, isSaving }: any) => {
  const [fields, setFields] = useState<WhapiFields>(() => {
    let parsed: any = {};
    try { parsed = typeof integration.fields === 'string' ? JSON.parse(integration.fields) : (integration.fields || {}); } catch { parsed = {}; }
    return { apiKey: parsed?.apiKey || '', instanceId: parsed?.instanceId || '' };
  });

  return (
    <div className="space-y-4">
      <div><Label>API Key</Label><Input type="password" value={fields.apiKey} onChange={(e) => setFields(prev => ({ ...prev, apiKey: e.target.value }))} /></div>
      <div><Label>Instance ID</Label><Input value={fields.instanceId} onChange={(e) => setFields(prev => ({ ...prev, instanceId: e.target.value }))} /></div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>Guardar Cambios</Button>
      </DialogFooter>
    </div>
  );
};


const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const newIntegrationSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres'),
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

  const integrationsQuery = useMemoFirebase(() => (!firestore ? null : collection(firestore, 'integrations')), [firestore]);
  const { data: integrations, isLoading } = useCollection<Integration>(integrationsQuery);

  useEffect(() => {
    if (!firestore || isLoading || !Array.isArray(integrations) || didInit.current) return;
    
    const runSafeInit = async () => {
        didInit.current = true;
        try {
            for (const req of REQUIRED_INTEGRATIONS) {
                const docRef = doc(firestore, 'integrations', req.id);
                const snap = await getDoc(docRef);
                
                if (!snap.exists()) {
                    await setDoc(docRef, { 
                        id: req.id, 
                        name: req.name, 
                        status: 'inactive',
                        fields: '{}',
                        updatedAt: new Date().toISOString() 
                    }, { merge: true });
                }
            }
        } catch (e) {
            console.warn("Firestore offline o cargando: reintentando inicialización...");
        }
    };
    runSafeInit();
  }, [firestore, isLoading, integrations]);

  const handleStatusChange = async (integration: Integration) => {
    if (!firestore) return;
    const newStatus = integration.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(firestore, 'integrations', integration.id), { status: newStatus });
      toast({ title: "Estado Actualizado", description: `${integration.name} está ${newStatus}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Error al actualizar.' });
    }
  };

  const handleSave = async (formData: any) => {
    if (!editingIntegration || !firestore) return;
    setIsSaving(true);
    try {
      const result = await withTimeout(saveIntegration(editingIntegration.id, { fields: JSON.stringify(formData) }), 15000);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Éxito', description: 'Configuración guardada correctamente.' });
      setEditingIntegration(null);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'Error de red.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCreateIntegration = async (data: any) => {
    if (!firestore) return;
    const id = slugify(data.name);
    try {
        await setDoc(doc(firestore, 'integrations', id), { 
            id, name: data.name, description: data.description || '', 
            fields: '{}', status: 'inactive', updatedAt: new Date().toISOString() 
        }, { merge: true });
        toast({ title: 'Creado', description: `Integración "${data.name}" lista.` });
        setCreateDialogOpen(false);
        reset();
    } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear.' });
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div><CardTitle>Gestión de Integraciones</CardTitle><CardDescription>Configura los servicios base y módulos personalizados.</CardDescription></div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" />Crear Integración</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuevo Módulo</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(handleCreateIntegration)} className="space-y-4">
                <div><Label>Nombre</Label><Input {...register('name')} />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
                <div><Label>Descripción</Label><Input {...register('description')} /></div>
                <DialogFooter><Button type="submit">Crear Integración</Button></DialogFooter>
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
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg">{icon}</div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                  </div>
                  <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border p-4 rounded-md">
                  <Label>Estado</Label>
                  <Switch checked={item.status === 'active'} onCheckedChange={() => handleStatusChange(item)} />
                </div>
                <Dialog open={editingIntegration?.id === item.id} onOpenChange={(o) => !o && setEditingIntegration(null)}>
                  <Button variant="outline" className="w-full" onClick={() => setEditingIntegration(item)}>Editar Configuración</Button>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Configurar {item.name}</DialogTitle></DialogHeader>
                    {item.id === 'cloudinary' && <CloudinaryForm integration={item} onSave={handleSave} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}