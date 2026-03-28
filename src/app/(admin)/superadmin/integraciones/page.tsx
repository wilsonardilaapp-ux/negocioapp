'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
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
import type { Module } from '@/models/module';
import { testApiKey } from '@/ai/flows/test-api-key-flow';
import { testWhapiConnection } from '@/ai/flows/test-whapi-connection-flow';
import { createIntegration, saveIntegrationFields, updateIntegrationStatus } from '@/actions/integrations';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      if (typeof integration.fields === 'string' && integration.fields.trim()) {
        parsed = JSON.parse(integration.fields);
      } else if (typeof integration.fields === 'object' && integration.fields !== null) {
        parsed = integration.fields as Partial<CloudinaryFields>;
      }
    } catch (e) { console.error('Cloudinary parse error', e); }
    return { cloud_name: parsed.cloud_name || '', api_key: parsed.api_key || '', api_secret: parsed.api_secret || '' };
  });
  const [showApiSecret, setShowApiSecret] = useState(false);

  const handleSaveClick = () => {
    if (!fields.cloud_name || !fields.api_key || !fields.api_secret) {
      toast({ variant: 'destructive', title: 'Campos Incompletos', description: 'Completa Cloud Name, API Key y API Secret.' });
      return;
    }
    onSave(fields);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="cloud_name">Cloud Name</Label>
        <Input id="cloud_name" value={fields.cloud_name} onChange={(e) => setFields(prev => ({ ...prev, cloud_name: e.target.value }))} disabled={isSaving} />
      </div>
      <div>
        <Label htmlFor="api_key">API Key</Label>
        <Input id="api_key" value={fields.api_key} onChange={(e) => setFields(prev => ({ ...prev, api_key: e.target.value }))} disabled={isSaving} />
      </div>
      <div className="relative">
        <Label htmlFor="api_secret">API Secret</Label>
        <Input
          id="api_secret"
          type={showApiSecret ? 'text' : 'password'}
          value={fields.api_secret}
          onChange={(e) => setFields(prev => ({ ...prev, api_secret: e.target.value }))}
          className="pr-10"
          disabled={isSaving}
        />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7"
          onClick={() => setShowApiSecret(prev => !prev)} disabled={isSaving}>
          {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={handleSaveClick} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Cambios
        </Button>
      </DialogFooter>
    </div>
  );
};

type Provider = 'google' | 'openai' | 'groq';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ModalState = { isOpen: boolean; title: string; message: string };

