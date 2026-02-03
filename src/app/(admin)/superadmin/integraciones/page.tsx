
"use client";

import { useState, useEffect } from "react";
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plug, Cloud, CheckCircle, XCircle, Loader2, Eye, EyeOff, Bot } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import type { Integration, CloudinaryFields, AIProviderFields, WhapiFields } from "@/models/integration";
import type { Module } from "@/models/module";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { testApiKey } from "@/ai/flows/test-api-key-flow";
import { testWhapiConnection } from "@/ai/flows/test-whapi-connection-flow";


const CloudinaryForm = ({ integration, onSave }: { integration: Integration, onSave: (data: Integration) => void }) => {
    const [fields, setFields] = useState<CloudinaryFields>(() => {
        let parsedFields = {};
        if (typeof integration.fields === 'string' && integration.fields.trim()) {
            try {
                parsedFields = JSON.parse(integration.fields);
            } catch (e) {
                console.error("Error parsing Cloudinary fields:", e);
            }
        } else if (typeof integration.fields === 'object' && integration.fields !== null) {
            parsedFields = integration.fields;
        }
        return { cloud_name: '', api_key: '', api_secret: '', ...parsedFields };
    });

    const [showApiSecret, setShowApiSecret] = useState(false);

    const handleFieldChange = (key: keyof CloudinaryFields, value: string) => {
        setFields(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        const updatedIntegration = { ...integration, fields: JSON.stringify(fields) };
        onSave(updatedIntegration);
    };

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="cloud_name">Cloud Name</Label>
                <Input id="cloud_name" value={fields.cloud_name || ''} onChange={(e) => handleFieldChange('cloud_name', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input id="api_key" value={fields.api_key || ''} onChange={(e) => handleFieldChange('api_key', e.target.value)} />
            </div>
            <div className="relative">
                <Label htmlFor="api_secret">API Secret</Label>
                <Input 
                    id="api_secret" 
                    type={showApiSecret ? 'text' : 'password'} 
                    value={fields.api_secret || ''} 
                    onChange={(e) => handleFieldChange('api_secret', e.target.value)}
                    className="pr-10"
                />
                <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-7 h-7 w-7"
                    onClick={() => setShowApiSecret(prev => !prev)}
                >
                    {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSave}>Guardar Cambios</Button>
            </DialogFooter>
        </div>
    );
};

type Provider = 'google' | 'openai' | 'groq';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ModalState = { isOpen: boolean; title: string; message: string; };


const AIProviderForm = ({ integration, onSave }: { integration: Integration, onSave: (data: Integration) => void }) => {
    const [fields, setFields] = useState<AIProviderFields>(() => {
        let parsed = {};
        if (typeof integration.fields === 'string' && integration.fields.trim()) {
            try {
                parsed = JSON.parse(integration.fields);
            } catch (e) {
                console.error("Error parsing AI fields:", e);
            }
        } else if (typeof integration.fields === 'object' && integration.fields !== null) {
            parsed = integration.fields;
        }

        const defaultFields: AIProviderFields = {
            google: { apiKey: "" },
            openai: { apiKey: "" },
            groq: { apiKey: "" }
        };

        const merged = { ...defaultFields, ...parsed };
        merged.google = { ...defaultFields.google, ...merged.google };
        merged.openai = { ...defaultFields.openai, ...merged.openai };
        merged.groq = { ...defaultFields.groq, ...merged.groq };

        return merged;
    });
    
    const [testStatus, setTestStatus] = useState<Record<Provider, TestStatus>>({
        google: 'idle',
        openai: 'idle',
        groq: 'idle',
    });
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });

    const handleFieldChange = (provider: Provider, key: 'apiKey', value: string) => {
        setFields(prev => ({
            ...prev,
            [provider]: { ...prev[provider], [key]: value }
        }));
        // Reset test status on key change
        setTestStatus(prev => ({ ...prev, [provider]: 'idle' }));
    };

    const handleSave = () => {
        onSave({ ...integration, fields: JSON.stringify(fields) });
    };

    const handleTestConnection = async (provider: Provider) => {
        const apiKey = fields[provider]?.apiKey;
        if (!apiKey) {
            setModalState({ isOpen: true, title: 'API Key Requerida', message: `Por favor, introduce una API Key para ${provider}.` });
            return;
        }

        setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
        try {
            const result = await testApiKey({ provider, apiKey });
            if (result.success) {
                setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
                setModalState({ isOpen: true, title: 'Conexión Exitosa', message: result.message });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
            setModalState({ isOpen: true, title: 'Error de Conexión', message: error.message || 'No se pudo verificar la clave.' });
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
        <>
         <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Google AI Studio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Label htmlFor="google-api-key">API Key</Label>
                    <Input id="google-api-key" type="password" value={fields.google?.apiKey || ''} onChange={(e) => handleFieldChange('google', 'apiKey', e.target.value)} />
                    <TestButton provider="google" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg">OpenAI</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Label htmlFor="openai-api-key">API Key</Label>
                    <Input id="openai-api-key" type="password" value={fields.openai?.apiKey || ''} onChange={(e) => handleFieldChange('openai', 'apiKey', e.target.value)} />
                    <TestButton provider="openai" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Groq</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Label htmlFor="groq-api-key">API Key</Label>
                    <Input id="groq-api-key" type="password" value={fields.groq?.apiKey || ''} onChange={(e) => handleFieldChange('groq', 'apiKey', e.target.value)} />
                    <TestButton provider="groq" />
                </CardContent>
            </Card>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSave}>Guardar Cambios</Button>
            </DialogFooter>
        </div>
        <AlertDialog open={modalState.isOpen} onOpenChange={(isOpen) => setModalState(prev => ({...prev, isOpen}))}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{modalState.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {modalState.message}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setModalState({ isOpen: false, title: '', message: '' })}>Cerrar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
};

const WhapiForm = ({ integration, onSave }: { integration: Integration, onSave: (data: Integration) => void }) => {
    const [fields, setFields] = useState<WhapiFields>(() => {
        let parsed = { apiKey: "", instanceId: "" };
        if (typeof integration.fields === 'string' && integration.fields.trim()) {
            try {
                parsed = { ...parsed, ...JSON.parse(integration.fields) };
            } catch (e) { console.error("Error parsing WHAPI fields:", e); }
        } else if (typeof integration.fields === 'object' && integration.fields !== null) {
            parsed = { ...parsed, ...(integration.fields as WhapiFields) };
        }
        return parsed;
    });

    const [testStatus, setTestStatus] = useState<TestStatus>('idle');
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });

    const handleFieldChange = (key: keyof WhapiFields, value: string) => {
        setFields(prev => ({ ...prev, [key]: value }));
        setTestStatus('idle');
    };

    const handleSave = () => {
        onSave({ ...integration, fields: JSON.stringify(fields) });
    };

    const handleTestConnection = async () => {
        const { apiKey, instanceId } = fields;
        if (!apiKey || !instanceId) {
            setModalState({ isOpen: true, title: 'Datos Requeridos', message: 'Por favor, introduce una API Key y un Instance ID.' });
            return;
        }

        setTestStatus('testing');
        try {
            const result = await testWhapiConnection({ apiKey, instanceId });
            if (result.success) {
                setTestStatus('success');
                setModalState({ isOpen: true, title: 'Conexión Exitosa', message: result.message });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            setTestStatus('error');
            setModalState({ isOpen: true, title: 'Error de Conexión', message: error.message || 'No se pudo verificar la conexión.' });
        }
    };
    
    const TestButton = () => {
        switch (testStatus) {
            case 'testing':
                return <Button variant="outline" className="w-full" disabled><Loader2 className="h-4 w-4 animate-spin mr-2" /> Probando...</Button>;
            case 'success':
                return <Button variant="ghost" className="w-full text-green-600" disabled><CheckCircle className="h-4 w-4 mr-2" /> ¡Conexión Exitosa!</Button>;
            case 'error':
                return <Button variant="destructive" className="w-full" onClick={handleTestConnection}><XCircle className="h-4 w-4 mr-2" /> Reintentar Prueba</Button>;
            default:
                return <Button variant="outline" className="w-full" onClick={handleTestConnection}>Probar Conexión</Button>;
        }
    };

    return (
        <>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="whapi-apiKey">API Key</Label>
                    <Input id="whapi-apiKey" type="password" value={fields.apiKey} onChange={(e) => handleFieldChange('apiKey', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="whapi-instanceId">Instance ID</Label>
                    <Input id="whapi-instanceId" value={fields.instanceId} onChange={(e) => handleFieldChange('instanceId', e.target.value)} />
                </div>
                <TestButton />
            </div>
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSave}>Guardar Cambios</Button>
            </DialogFooter>
            <AlertDialog open={modalState.isOpen} onOpenChange={(isOpen) => setModalState(prev => ({...prev, isOpen}))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{modalState.title}</AlertDialogTitle>
                        <AlertDialogDescription>{modalState.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setModalState({ isOpen: false, title: '', message: '' })}>Cerrar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


export default function IntegrationsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
    
    const integrationsQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'integrations'), [firestore]);
    const modulesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'modules'), [firestore]);

    const { data: integrations, isLoading: isIntegrationsLoading } = useCollection<Integration>(integrationsQuery);
    const { data: modules, isLoading: isModulesLoading } = useCollection<Module>(modulesQuery);

    useEffect(() => {
      if (!isIntegrationsLoading && integrations && firestore) {
          const requiredIntegrations: { [key: string]: Omit<Integration, 'id'> } = {
              'cloudinary': {
                  name: "Cloudinary",
                  fields: JSON.stringify({ cloud_name: "", api_key: "", api_secret: "" }),
                  status: "inactive",
              },
              'chatbot-integrado-con-whatsapp-para-soporte-y-ventas': {
                  name: "Chatbot IA (Google/OpenAI/Groq)",
                  fields: JSON.stringify({ google: { apiKey: "" }, openai: { apiKey: "" }, groq: { apiKey: "" } }),
                  status: "inactive",
              },
              'whapi-whatsapp': {
                  name: "WHAPI (WhatsApp)",
                  fields: JSON.stringify({ apiKey: "", instanceId: "" }),
                  status: "inactive",
              }
          };

          for (const id in requiredIntegrations) {
              if (!integrations.some(i => i.id === id)) {
                  setDocumentNonBlocking(doc(firestore, 'integrations', id), { id, ...requiredIntegrations[id] });
              }
          }
      }
    }, [isIntegrationsLoading, integrations, firestore]);

    const handleStatusChange = (integration: Integration) => {
        if (!firestore) return;
        const newStatus = integration.status === 'active' ? 'inactive' : 'active';
        setDocumentNonBlocking(doc(firestore, 'integrations', integration.id), { status: newStatus }, { merge: true });
        toast({ title: "Estado Actualizado", description: `La integración "${integration.name}" ahora está ${newStatus === 'active' ? 'activa' : 'inactiva'}.` });
    };

    const handleSave = (integration: Integration) => {
        if (!firestore) return;
        setDocumentNonBlocking(doc(firestore, 'integrations', integration.id), integration, { merge: true });
        toast({ title: "Configuración Guardada", description: `La integración "${integration.name}" ha sido actualizada.` });
        setEditingIntegration(null);
    };

    const isCloudinaryModuleActive = modules?.find(m => m.id === 'cloudinary')?.status === 'active';
    const isChatbotModuleActive = modules?.find(m => m.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas')?.status === 'active';
    const isWhapiModuleActive = modules?.find(m => m.name.includes('WHAPI'))?.status === 'active';

    const initialLoading = isIntegrationsLoading || isModulesLoading;

    const renderCardFooter = (integration: Integration) => {
        let isModuleActive = true;
        if (integration.id === 'cloudinary') {
            isModuleActive = !!isCloudinaryModuleActive;
        } else if (integration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas') {
            isModuleActive = !!isChatbotModuleActive;
        } else if (integration.id === 'whapi-whatsapp') {
            isModuleActive = !!isWhapiModuleActive;
        }

        const openDialog = () => setEditingIntegration(integration);
        
        let dialogContent;
        if (integration.id === 'cloudinary') {
            dialogContent = <CloudinaryForm integration={integration} onSave={handleSave} />;
        } else if (integration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas') {
            dialogContent = <AIProviderForm integration={integration} onSave={handleSave} />;
        } else if (integration.id === 'whapi-whatsapp') {
            dialogContent = <WhapiForm integration={integration} onSave={handleSave} />;
        }

        return (
            <CardFooter>
                <Dialog open={editingIntegration?.id === integration.id} onOpenChange={(isOpen) => !isOpen && setEditingIntegration(null)}>
                    <DialogTrigger asChild>
                        <Button className="w-full" disabled={!isModuleActive} onClick={openDialog}>
                            <Plug className="mr-2 h-4 w-4" />
                            Editar Configuración
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Configurar {integration.name}</DialogTitle>
                            {integration.id === 'cloudinary' && <DialogDescription>Introduce las credenciales (API Keys) de tu cuenta de Cloudinary.</DialogDescription>}
                            {integration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas' && <DialogDescription>Configura las API Keys para los proveedores de IA de tu Chatbot.</DialogDescription>}
                            {integration.id === 'whapi-whatsapp' && <DialogDescription>Introduce tus credenciales de la API de WHAPI.</DialogDescription>}
                        </DialogHeader>
                         {dialogContent}
                    </DialogContent>
                </Dialog>
            </CardFooter>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Gestión de Integraciones</CardTitle>
                        <CardDescription>
                            Conecta y configura servicios de terceros para ampliar las funcionalidades de la plataforma. Para poder configurar una integración, su módulo asociado debe estar activo en la página "Módulos".
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>
            
            {initialLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="ml-2 text-muted-foreground">Cargando integraciones...</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {integrations?.filter(i => ['cloudinary', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas', 'whapi-whatsapp'].includes(i.id)).map(integration => {
                         let isModuleActive = true;
                         let icon;
                         let description;

                         if (integration.id === 'cloudinary') {
                           isModuleActive = !!isCloudinaryModuleActive;
                           icon = <Cloud className="h-8 w-8" />;
                           description = 'Almacenamiento y entrega de imágenes y videos.';
                         } else if (integration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas') {
                           isModuleActive = !!isChatbotModuleActive;
                           icon = <Bot className="h-8 w-8" />;
                           description = 'Motores de IA para el chatbot (Google, OpenAI, Groq).';
                         } else if (integration.id === 'whapi-whatsapp') {
                            isModuleActive = !!isWhapiModuleActive;
                            icon = <WhatsAppIcon className="h-8 w-8" />;
                            description = 'Envío de mensajes de WhatsApp a través de WHAPI.';
                         }
                         
                         let isConfigured = false;
                         try {
                           let fields: any = {};
                           if (typeof integration.fields === 'string' && integration.fields.trim()) {
                               fields = JSON.parse(integration.fields);
                           } else if (typeof integration.fields === 'object' && integration.fields !== null) {
                               fields = integration.fields;
                           }
                           
                           if (integration.id === 'cloudinary') {
                             isConfigured = !!(fields.cloud_name && fields.api_key && fields.api_secret && fields.cloud_name !== "your_cloud_name");
                           } else if (integration.id === 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas') {
                             isConfigured = !!(fields.google?.apiKey || fields.openai?.apiKey || fields.groq?.apiKey);
                           } else if (integration.id === 'whapi-whatsapp') {
                             isConfigured = !!(fields.apiKey && fields.instanceId);
                           }
                         } catch {}

                        return (
                            <Card key={integration.id} className={!isModuleActive ? 'bg-muted/50' : ''}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-muted rounded-lg text-muted-foreground">{icon}</div>
                                            <div>
                                                <CardTitle>{integration.name}</CardTitle>
                                                <CardDescription>{description}</CardDescription>
                                            </div>
                                        </div>
                                        {isModuleActive && (
                                        <Badge variant={integration.status === 'active' ? 'default' : 'secondary'}>
                                            {integration.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isModuleActive ? (
                                        <>
                                            <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm font-medium leading-none">Estado del Servicio</p>
                                                    <p className="text-sm text-muted-foreground">{integration.status === 'active' ? "El servicio está operativo." : "El servicio está desactivado."}</p>
                                                </div>
                                                <Switch
                                                    checked={integration.status === 'active'}
                                                    onCheckedChange={() => handleStatusChange(integration)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
                                                <div className="flex-1 space-y-1">
                                                    <p className="text-sm font-medium leading-none">Configuración</p>
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                         {isConfigured ? (
                                                            <><CheckCircle className="h-4 w-4 text-green-500" /><span>Credenciales configuradas.</span></>
                                                        ) : (
                                                            <><XCircle className="h-4 w-4 text-destructive" /><span>Requiere configuración.</span></>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center text-sm text-muted-foreground p-4 border rounded-md">
                                            Activa el módulo correspondiente para configurar esta integración.
                                        </div>
                                    )}
                                </CardContent>
                                {renderCardFooter(integration)}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
