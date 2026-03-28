'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
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
  DialogDescription,
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

const CloudinaryForm = ({ integration, onSave, onCancel, isSaving }: { integration: Integration, onSave: (data: CloudinaryFields) => void, onCancel: () => void, isSaving: boolean }) => {
    const { toast } = useToast();
    const [fields, setFields] = useState<CloudinaryFields>(() => {
        let parsedFields: any = {};
        try {
            if (typeof integration.fields === 'string' && integration.fields.trim()) {
                parsedFields = JSON.parse(integration.fields);
            } else if (typeof integration.fields === 'object' && integration.fields !== null) {
                parsedFields = integration.fields;
            }
        } catch (e) { console.error("Cloudinary parse error", e); }
        return { cloud_name: '', api_key: '', api_secret: '', ...parsedFields };
    });

    const [showApiSecret, setShowApiSecret] = useState(false);

    const handleSaveClick = () => {
        if (!fields.cloud_name || !fields.api_key || !fields.api_secret) {
            toast({ variant: "destructive", title: "Campos Incompletos", description: "Completa Cloud Name, API Key y API Secret." });
            return;
        }
        onSave(fields);
    };

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="cloud_name">Cloud Name</Label>
                <Input id="cloud_name" value={fields.cloud_name || ''} onChange={(e) => setFields(prev => ({ ...prev, cloud_name: e.target.value }))} disabled={isSaving} />
            </div>
            <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input id="api_key" value={fields.api_key || ''} onChange={(e) => setFields(prev => ({ ...prev, api_key: e.target.value }))} disabled={isSaving} />
            </div>
            <div className="relative">
                <Label htmlFor="api_secret">API Secret</Label>
                <Input 
                    id="api_secret" 
                    type={showApiSecret ? 'text' : 'password'} 
                    value={fields.api_secret || ''} 
                    onChange={(e) => setFields(prev => ({ ...prev, api_secret: e.target.value }))}
                    className="pr-10"
                    disabled={isSaving}
                />
                <Button 
                    type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7"
                    onClick={() => setShowApiSecret(prev => !prev)} disabled={isSaving}
                >
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
type ModalState = { isOpen: boolean; title: string; message: string; };

const AIProviderForm = ({ integration, onSave, onCancel, isSaving }: { integration: Integration, onSave: (data: AIProviderFields) => void, onCancel: () => void, isSaving: boolean }) => {
    const [fields, setFields] = useState<AIProviderFields>(() => {
        let parsed: any = {};
        try {
            if (typeof integration.fields === 'string' && integration.fields.trim()) {
                parsed = JSON.parse(integration.fields);
            } else if (typeof integration.fields === 'object' && integration.fields !== null) {
                parsed = integration.fields;
            }
        } catch (e) { console.error("AI parse error", e); }

        return {
            google: { apiKey: parsed?.google?.apiKey || "" },
            openai: { apiKey: parsed?.openai?.apiKey || "" },
            groq: { apiKey: parsed?.groq?.apiKey || "" }
        };
    });
    
    const [testStatus, setTestStatus] = useState<Record<Provider, TestStatus>>({ google: 'idle', openai: 'idle', groq: 'idle' });
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });

    const handleTestConnection = async (provider: Provider) => {
        const apiKey = fields[provider]?.apiKey;
        if (!apiKey) {
            setModalState({ isOpen: true, title: 'API Key Requerida', message: `Introduce una API Key para ${provider}.` });
            return;
        }
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
        switch (status) {
            case 'testing':
                return <Button variant="outline" size="sm" disabled><Loader2 className="h-4 w-4 animate-spin mr-2" /> Probando...</Button>;
            case 'success':
                return <Button variant="ghost" size="sm" className="text-green-600" disabled><CheckCircle className="h-4 w-4 mr-2" /> ¡Éxito!</Button>;
            case 'error':
                return <Button variant="destructive" size="sm" onClick={() => handleTestConnection(provider)}><XCircle className="h-4 w-4 mr-2" /> Reintentar</Button>;
            default:
                return <Button variant="outline" size="sm" onClick={() => handleTestConnection(provider)}>Probar Conexión</Button>;
        }
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

const WhapiForm = ({ integration, onSave, onCancel, isSaving }: { integration: Integration, onSave: (data: WhapiFields) => void, onCancel: () => void, isSaving: boolean }) => {
    const [fields, setFields] = useState<WhapiFields>(() => {
        let parsed: any = {};
        try {
            if (typeof integration.fields === 'string' && integration.fields.trim()) {
                parsed = JSON.parse(integration.fields);
            } else if (typeof integration.fields === 'object' && integration.fields !== null) {
                parsed = integration.fields;
            }
        } catch (e) { console.error("Whapi parse error", e); }
        return { apiKey: parsed?.apiKey || "", instanceId: parsed?.instanceId || "" };
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

const slugify = (text: string) => text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

const newIntegrationSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  description: z.string().optional(),
});
type NewIntegrationFormData = z.infer<typeof newIntegrationSchema>;

export default function IntegrationsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const didInit = useRef(false);
    
    const { register, handleSubmit, reset, formState: { errors } } = useForm<NewIntegrationFormData>({ resolver: zodResolver(newIntegrationSchema) });

    const integrationsQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'integrations'), [firestore]);
    const modulesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'modules'), [firestore]);

    const { data: integrations, isLoading: isIntegrationsLoading } = useCollection<Integration>(integrationsQuery);
    const { data: modules, isLoading: isModulesLoading } = useCollection<Module>(modulesQuery);

    useEffect(() => {
        if (isIntegrationsLoading || !firestore || didInit.current) return;
        didInit.current = true;

        const checkAndCreateIntegrations = async () => {
            const requiredIntegrations: { [key: string]: Omit<Integration, 'id'> } = {
              'cloudinary': { name: "Cloudinary", fields: '{}', status: "inactive" },
              'chatbot-integrado-con-whatsapp-para-soporte-y-ventas': { name: "Chatbot IA (Google/OpenAI/Groq)", fields: '{}', status: "inactive" },
              'whapi-whatsapp': { name: "WHAPI (WhatsApp)", fields: '{}', status: "inactive" }
            };

            for (const id in requiredIntegrations) {
                const docRef = doc(firestore, 'integrations', id);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    await setDocumentNonBlocking(docRef, { id, ...requiredIntegrations[id] });
                }
            }
        };

        checkAndCreateIntegrations();
    }, [isIntegrationsLoading, firestore]);
    
    const handleStatusChange = async (integration: Integration, checked: boolean) => {
        if (!firestore) return;
        const newStatus = checked ? 'active' : 'inactive';
        const docRef = doc(firestore, 'integrations', integration.id);
        
        try {
            await setDocumentNonBlocking(docRef, { status: newStatus }, { merge: true });
            toast({ title: "Estado Actualizado", description: `"${integration.name}" ahora está ${newStatus}.` });
        } catch (error) {
            console.error("Error al cambiar estado:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el estado.' });
        }
    };
    
    const handleSave = async (formData: any) => {
        if (!editingIntegration || !firestore) return;
        setIsSaving(true);
        try {
            const result = await withTimeout(saveIntegration(editingIntegration.id, { fields: JSON.stringify(formData) }), 10000);
            if (!result.success) throw new Error(result.error);
            toast({ title: "Guardado", description: `"${editingIntegration.name}" actualizado.` });
            setEditingIntegration(null);
        } catch (error: any) {
            const msg = error.message === 'TIMEOUT' ? 'El servidor no responde (Timeout). Reintenta.' : 'No se pudo guardar la configuración.';
            toast({ variant: 'destructive', title: 'Error de Red', description: msg });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateIntegration = (data: NewIntegrationFormData) => {
        if (!firestore) return;
        const id = slugify(data.name);
        const newIntegrationData = {
          id,
          name: data.name,
          description: data.description || '',
          fields: '{}',
          status: 'inactive',
          updatedAt: new Date().toISOString(),
        };
        const docRef = doc(firestore, 'integrations', id);
        setDocumentNonBlocking(docRef, newIntegrationData, { merge: true });

        toast({ title: "Integración Creada", description: `Se ha creado la integración "${data.name}".` });
        setCreateDialogOpen(false);
        reset();
    };

    if (isIntegrationsLoading || isModulesLoading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Gestión de Integraciones</CardTitle>
                        <CardDescription>Conecta y configura servicios de terceros para ampliar las funcionalidades.</CardDescription>
                    </div>
                    <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" />Crear Integración</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Crear Nueva Integración</DialogTitle></DialogHeader>
                            <form onSubmit={handleSubmit(handleCreateIntegration)} className="space-y-4">
                                <div><Label>Nombre</Label><Input {...register('name')} placeholder="Mi Nueva Integración" />{errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}</div>
                                <div><Label>Descripción</Label><Input {...register('description')} placeholder="¿Qué hace esta integración?" /></div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                                    <Button type="submit">Crear</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
            </Card>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {integrations?.map(integration => {
                     const isModulePresent = modules?.some(m => m.id === integration.id);
                     const icon = integration.id === 'cloudinary' ? <Cloud className="h-8 w-8" /> : (integration.id === 'whapi-whatsapp' ? <WhatsAppIcon className="h-8 w-8" /> : <Bot className="h-8 w-8" />);
                     
                     let isConfigured = false;
                     try {
                        let fields: any = {};
                        if (typeof integration.fields === 'string' && integration.fields.trim()) fields = JSON.parse(integration.fields);
                        else if (typeof integration.fields === 'object' && integration.fields !== null) fields = integration.fields;
                        
                        if (integration.id === 'cloudinary') isConfigured = !!(fields.cloud_name && fields.api_key && fields.api_secret);
                        else if (integration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas') isConfigured = !!(fields.google?.apiKey || fields.openai?.apiKey || fields.groq?.apiKey);
                        else if (integration.id === 'whapi-whatsapp') isConfigured = !!(fields.apiKey && fields.instanceId);
                     } catch {}

                    return (
                        <Card key={integration.id} className={!isModulePresent ? 'opacity-60 bg-muted/30' : ''}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-muted rounded-lg text-muted-foreground">{icon}</div>
                                        <CardTitle className="text-base">{integration.name}</CardTitle>
                                    </div>
                                    <Badge variant={integration.status === 'active' ? 'default' : 'secondary'}>
                                        {integration.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between border p-4 rounded-md">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Estado del Servicio</p>
                                        <p className="text-xs text-muted-foreground">{!isModulePresent ? "Requiere el módulo" : (integration.status === 'active' ? "Operativo" : "Desactivado")}</p>
                                    </div>
                                    <Switch 
                                        checked={integration.status === 'active'} 
                                        onCheckedChange={(c) => handleStatusChange(integration, c)} 
                                        disabled={isSaving || !isModulePresent} 
                                    />
                                </div>
                                <div className="flex items-center justify-between border p-4 rounded-md">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Configuración</p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {isConfigured ? <><CheckCircle className="h-4 w-4 text-green-500" /> Listo</> : <><XCircle className="h-4 w-4 text-destructive" /> Pendiente</>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => setEditingIntegration(integration)} disabled={isSaving || !isModulePresent}>
                                    <Plug className="mr-2 h-4 w-4" /> Editar Configuración
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
            
            <Dialog open={!!editingIntegration} onOpenChange={(open) => !isSaving && !open && setEditingIntegration(null)}>
                {editingIntegration && (
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Configurar {editingIntegration.name}</DialogTitle></DialogHeader>
                        {editingIntegration.id === 'cloudinary' && <CloudinaryForm integration={editingIntegration} onSave={handleSave} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />}
                        {editingIntegration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas' && <AIProviderForm integration={editingIntegration} onSave={handleSave} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />}
                        {editingIntegration.id === 'whapi-whatsapp' && <WhapiForm integration={editingIntegration} onSave={handleSave} onCancel={() => setEditingIntegration(null)} isSaving={isSaving} />}
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
