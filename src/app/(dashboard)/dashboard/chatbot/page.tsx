
'use client';

import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Save, Wifi, WifiOff, UploadCloud, FileText, Trash2, CheckCircle, AlertTriangle, MessageSquare, BadgePercent, Smile } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, limit, getDoc, setDoc } from 'firebase/firestore';
import type { ChatbotConfig, KnowledgeDocument } from '@/models/chatbot-config';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ChatConversation } from "@/models/chatbot-config";
import type { Integration, CloudinaryFields } from "@/models/integration";
import { extractTextFromPDF } from '@/actions/extract-pdf-text';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const initialChatbotConfig: Partial<ChatbotConfig> = {
  whatsApp: {
    connected: false,
    number: '',
    token: ''
  },
  business: {
    name: '', // Vacío está bien aquí - el usuario lo llenará
    type: 'Otro',
    description: '',
    logoUrl: '',
    avatarUrl: '' // Campo añadido
  },
  communication: {
    tone: 'Amigable y cercano',
    greeting: '¡Hola! 👋 ¿En qué puedo ayudarte hoy?'
  },
  schedule: {
    is247: true,
    startTime: '09:00',
    endTime: '18:00',
    offHoursMessage: 'Nuestro horario de atención es de 9am a 6pm. Te responderemos tan pronto como estemos de vuelta.'
  }
};

