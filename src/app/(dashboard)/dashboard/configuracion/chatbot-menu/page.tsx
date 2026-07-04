'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, Trash2, Bot, Palette, MessageSquare, Eye, Info } from 'lucide-react';
import { PublicMenuChatbotConfig, DEFAULT_CHATBOT_CONFIG, PublicMenuAutoResponse } from '@/models/public-menu-chatbot';
import { PublicMenuChatWidget } from '@/components/public-menu-chatbot/PublicMenuChatWidget';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useCollection } from '@/firebase';

export default function ChatbotMenuConfigPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Configuración Principal
  const configRef = useMemoFirebase(() => doc(firestore, `businesses/${user!.uid}/publicMenuChatbot`, 'config'), [firestore, user]);
  const { data: savedConfig, isLoading: loadingConfig } = useDoc<PublicMenuChatbotConfig>(configRef);
  const [localConfig, setLocalConfig] = useState<PublicMenuChatbotConfig>(DEFAULT_CHATBOT_CONFIG);

  // 2. Respuestas Automáticas
  const responsesRef = useMemoFirebase(() => collection(firestore, `businesses/${user!.uid}/publicMenuChatbot`, 'responses'), [firestore, user]);
  const { data: responses, isLoading: loadingResponses } = useCollection<PublicMenuAutoResponse>(responsesRef);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    if (savedConfig) setLocalConfig(savedConfig);
  }, [savedConfig]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await setDocumentNonBlocking(configRef!, localConfig);
      toast({ title: 'Configuración guardada' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'logoUrl' | 'backgroundUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const result = await uploadMedia({ mediaDataUri: reader.result as string });
        setLocalConfig(prev => ({ ...prev, [field]: result.secure_url }));
        toast({ title: 'Imagen subida' });
      };
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al subir imagen' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddResponse = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    try {
      const now = new Date().toISOString();
      await addDocumentNonBlocking(responsesRef!, {
        question: newQuestion,
        answer: newAnswer,
        isActive: true,
        createdAt: now,
        updatedAt: now
      });
      setNewQuestion('');
      setNewAnswer('');
      toast({ title: 'Respuesta añadida' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al añadir' });
    }
  };

  if (loadingConfig || loadingResponses) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <Bot className="text-primary" /> Asistente IA del Menú
            </CardTitle>
            <CardDescription>Configura el chatbot que ayudará a tus clientes en el catálogo público.</CardDescription>
          </div>
          <Button onClick={handleSaveConfig} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Todo
          </Button>
        </CardHeader>
      </Card>

      <Tabs defaultValue="apariencia">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="apariencia" className="gap-2 rounded-lg"><Palette className="h-4 w-4" /> Apariencia</TabsTrigger>
          <TabsTrigger value="automatizacion" className="gap-2 rounded-lg"><MessageSquare className="h-4 w-4" /> Automatización</TabsTrigger>
          <TabsTrigger value="conocimiento" className="gap-2 rounded-lg"><Info className="h-4 w-4" /> Conocimiento</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2 rounded-lg"><Eye className="h-4 w-4" /> Vista Previa</TabsTrigger>
        </TabsList>

        <TabsContent value="apariencia" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Identidad</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nombre del Asistente</Label>
                  <Input value={localConfig.assistantName} onChange={e => setLocalConfig({...localConfig, assistantName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Mensaje de Bienvenida</Label>
                  <Input value={localConfig.greetingMessage} onChange={e => setLocalConfig({...localConfig, greetingMessage: e.target.value})} />
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Label>Activar Módulo</Label>
                  <Switch checked={localConfig.isActive} onCheckedChange={v => setLocalConfig({...localConfig, isActive: v})} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Colores y Marca</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cabecera</Label>
                  <Input type="color" value={localConfig.headerColor} onChange={e => setLocalConfig({...localConfig, headerColor: e.target.value})} className="h-10 p-1" />
                </div>
                <div className="space-y-2">
                  <Label>Botón Principal</Label>
                  <Input type="color" value={localConfig.buttonColor} onChange={e => setLocalConfig({...localConfig, buttonColor: e.target.value})} className="h-10 p-1" />
                </div>
                <div className="space-y-2">
                  <Label>Fondo Chat</Label>
                  <Input type="color" value={localConfig.secondaryColor} onChange={e => setLocalConfig({...localConfig, secondaryColor: e.target.value})} className="h-10 p-1" />
                </div>
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <Input type="file" accept="image/*" onChange={e => handleUploadImage(e, 'avatarUrl')} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automatizacion" className="space-y-6 pt-4">
          <Card>
            <CardHeader><CardTitle>Preguntas y Respuestas Frecuentes</CardTitle><CardDescription>Las respuestas configuradas aquí tienen prioridad sobre la IA generativa.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input placeholder="Pregunta (ej: ¿Tienen domicilio?)" value={newQuestion} onChange={e => setNewQuestion(e.target.value)} />
                <Input placeholder="Respuesta" value={newAnswer} onChange={e => setNewAnswer(e.target.value)} />
                <Button onClick={handleAddResponse}><Plus className="h-4 w-4" /></Button>
              </div>
              <Separator />
              <div className="space-y-2">
                {responses?.map(res => (
                  <div key={res.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                    <div>
                      <p className="font-bold text-sm">{res.question}</p>
                      <p className="text-xs text-muted-foreground">{res.answer}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(firestore, `businesses/${user!.uid}/publicMenuChatbot/responses`, res.id))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conocimiento" className="pt-4">
          <Card>
            <CardHeader><CardTitle>Información del Sistema</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-bold text-sm">Fuentes de Verdad Activas:</h4>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Datos maestros de Negocio (Horarios, Dirección, Redes)</li>
                  <li>Catálogo Público (Productos, Precios, Categorías)</li>
                  <li>Promociones y Cupones vigentes</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground italic">El chatbot lee automáticamente estos datos. No necesitas cargarlos dos veces.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="pt-4 h-[600px] relative">
          <div className="absolute inset-0 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border">
             <div className="text-center">
               <p className="text-xs font-bold text-gray-400 uppercase mb-2">Simulador de Catálogo Público</p>
               <PublicMenuChatWidget businessId={user!.uid} isPreview={true} />
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