const AIProviderForm = ({
  integration, onSave, onCancel, isSaving,
}: {
  integration: Integration;
  onSave: (data: AIProviderFields) => void;
  onCancel: () => void;
  isSaving: boolean;
}) => {
  const [fields, setFields] = useState<AIProviderFields>(() => {
    let parsed: any = {};
    try {
      if (typeof integration.fields === 'string' && integration.fields.trim()) {
        parsed = JSON.parse(integration.fields);
      } else if (typeof integration.fields === 'object' && integration.fields !== null) {
        parsed = integration.fields;
      }
    } catch (e) { console.error('AI parse error', e); }
    return {
      google: { apiKey: parsed?.google?.apiKey || '' },
      openai: { apiKey: parsed?.openai?.apiKey || '' },
      groq:   { apiKey: parsed?.groq?.apiKey   || '' },
    };
  });
  const [testStatus, setTestStatus] = useState<Record<Provider, TestStatus>>({ google: 'idle', openai: 'idle', groq: 'idle' });
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });

  const handleTestConnection = async (provider: Provider) => {
    const apiKey = fields[provider]?.apiKey;
    if (!apiKey) { setModalState({ isOpen: true, title: 'API Key Requerida', message: `Introduce una API Key para ${provider}.` }); return; }
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
    try {
      const result = await testApiKey({ provider, apiKey });
      setTestStatus(prev => ({ ...prev, [provider]: result.success ? 'success' : 'error' }));
      setModalState({ isOpen: true, title: result.success ? 'Éxito' : 'Error', message: result.message });
    } catch (error: any) {
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
      setModalState({ isOpen: true, title: 'Error', message: error.message || 'Fallo de conexión.' });
    }
  };

  const TestButton = ({ provider }: { provider: Provider }) => {
    const status = testStatus[provider];
    if (status === 'testing') return <Button variant="outline" size="sm" disabled><Loader2 className="h-4 w-4 animate-spin mr-2" />Probando...</Button>;
    if (status === 'success') return <Button variant="ghost" size="sm" className="text-green-600" disabled><CheckCircle className="h-4 w-4 mr-2" />¡Éxito!</Button>;
    if (status === 'error')   return <Button variant="destructive" size="sm" onClick={() => handleTestConnection(provider)}><XCircle className="h-4 w-4 mr-2" />Reintentar</Button>;
    return <Button variant="outline" size="sm" onClick={() => handleTestConnection(provider)}>Probar Conexión</Button>;
  };

  return (
    <div className="space-y-6">
      {(['google', 'openai', 'groq'] as Provider[]).map((p) => (
        <Card key={p}>
          <CardHeader><CardTitle className="text-lg capitalize">{p === 'google' ? 'Google AI Studio' : p}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label>API Key</Label>
            <Input type="password" value={fields[p]?.apiKey || ''} onChange={(e) => {
              setFields(prev => ({ ...prev, [p]: { apiKey: e.target.value } }));
              setTestStatus(prev => ({ ...prev, [p]: 'idle' }));
            }} disabled={isSaving} />
            <TestButton provider={p} />
          </CardContent>
        </Card>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Cambios
        </Button>
      </DialogFooter>
      <AlertDialog open={modalState.isOpen} onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{modalState.title}</AlertDialogTitle><AlertDialogDescription>{modalState.message}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}>Cerrar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const WhapiForm = ({
  integration, onSave, onCancel, isSaving,
}: {
  integration: Integration;
  onSave: (data: WhapiFields) => void;
  onCancel: () => void;
  isSaving: boolean;
}) => {
  const [fields, setFields] = useState<WhapiFields>(() => {
    let parsed: any = {};
    try {
      if (typeof integration.fields === 'string' && integration.fields.trim()) {
        parsed = JSON.parse(integration.fields);
      } else if (typeof integration.fields === 'object' && integration.fields !== null) {
        parsed = integration.fields;
      }
    } catch (e) { console.error('Whapi parse error', e); }
    return { apiKey: parsed?.apiKey || '', instanceId: parsed?.instanceId || '' };
  });
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });

  const handleTestConnection = async () => {
    if (!fields.apiKey || !fields.instanceId) return;
    setTestStatus('testing');
    try {
      const result = await testWhapiConnection(fields);
      setTestStatus(result.success ? 'success' : 'error');
      setModalState({ isOpen: true, title: result.success ? 'Éxito' : 'Error', message: result.message });
    } catch { setTestStatus('error'); }
  };

  return (
    <div className="space-y-4">
      <div><Label>API Key</Label><Input type="password" value={fields.apiKey} onChange={(e) => setFields(prev => ({ ...prev, apiKey: e.target.value }))} disabled={isSaving} /></div>
      <div><Label>Instance ID</Label><Input value={fields.instanceId} onChange={(e) => setFields(prev => ({ ...prev, instanceId: e.target.value }))} disabled={isSaving} /></div>
      <Button variant="outline" className="w-full" onClick={handleTestConnection} disabled={isSaving || testStatus === 'testing'}>
        {testStatus === 'testing' && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Probar Conexión
      </Button>
      <DialogFooter className="pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Cambios
        </Button>
      </DialogFooter>
      <AlertDialog open={modalState.isOpen} onOpenChange={(open) => setModalState(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{modalState.title}</AlertDialogTitle><AlertDialogDescription>{modalState.message}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}>Cerrar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const newIntegrationSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  description: z.string().optional(),
});
type NewIntegrationFormData = z.infer<typeof newIntegrationSchema>;

const REQUIRED_INTEGRATIONS: Array<{ id: string; name: string }> = [
    { id: 'cloudinary', name: 'Cloudinary' },
    { id: 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas', name: 'Chatbot IA (Google/OpenAI/Groq)' },
    { id: 'whapi-whatsapp', name: 'WHAPI (WhatsApp)' },
];

export default function IntegrationsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);

  const [isCreating, startCreateTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewIntegrationFormData>({
    resolver: zodResolver(newIntegrationSchema),
  });

  const integrationsQuery = useMemoFirebase(
    () => (!firestore ? null : collection(firestore, 'integrations')),
    [firestore],
  );
  const { data: integrations, isLoading: isIntegrationsLoading } = useCollection<Integration>(integrationsQuery);
  
  const modulesQuery = useMemoFirebase(
    () => (!firestore ? null : collection(firestore, 'modules')),
    [firestore]
  );
  const { data: modules, isLoading: areModulesLoading } = useCollection<Module>(modulesQuery);

  // Self-healing useEffect to ensure required integrations exist
  useEffect(() => {
    if (isIntegrationsLoading || !firestore || !integrations) return;

    const checkAndCreateIntegrations = () => {
        REQUIRED_INTEGRATIONS.forEach(reqInt => {
            const exists = integrations.some(i => i.id === reqInt.id);
            if (!exists) {
                console.log(`Integration "${reqInt.name}" missing, creating...`);
                // Call server action to create. No need to await, useCollection will update UI.
                createIntegration({ name: reqInt.name, description: '' });
            }
        });
    };
    
    checkAndCreateIntegrations();

  }, [isIntegrationsLoading, integrations, firestore]);

  const handleStatusChange = (integration: Integration, checked: boolean) => {
    startStatusTransition(async () => {
        const newStatus = checked ? 'active' : 'inactive';
        const result = await updateIntegrationStatus(integration.id, newStatus);
        if (result.success) {
            toast({ title: 'Estado Actualizado', description: `"${integration.name}" ahora está ${newStatus}.` });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error || 'Error al actualizar.' });
        }
    });
  };

  const handleSaveFields = (formData: any) => {
    if (!editingIntegration) return;
    startSavingTransition(async () => {
      const result = await saveIntegrationFields(editingIntegration.id, JSON.stringify(formData));
      if (result.success) {
        toast({ title: 'Éxito', description: 'Configuración guardada correctamente.' });
        setEditingIntegration(null);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'No se pudo guardar la configuración.' });
      }
    });
  };

  const handleCreateIntegration = (data: NewIntegrationFormData) => {
    startCreateTransition(async () => {
        const result = await createIntegration(data);
        if (result.success) {
            toast({ title: 'Integración Creada', description: `Se ha creado "${data.name}".` });
            handleCreateDialogChange(false);
            reset();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error || 'No se pudo crear la integración.' });
        }
    });
  };
  
  const handleCreateDialogChange = (open: boolean) => {
      if (isCreating) return;
      setCreateDialogOpen(open);
      if (!open) {
          reset();
      }
  }

  const anyTransitionActive = isCreating || isSaving || isUpdatingStatus;

  const isLoading = isIntegrationsLoading || areModulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Gestión de Integraciones</CardTitle>
            <CardDescription>Conecta servicios de terceros para ampliar las funcionalidades.</CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogChange}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" />Crear Integración</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Nueva Integración</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(handleCreateIntegration)} className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input {...register('name')} placeholder="Ej: Mi API Personal" />
                  {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input {...register('description')} placeholder="¿Para qué sirve?" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleCreateDialogChange(false)} disabled={isCreating}>Cancelar</Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(integrations ?? []).map((integration) => {
          const correspondingModule = modules?.find(m => m.id === integration.id);
          const isModuleActive = !!correspondingModule && correspondingModule.status === 'active';
          const isControlDisabled = anyTransitionActive || !isModuleActive;
          const tooltipMessage = !isModuleActive ? 'Activa el módulo correspondiente en la página de "Módulos" para habilitar esta integración.' : '';

          const icon =
            integration.id === 'cloudinary'
              ? <Cloud className="h-8 w-8" />
              : integration.id === 'whapi-whatsapp'
                ? <WhatsAppIcon className="h-8 w-8" />
                : <Bot className="h-8 w-8" />;

          let isConfigured = false;
          try {
            let fields: any = {};
            if (typeof integration.fields === 'string' && integration.fields.trim()) {
              fields = JSON.parse(integration.fields);
            } else if (typeof integration.fields === 'object' && integration.fields !== null) {
              fields = integration.fields;
            }
            if (integration.id === 'cloudinary') {
              isConfigured = !!(fields.cloud_name && fields.api_key && fields.api_secret);
            } else if (integration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas') {
              isConfigured = !!(fields.google?.apiKey || fields.openai?.apiKey || fields.groq?.apiKey);
            } else if (integration.id === 'whapi-whatsapp') {
              isConfigured = !!(fields.apiKey && fields.instanceId);
            } else {
              isConfigured = Object.keys(fields).length > 0;
            }
          } catch { /* isConfigured permanece false */ }

          const isActive = integration.status === 'active';

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg text-muted-foreground">{icon}</div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                  </div>
                  <Badge variant={isActive ? 'default' : 'secondary'}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border p-4 rounded-md">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Estado del Servicio</p>
                    <p className="text-xs text-muted-foreground">
                      {isActive ? 'Operativo' : 'Desactivado'}
                    </p>
                  </div>
                   <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <div>
                                  <Switch
                                      checked={isActive}
                                      onCheckedChange={(c) => handleStatusChange(integration, c)}
                                      disabled={isControlDisabled}
                                  />
                              </div>
                          </TooltipTrigger>
                          {tooltipMessage && <TooltipContent><p>{tooltipMessage}</p></TooltipContent>}
                      </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center justify-between border p-4 rounded-md">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Configuración</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {isConfigured
                        ? <><CheckCircle className="h-4 w-4 text-green-500" /> Listo</>
                        : <><XCircle className="h-4 w-4 text-destructive" /> Pendiente</>}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                 <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <div className="w-full">
                                  <Button className="w-full" onClick={() => setEditingIntegration(integration)} disabled={isControlDisabled}>
                                      <Plug className="mr-2 h-4 w-4" /> Editar Configuración
                                  </Button>
                              </div>
                          </TooltipTrigger>
                           {tooltipMessage && <TooltipContent><p>{tooltipMessage}</p></TooltipContent>}
                      </Tooltip>
                  </TooltipProvider>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={!!editingIntegration}
        onOpenChange={(open) => {
          if (!isSaving) {
            if (!open) {
              setEditingIntegration(null);
            }
          }
        }}
      >
        {editingIntegration && (
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Configurar {editingIntegration.name}</DialogTitle></DialogHeader>
            {editingIntegration.id === 'cloudinary' && (
              <CloudinaryForm integration={editingIntegration} onSave={handleSaveFields} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />
            )}
            {editingIntegration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas' && (
              <AIProviderForm integration={editingIntegration} onSave={handleSaveFields} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />
            )}
            {editingIntegration.id === 'whapi-whatsapp' && (
              <WhapiForm integration={editingIntegration} onSave={handleSaveFields} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />
            )}
            {!['cloudinary', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas', 'whapi-whatsapp'].includes(editingIntegration.id) && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Esta es una integración personalizada. La configuración avanzada se realiza a través de la API.
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
