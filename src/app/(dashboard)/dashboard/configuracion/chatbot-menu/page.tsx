'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  Bot, 
  Palette, 
  MessageSquare, 
  Eye, 
  Info, 
  Search, 
  ExternalLink, 
  LayoutGrid, 
  Building2,
  ChevronRight,
  UploadCloud,
  Pencil
} from 'lucide-react';
import { PublicMenuChatbotConfig, DEFAULT_CHATBOT_CONFIG, PublicMenuAutoResponse } from '@/models/public-menu-chatbot';
import { PublicMenuChatWidget } from '@/components/public-menu-chatbot/PublicMenuChatWidget';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useCollection } from '@/firebase';
import type { Business } from '@/models/business';
import Link from 'next/link';
import Image from 'next/image';

export default function ChatbotMenuConfigPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Suscripción a Configuración Principal
  const configRef = useMemoFirebase(
    () => (user ? doc(firestore, `businesses/${user.uid}/publicMenuChatbot`, 'config') : null),
    [firestore, user]
  );
  const { data: savedConfig, isLoading: loadingConfig } = useDoc<PublicMenuChatbotConfig>(configRef);
  const [localConfig, setLocalConfig] = useState<PublicMenuChatbotConfig>(DEFAULT_CHATBOT_CONFIG);

  // 2. Suscripción a Respuestas Automáticas
  const responsesRef = useMemoFirebase(
    () => (user ? collection(firestore, `businesses/${user.uid}/publicMenuChatbot`, 'responses') : null),
    [firestore, user]
  );
  const { data: rawResponses, isLoading: loadingResponses } = useCollection<PublicMenuAutoResponse>(
    useMemoFirebase(() => (responsesRef ? query(responsesRef, orderBy('createdAt', 'desc')) : null), [responsesRef])
  );

  // 3. Suscripción a Datos del Negocio (Conocimiento)
  const businessRef = useMemoFirebase(
    () => (user ? doc(firestore, 'businesses', user.uid) : null),
    [firestore, user]
  );
  const { data: business } = useDoc<Business>(businessRef);

  // 4. Suscripción a Catálogo Público (Resumen)
  const catalogRef = useMemoFirebase(
    () => (user ? doc(firestore, `businesses/${user.uid}/publicData`, 'catalog') : null),
    [firestore, user]
  );
  const { data: catalog } = useDoc<any>(catalogRef);

  // Modal de Respuestas
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<PublicMenuAutoResponse | null>(null);
  const [respForm, setRespForm] = useState({ question: '', answer: '', isActive: true });

  useEffect(() => {
    if (savedConfig) setLocalConfig(savedConfig);
  }, [savedConfig]);

  const handleSaveConfig = async () => {
    if (!configRef) return;
    setIsSaving(true);
    try {
      await setDocumentNonBlocking(configRef, {
        ...localConfig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: '¡Guardado!', description: 'La configuración del chatbot ha sido actualizada.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof PublicMenuChatbotConfig) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Archivo muy grande', description: 'El límite es 5MB.' });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const result = await uploadMedia({ mediaDataUri: reader.result as string });
        setLocalConfig(prev => ({ ...prev, [field]: result.secure_url }));
        toast({ title: 'Imagen cargada' });
      };
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error de carga' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenResponseDialog = (res: PublicMenuAutoResponse | null = null) => {
    setEditingResponse(res);
    setRespForm(res ? { question: res.question, answer: res.answer, isActive: res.isActive } : { question: '', answer: '', isActive: true });
    setIsResponseModalOpen(true);
  };

  const handleSaveResponse = async () => {
    if (!responsesRef || !respForm.question.trim() || !respForm.answer.trim()) return;
    setIsSaving(true);
    try {
      const data = {
        ...respForm,
        updatedAt: new Date().toISOString()
      };

      if (editingResponse) {
        await setDocumentNonBlocking(doc(responsesRef, editingResponse.id), data, { merge: true });
      } else {
        await addDocumentNonBlocking(responsesRef, {
          ...data,
          createdAt: new Date().toISOString()
        });
      }
      setIsResponseModalOpen(false);
      toast({ title: 'Respuesta guardada' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al guardar respuesta' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteResponse = async (id: string) => {
    if (!responsesRef) return;
    try {
      await deleteDoc(doc(responsesRef, id));
      toast({ title: 'Respuesta eliminada' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  };

  const filteredResponses = useMemo(() => {
    if (!rawResponses) return [];
    return rawResponses.filter(r => 
      r.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawResponses, searchTerm]);

  if (loadingConfig || loadingResponses) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Cargando panel del asistente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Bot className="h-9 w-9 text-primary" />
            Asistente del Menú Público
          </h1>
          <p className="text-muted-foreground">Personaliza el chatbot que ayuda a tus clientes a navegar tu catálogo.</p>
        </div>
        <Button onClick={handleSaveConfig} disabled={isSaving} className="font-bold px-8 shadow-lg">
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Cambios
        </Button>
      </header>

      <Tabs defaultValue="apariencia" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="apariencia" className="gap-2 rounded-lg"><Palette className="h-4 w-4" /> Apariencia</TabsTrigger>
          <TabsTrigger value="automatizacion" className="gap-2 rounded-lg"><MessageSquare className="h-4 w-4" /> Automatización</TabsTrigger>
          <TabsTrigger value="conocimiento" className="gap-2 rounded-lg"><Info className="h-4 w-4" /> Conocimiento</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2 rounded-lg"><Eye className="h-4 w-4" /> Vista Previa</TabsTrigger>
          <TabsTrigger value="activacion" className="gap-2 rounded-lg"><Bot className="h-4 w-4" /> Activación</TabsTrigger>
        </TabsList>

        {/* --- TABS CONTENT --- */}

        {/* 1. APARIENCIA */}
        <TabsContent value="apariencia" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-lg">Identidad del Asistente</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre que verá el cliente</Label>
                    <Input 
                      placeholder="Ej: Max, tu asistente" 
                      value={localConfig.assistantName} 
                      onChange={e => setLocalConfig({...localConfig, assistantName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensaje de Bienvenida Inicial</Label>
                    <Input 
                      placeholder="¡Hola! ¿En qué puedo ayudarte?" 
                      value={localConfig.greetingMessage} 
                      onChange={e => setLocalConfig({...localConfig, greetingMessage: e.target.value})}
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Color de Cabecera</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={localConfig.headerColor} onChange={e => setLocalConfig({...localConfig, headerColor: e.target.value})} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={localConfig.headerColor.toUpperCase()} onChange={e => setLocalConfig({...localConfig, headerColor: e.target.value})} className="font-mono text-xs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color de Botones</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={localConfig.buttonColor} onChange={e => setLocalConfig({...localConfig, buttonColor: e.target.value})} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={localConfig.buttonColor.toUpperCase()} onChange={e => setLocalConfig({...localConfig, buttonColor: e.target.value})} className="font-mono text-xs" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color de Fondo Chat</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={localConfig.secondaryColor} onChange={e => setLocalConfig({...localConfig, secondaryColor: e.target.value})} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={localConfig.secondaryColor.toUpperCase()} onChange={e => setLocalConfig({...localConfig, secondaryColor: e.target.value})} className="font-mono text-xs" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Recursos Visuales</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Avatar del Bot</Label>
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24 rounded-full border-4 border-muted overflow-hidden bg-muted flex items-center justify-center group">
                      {localConfig.avatarUrl ? (
                        <>
                          <Image src={localConfig.avatarUrl} alt="Avatar" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Button variant="ghost" size="icon" className="text-white" onClick={() => document.getElementById('avatar-upload')?.click()}><Pencil className="h-4 w-4" /></Button>
                          </div>
                        </>
                      ) : <Bot className="h-10 w-10 text-muted-foreground" />}
                    </div>
                    <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'avatarUrl')} />
                    {!localConfig.avatarUrl && <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}><UploadCloud className="mr-2 h-4 w-4" /> Subir Avatar</Button>}
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                  <Label>Logo del Chat (opcional)</Label>
                  <div className="relative aspect-video w-full rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted group">
                    {localConfig.logoUrl ? (
                      <>
                        <Image src={localConfig.logoUrl} alt="Logo chat" fill className="object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Button variant="ghost" size="icon" className="text-white" onClick={() => document.getElementById('logo-upload')?.click()}><Pencil className="h-4 w-4" /></Button>
                        </div>
                      </>
                    ) : <Button variant="ghost" onClick={() => document.getElementById('logo-upload')?.click()}><Plus className="mr-2 h-4 w-4" /> Añadir Logo</Button>}
                    <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'logoUrl')} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. RESPUESTAS AUTOMÁTICAS */}
        <TabsContent value="automatizacion" className="space-y-6 pt-2">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center bg-muted/20">
              <div>
                <CardTitle className="text-lg">Respuestas Predeterminadas</CardTitle>
                <CardDescription>Configura respuestas fijas para preguntas frecuentes. Tienen prioridad sobre la IA.</CardDescription>
              </div>
              <Button onClick={() => handleOpenResponseDialog()} className="font-bold">
                <Plus className="mr-2 h-4 w-4" /> Nueva Respuesta
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar en mis respuestas..." 
                  className="pl-10" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>

              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Pregunta / Trigger</TableHead>
                      <TableHead>Respuesta</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponses.length > 0 ? filteredResponses.map(res => (
                      <TableRow key={res.id}>
                        <TableCell className="font-bold">{res.question}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{res.answer}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={res.isActive ? 'default' : 'secondary'}>{res.isActive ? 'Activo' : 'Inactivo'}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenResponseDialog(res)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteResponse(res.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                          No se encontraron respuestas que coincidan.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CONOCIMIENTO DEL NEGOCIO */}
        <TabsContent value="conocimiento" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Datos Maestros del Negocio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-bold">{business?.name}</span>
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="font-bold">{business?.phone || 'N/A'}</span>
                    <span className="text-muted-foreground">Dirección:</span>
                    <span className="font-bold truncate">{business?.address || 'N/A'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Esta información se sincroniza automáticamente desde <strong>Perfil del Negocio</strong>. El chatbot la usará para responder sobre ubicación y contacto.</p>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/dashboard/perfil">Editar Datos de Negocio <ExternalLink className="ml-2 h-3 w-3" /></Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Inventario y Catálogo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center">
                    <p className="text-2xl font-black text-primary">{catalog?.products?.length || 0}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Productos Activos</p>
                  </div>
                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center">
                    <p className="text-2xl font-black text-primary">{catalog?.headerConfig?.carouselItems?.filter((i: any) => i.mediaUrl).length || 0}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Promos Visuales</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>La IA conoce tus precios y categorías actuales. Cualquier cambio en tu catálogo se refleja inmediatamente en sus respuestas.</p>
                </div>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/dashboard/catalogo">Gestionar Catálogo <ChevronRight className="ml-2 h-3 w-3" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. VISTA PREVIA */}
        <TabsContent value="preview" className="pt-2 h-[650px] relative">
          <div className="absolute inset-0 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-white shadow-inner">
             <div className="text-center max-w-sm px-6">
                <Bot className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-2">Modo Simulador</h3>
                <p className="text-gray-400 text-sm mb-8">Usa el widget de la derecha para probar respuestas manuales y de IA basadas en tu configuración actual.</p>
             </div>
             {/* El widget se renderiza aquí mismo */}
             {user?.uid && <PublicMenuChatWidget businessId={user.uid} isPreview={true} />}
          </div>
        </TabsContent>

        {/* 5. ACTIVACIÓN */}
        <TabsContent value="activacion" className="space-y-6 pt-2">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Estatus del Módulo</CardTitle><CardDescription>Controla cuándo y dónde aparece el asistente.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-primary/5 rounded-2xl border-2 border-primary/20">
                <div className="space-y-1">
                  <Label className="text-lg font-black text-primary">Chatbot Público Activo</Label>
                  <p className="text-sm text-muted-foreground">Al activar, los visitantes del catálogo verán la burbuja de chat.</p>
                </div>
                <Switch 
                  checked={localConfig.isActive} 
                  onCheckedChange={v => setLocalConfig({...localConfig, isActive: v})} 
                  className="scale-125"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Posición en Pantalla</Label>
                  <Select 
                    value={localConfig.position} 
                    onValueChange={(v: any) => setLocalConfig({...localConfig, position: v})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Inferior Derecha</SelectItem>
                      <SelectItem value="bottom-left">Inferior Izquierda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Auto-apertura (segundos)</Label>
                  <Input 
                    type="number" 
                    min={0} 
                    max={60} 
                    value={localConfig.autoOpenDelay} 
                    onChange={e => setLocalConfig({...localConfig, autoOpenDelay: Number(e.target.value)})} 
                  />
                  <p className="text-[10px] text-muted-foreground italic">0 = no abrir automáticamente</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-4 text-xs flex items-center gap-2 text-muted-foreground">
               <Info className="h-3 w-3" /> Este módulo requiere que el Administrador Global te haya asignado el permiso de 'Chatbot Menú Público'.
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO CRUD RESPUESTAS */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingResponse ? 'Editar Respuesta' : 'Nueva Respuesta Automática'}</DialogTitle>
            <DialogDescription>Define una pregunta exacta y la respuesta que el bot debe dar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pregunta del Cliente (Trigger)</Label>
              <Input 
                placeholder="¿Hacen domicilios?" 
                value={respForm.question} 
                onChange={e => setRespForm({...respForm, question: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Tu Respuesta</Label>
              <Textarea 
                placeholder="¡Claro! Hacemos domicilios en toda la ciudad..." 
                value={respForm.answer} 
                onChange={e => setRespForm({...respForm, answer: e.target.value})} 
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={respForm.isActive} onCheckedChange={v => setRespForm({...respForm, isActive: v})} />
              <Label>Respuesta Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResponseModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveResponse} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}