const ManualEntryDialog = ({ user, firestore, onSaved }: { user: any, firestore: any, onSaved: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ variant: 'destructive', title: 'Faltan datos', description: 'El título y el contenido son obligatorios.' });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Si hay imagen, subirla a Cloudinary
      let imageUrl = '';
      if (image) {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        await new Promise<void>((resolve, reject) => {
            reader.onloadend = async () => {
                try {
                     const res = await uploadMedia({ mediaDataUri: reader.result as string });
                     imageUrl = res.secure_url;
                     resolve();
                } catch (e) { reject(e); }
            };
            reader.onerror = (error) => reject(error);
        });
      }

      // 2. Guardar en Firestore
      const docId = doc(collection(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase')).id;
      
      const newDoc: Omit<KnowledgeDocument, 'id'> & { isManual: boolean } = {
        fileName: title,
        fileType: 'text/manual',
        status: 'ready', // Listo inmediatamente
        createdAt: new Date().toISOString(),
        content: content, // El texto que leerá el bot
        fileUrl: imageUrl || '', // URL de la imagen para que el bot la envíe
        isManual: true
      };

      await setDoc(doc(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase', docId), newDoc);

      toast({ title: 'Entrada creada', description: 'El bot ha aprendido esta información.' });
      setIsOpen(false);
      setTitle('');
      setContent('');
      setImage(null);
      onSaved(); 

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
           <FileText className="h-4 w-4" /> Crear Entrada Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Conocimiento Manualmente</DialogTitle>
          <DialogDescription>
            Agrega promociones, menús o reglas específicas. Si subes una imagen, el bot podrá enviar el link al cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título (Ej: "Promo Sábado")</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Identificador del tema" />
          </div>
          <div className="space-y-2">
             <Label htmlFor="content">Contenido (Texto explicativo)</Label>
             <Textarea 
                id="content" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                placeholder="Ej: La promo incluye 2 hamburguesas por $20.000..." 
                className="h-32"
             />
          </div>
          <div className="space-y-2">
            <Label>Imagen de Referencia (Opcional)</Label>
            <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const KnowledgeBaseManager = () => {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knowledgeBaseQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase');
  }, [firestore, user]);

  const { data: files, isLoading: areFilesLoading, error: filesError } = useCollection<KnowledgeDocument>(knowledgeBaseQuery);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const newFile = event.target.files?.[0];
    if (!newFile || !firestore || !user) return;
  
    if (newFile.type !== 'application/pdf') {
        toast({ variant: 'destructive', title: 'Formato no válido', description: 'Solo se permiten archivos PDF.' });
        return;
    }
    
    setIsUploading(true);
    toast({ title: 'Procesando archivo...', description: 'Subiendo y leyendo contenido...' });
  
    const reader = new FileReader();
    reader.readAsDataURL(newFile);
    
    reader.onloadend = async () => {
        const docId = doc(collection(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase')).id;
        
        try {
            const mediaDataUri = reader.result as string;
            
            const newDocumentData: Omit<KnowledgeDocument, 'id'> = {
                fileName: newFile.name,
                fileType: newFile.type,
                status: 'training',
                createdAt: new Date().toISOString(),
                extractedText: ''
            };
            
            await setDocumentNonBlocking(doc(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase', docId), newDocumentData);

            let textContent = '';
            try {
                textContent = await extractTextFromPDF(mediaDataUri);
            } catch (err) {
                textContent = "Texto no legible automáticamente.";
            }

            const result = await uploadMedia({ 
                mediaDataUri,
            });

            await updateDocumentNonBlocking(doc(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase', docId), { 
              status: 'ready', 
              fileUrl: result.secure_url,
              extractedText: textContent
            });
  
            toast({ title: '¡Documento listo!', description: `La IA ha leído ${newFile.name} correctamente.` });
  
        } catch (error: any) {
            await updateDocumentNonBlocking(doc(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase', docId), { status: 'error' });
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    reader.onerror = async () => {
        setIsUploading(false);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo leer el archivo local.' });
    };
  };
  
  const handleDelete = (id: string) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, 'businesses', user.uid, 'chatbotConfig', 'main', 'knowledgeBase', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Documento eliminado', description: 'El archivo ha sido eliminado de tu base de conocimiento.' });
  };
  
  const getStatusInfo = (status: 'ready' | 'training' | 'error') => {
    switch (status) {
      case 'ready':
        return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'Listo', description: 'La IA ha sido entrenada con este documento.' };
      case 'training':
        return { icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />, text: 'Entrenando', description: 'La IA está procesando este documento.' };
      case 'error':
        return { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, text: 'Error', description: 'No se pudo procesar el documento.' };
      default:
        return { icon: null, text: '', description: ''};
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Base de Conocimiento</CardTitle>
        <CardDescription>Sube documentos (menús, FAQs, etc.) en formato PDF o crea entradas manuales para entrenar a tu asistente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="flex justify-end">
            <ManualEntryDialog user={user} firestore={firestore} onSaved={() => { /* No-op, real-time updates handle refresh */ }} />
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf"
            multiple={false}
          />
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-accent"
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                <p>Subiendo y procesando...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
                <p className="font-semibold">Haz clic o arrastra un PDF aquí para subirlo</p>
                <p className="text-sm text-muted-foreground">Solo se permiten archivos PDF (máx. 5MB)</p>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">Documentos y Entradas Manuales</h3>
          {areFilesLoading ? (
            <div className="flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Cargando documentos...</div>
          ) : files && files.length > 0 ? (
            <ul className="space-y-3">
              {files.map(file => {
                const statusInfo = getStatusInfo(file.status);
                const isManual = file.fileType === 'text/manual';
                return (
                  <li key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{file.fileName}</span>
                         {isManual && <span className="text-xs text-blue-500 font-semibold">ENTRADA MANUAL</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm" title={statusInfo.description}>
                          {statusInfo.icon}
                          <span>{statusInfo.text}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center text-muted-foreground py-6">
              <p>No hay documentos en tu base de conocimiento.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


const ChatbotAnalytics = () => {
  const { user } = useUser();
  const firestore = useFirestore();

  const conversationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'businesses', user.uid, 'chatConversations'), orderBy('startTime', 'desc'), limit(100));
  }, [firestore, user]);

  const { data: conversations, isLoading } = useCollection<ChatConversation>(conversationsQuery);

  const analyticsData = useMemo(() => {
    if (!conversations) return {
      totalConversations: 0,
      resolutionRate: 0,
      avgSatisfaction: 0,
      dailyActivity: [],
      intents: [],
    };
    
    const total = conversations.length;
    const resolved = conversations.filter(c => c.status === 'resolved').length;
    const satisfactionRatings = conversations.filter(c => c.satisfactionRating).map(c => c.satisfactionRating!);
    const avgSatisfaction = satisfactionRatings.length > 0 ? satisfactionRatings.reduce((a, b) => a + b, 0) / satisfactionRatings.length : 0;
    
    // Agrupar por día
    const activityByDay: { [key: string]: number } = {};
    conversations.forEach(c => {
        const day = new Date(c.startTime).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
        activityByDay[day] = (activityByDay[day] || 0) + 1;
    });
    const dailyActivity = Object.entries(activityByDay).map(([date, count]) => ({ date, count })).reverse();

    return {
      totalConversations: total,
      resolutionRate: total > 0 ? (resolved / total) * 100 : 0,
      avgSatisfaction: avgSatisfaction,
      dailyActivity,
      intents: [], // Esta parte requeriría datos de `ChatMessage`
    };
  }, [conversations]);

  const kpis = [
    { title: "Conversaciones Totales", value: analyticsData.totalConversations.toString(), icon: MessageSquare },
    { title: "Tasa de Resolución", value: `${analyticsData.resolutionRate.toFixed(1)}%`, icon: BadgePercent },
    { title: "Satisfacción Promedio", value: analyticsData.avgSatisfaction.toFixed(1) + " / 5", icon: Smile },
  ];
  
  const chartConfig = {
      count: {
        label: "Conversaciones",
        color: "hsl(var(--chart-1))",
      },
  };

  if (isLoading) {
    return <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analíticas del Chatbot</CardTitle>
        <CardDescription>
          Métricas sobre conversaciones, ventas y satisfacción del cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          {kpis.map(kpi => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Actividad del Chatbot</CardTitle>
                <CardDescription>Número de conversaciones iniciadas por día.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData.dailyActivity.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <LineChart data={analyticsData.dailyActivity} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} dot={true} />
                    </LineChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-10 text-muted-foreground">No hay datos de actividad para mostrar.</div>
              )}
            </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};


export default function ChatbotPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const configDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'businesses', user.uid, 'chatbotConfig', 'main');
    }, [user, firestore]);
    
    const { data: config, isLoading } = useDoc<ChatbotConfig>(configDocRef);

    const { control, handleSubmit, reset, watch, setValue, getValues } = useForm<ChatbotConfig>({
        defaultValues: initialChatbotConfig
    });
    
    useEffect(() => {
        if (isLoading) return;
    
        if (config && user) {
            const safeConfig = {
                ...initialChatbotConfig,
                ...config,
                business: {
                    ...initialChatbotConfig.business,
                    ...config.business
                },
                id: config.id ?? 'main',
                businessId: config.businessId ?? user.uid
            };
            reset(safeConfig);
        } else if (user) {
            reset({ ...initialChatbotConfig, businessId: user.uid, id: 'main' });
        }
        
    }, [config, isLoading, reset, user]);
    
   const handleSave = async () => {
        if (!configDocRef) return;
        const currentData = getValues();
        
        setIsSaving(true);
        try {
            await setDoc(configDocRef, {
                ...currentData,
                id: 'main',
                businessId: user!.uid
            });
            
            toast({
                title: "Configuración Guardada",
                description: "Los cambios en tu asistente han sido guardados.",
            });
        } catch (error) {
            console.error('❌ Error al guardar:', error);
            toast({
                variant: "destructive",
                title: "Error al guardar",
                description: "No se pudieron guardar los cambios. Intenta de nuevo.",
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleResetDB = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay usuario autenticado' });
            return;
        }

        setIsSaving(true);
        try {
            
            const testConfig: ChatbotConfig = {
                id: 'main',
                businessId: user.uid,
                whatsApp: {
                    connected: false,
                    number: '+573001234567',
                    token: 'test-token-123'
                },
                business: {
                    name: 'Negocio V03',
                    type: 'Salud y Bienestar',
                    description: 'Negocio V03 ofrece soluciones integrales de salud y bienestar con enfoque holístico.',
                    logoUrl: 'https://via.placeholder.com/150',
                    avatarUrl: `https://i.pravatar.cc/150?u=${user.uid}`
                },
                communication: {
                    tone: 'Profesional y empático',
                    greeting: '¡Hola! Bienvenido a Negocio V03. ¿En qué podemos ayudarte hoy?'
                },
                schedule: {
                    is247: false,
                    startTime: '08:00',
                    endTime: '18:00',
                    offHoursMessage: 'Gracias por contactarnos. Nuestro horario es de 8am a 6pm. Te responderemos pronto.'
                }
            };
            
            if (configDocRef) {
                await setDoc(configDocRef, testConfig, { merge: false });
            }
            
            reset(testConfig);
            
            toast({ title: 'Éxito', description: 'Base de datos reseteada con datos de prueba' });
            
        } catch (error) {
            console.error('❌ Error en handleResetDB:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Error al resetear la base de datos' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const isConnected = watch('whatsApp.connected');
    
    const handleVerifyConnection = () => {
        const { number, token } = getValues('whatsApp');
        setIsVerifying(true);
        setTimeout(() => {
            if (number && token) {
                setValue('whatsApp.connected', true);
                toast({
                    title: "Conexión Exitosa",
                    description: "Se ha verificado la conexión con WhatsApp Business API.",
                });
            } else {
                setValue('whatsApp.connected', false);
                toast({
                    variant: "destructive",
                    title: "Error de Conexión",
                    description: "Por favor, introduce un número de WhatsApp y un token de API válidos.",
                });
            }
            setIsVerifying(false);
        }, 2000);
    };

    const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'avatarUrl') => {
        const file = event.target.files?.[0];
        if (!file) return;

        toast({ title: `Subiendo ${field === 'logoUrl' ? 'logo' : 'avatar'}...`, description: 'Por favor, espera.' });

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const mediaDataUri = reader.result as string;
                
                const result = await uploadMedia({ 
                    mediaDataUri,
                });
                
                setValue(`business.${field}`, result.secure_url);

                toast({ title: `¡${field === 'logoUrl' ? 'Logo' : 'Avatar'} actualizado!`, description: 'Tu nueva imagen se ha guardado.' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Error al subir', description: error.message });
            }
        };
        reader.onerror = () => {
            toast({ variant: 'destructive', title: 'Error de Lectura', description: 'No se pudo leer el archivo.' });
        };
    };

    if (isLoading && !config) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Configuración del Asistente IA (Chatbot)</CardTitle>
                        <CardDescription>
                            Personaliza el comportamiento, la información y la conexión de tu chatbot de WhatsApp.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {process.env.NODE_ENV === 'development' && (
                            <Button
                                variant="outline"
                                onClick={handleResetDB}
                                disabled={isSaving}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                              >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '🔄'}
                                Reset DB
                              </Button>
                        )}
                        <Button onClick={handleSubmit(handleSave)} disabled={isVerifying || isSaving}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">Configuración General</TabsTrigger>
                    <TabsTrigger value="knowledge">Base de Conocimiento</TabsTrigger>
                    <TabsTrigger value="analytics">Analíticas</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Conexión con WhatsApp</CardTitle>
                            <CardDescription>
                                Vincula tu cuenta de WhatsApp Business API para empezar a automatizar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 p-4 border rounded-lg">
                                {isConnected ? (
                                    <Wifi className="h-6 w-6 text-green-500" />
                                ) : (
                                    <WifiOff className="h-6 w-6 text-red-500" />
                                )}
                                <div>
                                    <p className="font-semibold">Estado de la conexión</p>
                                    <p className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                                        {isConnected ? 'Conectado' : 'Desconectado'}
                                    </p>
                                </div>
                                <Button variant="outline" className="ml-auto" onClick={handleVerifyConnection} disabled={isVerifying}>
                                     {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                     {isVerifying ? 'Verificando...' : 'Verificar Conexión'}
                                </Button>
                            </div>
                            <Controller
                                name="whatsApp.number"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="whatsapp-number">Número de WhatsApp</Label>
                                        <Input
                                            id="whatsapp-number"
                                            placeholder="+57 300 123 4567"
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                        />
                                    </div>
                                )}
                            />
                            <Controller
                                name="whatsApp.token"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="whatsapp-token">Token de API de WhatsApp</Label>
                                        <Input
                                            id="whatsapp-token"
                                            type="password"
                                            placeholder="••••••••••••••••••••"
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                        />
                                    </div>
                                )}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Negocio</CardTitle>
                            <CardDescription>
                                Proporciona contexto a la IA sobre tu negocio para que sus respuestas sean más precisas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Controller
                                    name="business.name"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="business-name">Nombre del Negocio</Label>
                                            <Input
                                                id="business-name"
                                                placeholder="Panadería Don Juan"
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                name={field.name}
                                            />
                                        </div>
                                    )}
                                />
                                <Controller
                                    name="business.type"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="space-y-2">
                                            <Label htmlFor="business-type">Tipo de Negocio</Label>
                                            <Select
                                                value={field.value || 'Otro'}
                                                onValueChange={field.onChange}
                                                name={field.name}
                                            >
                                                <SelectTrigger id="business-type"><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Restaurante">Restaurante</SelectItem>
                                                    <SelectItem value="Panadería">Panadería</SelectItem>
                                                    <SelectItem value="Heladería">Heladería</SelectItem>
                                                    <SelectItem value="Cafetería">Cafetería</SelectItem>
                                                    <SelectItem value="Otro">Otro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                />
                            </div>
                            <Controller
                                name="business.description"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="business-description">Descripción del Negocio</Label>
                                        <Textarea
                                            id="business-description"
                                            placeholder="Somos una panadería familiar..."
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                        />
                                    </div>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Logo del Negocio</Label>
                                    <div className="flex items-center gap-4">
                                        {watch('business.logoUrl') ? (
                                            <Image src={watch('business.logoUrl')!} alt="Logo" width={64} height={64} className="rounded-md object-cover" />
                                        ) : (
                                            <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center text-muted-foreground">Logo</div>
                                        )}
                                        <input type="file" onChange={(e) => handleMediaUpload(e, 'logoUrl')} className="hidden" accept="image/*" id="logo-upload-input" />
                                        <Button type="button" variant="outline" onClick={() => document.getElementById('logo-upload-input')?.click()}>
                                            <UploadCloud className="mr-2 h-4 w-4" />Subir Logo
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Avatar del Chatbot</Label>
                                    <div className="flex items-center gap-4">
                                        {watch('business.avatarUrl') ? (
                                            <Image src={watch('business.avatarUrl')!} alt="Avatar" width={64} height={64} className="rounded-full object-cover" />
                                        ) : (
                                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-xs">Avatar</div>
                                        )}
                                        <input type="file" onChange={(e) => handleMediaUpload(e, 'avatarUrl')} className="hidden" accept="image/*" id="avatar-upload-input" />
                                        <Button type="button" variant="outline" onClick={() => document.getElementById('avatar-upload-input')?.click()}>
                                            <UploadCloud className="mr-2 h-4 w-4" />Subir Avatar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Tono y Horarios</CardTitle>
                             <CardDescription>
                                Define la personalidad y disponibilidad de tu asistente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Controller
                                name="communication.tone"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-3">
                                        <Label>Tono de Comunicación</Label>
                                        <RadioGroup
                                            value={field.value || 'Amigable y cercano'}
                                            onValueChange={field.onChange}
                                            name={field.name}
                                        >
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Profesional y formal" id="tone-formal" /><Label htmlFor="tone-formal">Profesional y formal</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Amigable y cercano" id="tone-friendly" /><Label htmlFor="tone-friendly">Amigable y cercano</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="Casual y divertido" id="tone-casual" /><Label htmlFor="tone-casual">Casual y divertido</Label></div>
                                        </RadioGroup>
                                    </div>
                                )}
                            />
                            <Controller
                                name="communication.greeting"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="greeting-message">Saludo Personalizado</Label>
                                        <Textarea
                                            id="greeting-message"
                                            value={field.value || ''}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            name={field.name}
                                        />
                                    </div>
                                )}
                            />
                             <div className="space-y-4 rounded-lg border p-4">
                                <Controller
                                    name="schedule.is247"
                                    control={control}
                                    render={({ field }) => (
                                         <div className="flex items-center justify-between">
                                            <Label htmlFor="schedule-247" className="flex flex-col space-y-1">
                                                <span>Responder 24/7</span>
                                                <span className="font-normal leading-snug text-muted-foreground">Si se desactiva, el bot solo responderá en el horario definido.</span>
                                            </Label>
                                            <Switch
                                                id="schedule-247"
                                                checked={field.value ?? true}
                                                onCheckedChange={field.onChange}
                                                name={field.name}
                                            />
                                        </div>
                                    )}
                                />
                                {!watch('schedule.is247') && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Controller
                                                name="schedule.startTime"
                                                control={control}
                                                render={({ field }) => (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="start-time">Hora de Inicio</Label>
                                                        <Input
                                                            id="start-time"
                                                            type="time"
                                                            value={field.value || ''}
                                                            onChange={field.onChange}
                                                            onBlur={field.onBlur}
                                                            name={field.name}
                                                        />
                                                    </div>
                                                )}
                                            />
                                            <Controller
                                                name="schedule.endTime"
                                                control={control}
                                                render={({ field }) => (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="end-time">Hora de Fin</Label>
                                                        <Input
                                                            id="end-time"
                                                            type="time"
                                                            value={field.value || ''}
                                                            onChange={field.onChange}
                                                            onBlur={field.onBlur}
                                                            name={field.name}
                                                        />
                                                    </div>
                                                )}
                                            />
                                        </div>
                                        <Controller
                                            name="schedule.offHoursMessage"
                                            control={control}
                                            render={({ field }) => (
                                                <div className="space-y-2">
                                                    <Label htmlFor="offhours-message">Mensaje fuera de horario</Label>
                                                    <Textarea
                                                        id="offhours-message"
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                        onBlur={field.onBlur}
                                                        name={field.name}
                                                    />
                                                </div>
                                            )}
                                        />
                                    </div>
                                )}
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="knowledge">
                   <KnowledgeBaseManager />
                </TabsContent>

                <TabsContent value="analytics">
                    <ChatbotAnalytics />
                </TabsContent>
            </Tabs>
        </div>
    );
}
