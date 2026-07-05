'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  Building2,
  Pencil,
  Lock,
  CheckCircle,
  Upload,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { PublicMenuChatbotConfig, DEFAULT_CHATBOT_CONFIG, PublicMenuAutoResponse, PUBLIC_MENU_CHATBOT_MODULE_ID } from '@/models/public-menu-chatbot';
import { PublicMenuChatWidget } from '@/components/public-menu-chatbot/PublicMenuChatWidget';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import type { Business } from '@/models/business';
import type { Module } from '@/models/module';
import { useSubscription } from '@/hooks/useSubscription';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

/**
 * Función auxiliar para dividir un array en trozos (chunks)
 */
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

interface ImportRow {
  Pregunta?: string;
  Respuesta?: string;
  Estado?: string | boolean;
  error?: string;
  isValid: boolean;
}

export default function ChatbotMenuConfigPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isModuleAuthorized, isLoading: isSubLoading } = useSubscription();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Importación Masiva
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 0. Validación de Módulo Global (Super Admin)
  const globalModuleRef = useMemoFirebase(
    () => doc(firestore, 'modules', PUBLIC_MENU_CHATBOT_MODULE_ID),
    [firestore]
  );
  const { data: globalModule, isLoading: loadingGlobalModule } = useDoc<Module>(globalModuleRef);
  
  const isGlobalActive = globalModule?.status === 'active';

  // 1. Suscripción a Configuración Principal (Documento main)
  const configRef = useMemoFirebase(
    () => (user ? doc(firestore, 'businesses', user.uid, 'publicMenuChatbot', 'main') : null),
    [firestore, user]
  );
  const { data: savedConfig, isLoading: loadingConfig } = useDoc<PublicMenuChatbotConfig>(configRef);
  const [localConfig, setLocalConfig] = useState<PublicMenuChatbotConfig>(DEFAULT_CHATBOT_CONFIG);

  // 2. Suscripción a Respuestas Automáticas
  const responsesRef = useMemoFirebase(
    () => (user ? collection(firestore, 'businesses', user.uid, 'publicMenuChatbot', 'main', 'responses') : null),
    [firestore, user]
  );
  const { data: rawResponses, isLoading: loadingResponses } = useCollection<PublicMenuAutoResponse>(
    useMemoFirebase(() => (responsesRef ? query(responsesRef, orderBy('updatedAt', 'desc')) : null), [responsesRef])
  );

  // 3. Suscripción a Datos del Negocio
  const businessRef = useMemoFirebase(
    () => (user ? doc(firestore, 'businesses', user.uid) : null),
    [firestore, user]
  );
  const { data: business } = useDoc<Business>(businessRef);

  // 4. Suscripción a Catálogo Público
  const catalogRef = useMemoFirebase(
    () => (user ? doc(firestore, 'businesses', user.uid, 'publicData', 'catalog') : null),
    [firestore, user]
  );
  const { data: catalog } = useDoc<any>(catalogRef);

  // Modal de Respuestas Manuales
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<PublicMenuAutoResponse | null>(null);
  const [respForm, setRespForm] = useState({ question: '', answer: '', isActive: true });

  useEffect(() => {
    if (savedConfig) setLocalConfig(savedConfig);
  }, [savedConfig]);

  const handleSaveConfig = async () => {
    if (!configRef || !isGlobalActive) return;
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
    if (!isGlobalActive) return;
    const file = e.target.files?.[0];
    if (!file) return;

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

  // --- LÓGICA DE IMPORTACIÓN MASIVA ---

  const downloadTemplate = () => {
    const data = [
      ["Pregunta", "Respuesta", "Estado"],
      ["¿Cuáles son los horarios?", "Abrimos de Lunes a Viernes de 8am a 6pm.", "Activo"],
      ["¿Hacen domicilios?", "Sí, llegamos a toda la ciudad con un recargo de $5000.", "Inactivo"],
      ["¿Cuál es la especialidad?", "Nuestra hamburguesa de la casa con pan artesanal.", "active"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respuestas");
    XLSX.writeFile(wb, "Plantilla_Respuestas_Chatbot.xlsx");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          toast({ variant: 'destructive', title: 'Archivo vacío', description: 'El archivo no contiene filas de datos.' });
          return;
        }

        const processed: ImportRow[] = data.map((row: any) => {
          const q = String(row.Pregunta || row.pregunta || '').trim();
          const a = String(row.Respuesta || row.respuesta || '').trim();
          const s = String(row.Estado || row.estado || '').toLowerCase();
          
          let isActive = false;
          if (s === 'activo' || s === 'active' || s === 'true' || s === '1') isActive = true;

          const isValid = q.length > 0 && a.length > 0;
          
          return {
            Pregunta: q,
            Respuesta: a,
            Estado: isActive,
            isValid,
            error: !isValid ? 'Pregunta y Respuesta son obligatorias' : undefined
          };
        });

        setImportRows(processed);
        setIsImportModalOpen(true);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error al leer archivo', description: 'Asegúrate de que el formato sea correcto (.xlsx o .csv).' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmBulkImport = async () => {
    if (!user || !firestore || !responsesRef) return;
    const validRows = importRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const chunks = chunkArray(validRows, 500);
      const now = new Date().toISOString();

      for (const chunk of chunks) {
        const batch = writeBatch(firestore);
        chunk.forEach(row => {
          const newDocRef = doc(responsesRef);
          batch.set(newDocRef, {
            question: row.Pregunta,
            answer: row.Respuesta,
            isActive: row.Estado,
            createdAt: now,
            updatedAt: now
          });
        });
        await batch.commit();
      }

      toast({ title: '¡Importación exitosa!', description: `Se han agregado ${validRows.length} respuestas correctamente.` });
      setIsImportModalOpen(false);
      setImportRows([]);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al importar', description: 'Ocurrió un fallo al escribir en la base de datos.' });
    } finally {
      setIsImporting(false);
    }
  };

  // --- CRUD MANUAL ---

  const handleOpenResponseDialog = (res: PublicMenuAutoResponse | null = null) => {
    if (!isGlobalActive) return;
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
    if (!responsesRef || !isGlobalActive) return;
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

  if (loadingConfig || loadingResponses || loadingGlobalModule || isSubLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Sincronizando asistente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* AVISO DE MÓDULO DESACTIVADO GLOBALMENTE */}
      {!isGlobalActive && (
        <Card className="border-destructive bg-destructive/5 border-2">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="p-3 bg-destructive/10 rounded-full text-destructive">
                    <Lock className="h-8 w-8" />
                </div>
                <div className="flex-1 space-y-1">
                    <h3 className="text-lg font-black text-destructive uppercase">Módulo Desactivado por Administración</h3>
                    <p className="text-sm text-destructive/80 font-medium">
                        El Chatbot del Menú Público está temporalmente fuera de servicio para toda la plataforma. 
                        Puedes consultar tu configuración actual, pero la edición está bloqueada hasta nuevo aviso.
                    </p>
                </div>
            </CardContent>
        </Card>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Bot className="h-9 w-9 text-primary" />
            Asistente del Menú Público
          </h1>
          <p className="text-muted-foreground">Configura el comportamiento y diseño del chatbot de tu catálogo.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleSaveConfig} disabled={isSaving || !isGlobalActive} className="font-bold px-8 shadow-lg">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
            </Button>
        </div>
      </header>

      <Tabs defaultValue="apariencia" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="apariencia" className="gap-2 rounded-lg"><Palette className="h-4 w-4" /> Apariencia</TabsTrigger>
          <TabsTrigger value="automatizacion" className="gap-2 rounded-lg"><MessageSquare className="h-4 w-4" /> Automatización</TabsTrigger>
          <TabsTrigger value="conocimiento" className="gap-2 rounded-lg"><Info className="h-4 w-4" /> Conocimiento</TabsTrigger>
          <TabsTrigger value="preview" className="gap-2 rounded-lg"><Eye className="h-4 w-4" /> Vista Previa</TabsTrigger>
          <TabsTrigger value="activacion" className="gap-2 rounded-lg"><Bot className="h-4 w-4" /> Activación</TabsTrigger>
        </TabsList>

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
                      disabled={!isGlobalActive}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensaje de Bienvenida Inicial</Label>
                    <Input 
                      placeholder="¡Hola! ¿En qué puedo ayudarte?" 
                      value={localConfig.greetingMessage} 
                      onChange={e => setLocalConfig({...localConfig, greetingMessage: e.target.value})}
                      disabled={!isGlobalActive}
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Color de Cabecera</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={localConfig.headerColor} onChange={e => setLocalConfig({...localConfig, headerColor: e.target.value})} className="w-12 h-10 p-1 cursor-pointer" disabled={!isGlobalActive} />
                      <Input value={localConfig.headerColor.toUpperCase()} onChange={e => setLocalConfig({...localConfig, headerColor: e.target.value})} className="font-mono text-xs" disabled={!isGlobalActive} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color de Botones</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={localConfig.buttonColor} onChange={e => setLocalConfig({...localConfig, buttonColor: e.target.value})} className="w-12 h-10 p-1 cursor-pointer" disabled={!isGlobalActive} />
                      <Input value={localConfig.buttonColor.toUpperCase()} onChange={e => setLocalConfig({...localConfig, buttonColor: e.target.value})} className="font-mono text-xs" disabled={!isGlobalActive} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Color de Fondo Chat</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={localConfig.secondaryColor} onChange={e => setLocalConfig({...localConfig, secondaryColor: e.target.value})} className="w-12 h-10 p-1 cursor-pointer" disabled={!isGlobalActive} />
                      <Input value={localConfig.secondaryColor.toUpperCase()} onChange={e => setLocalConfig({...localConfig, secondaryColor: e.target.value})} className="font-mono text-xs" disabled={!isGlobalActive} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Avatar</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24 rounded-full border-4 border-muted overflow-hidden bg-muted flex items-center justify-center group">
                      {localConfig.avatarUrl ? (
                        <>
                          <Image src={localConfig.avatarUrl} alt="Avatar" fill className="object-cover" />
                          {isGlobalActive && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Button variant="ghost" size="icon" className="text-white" onClick={() => document.getElementById('avatar-upload')?.click()}><Pencil className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </>
                      ) : <Bot className="h-10 w-10 text-muted-foreground" />}
                    </div>
                    {isGlobalActive && (
                        <>
                            <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={e => handleUploadImage(e, 'avatarUrl')} />
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('avatar-upload')?.click()}>Cambiar Imagen</Button>
                        </>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automatizacion" className="space-y-6 pt-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
              <div className="space-y-1">
                <CardTitle className="text-lg">Respuestas Predeterminadas</CardTitle>
                <CardDescription>Sincroniza tus respuestas vía Excel/CSV o gestiónalas manualmente.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="font-bold border-primary text-primary hover:bg-primary/5">
                  <Download className="mr-2 h-4 w-4" /> Plantilla
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={!isGlobalActive} className="font-bold border-primary text-primary hover:bg-primary/5">
                  <Upload className="mr-2 h-4 w-4" /> Importar
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileImport} />
                <Button onClick={() => handleOpenResponseDialog()} disabled={!isGlobalActive} className="font-bold shadow-md">
                  <Plus className="mr-2 h-4 w-4" /> Nueva Respuesta
                </Button>
              </div>
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
                      <TableHead>Trigger (Pregunta)</TableHead>
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
                          <Button variant="ghost" size="icon" onClick={() => handleOpenResponseDialog(res)} disabled={!isGlobalActive}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteResponse(res.id)} disabled={!isGlobalActive}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                          No se encontraron respuestas.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conocimiento" className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Información del Negocio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-muted/30 rounded-xl space-y-2 text-sm">
                            <p><span className="text-muted-foreground font-bold mr-2 uppercase text-[10px]">Nombre:</span> {business?.name}</p>
                            <p><span className="text-muted-foreground font-bold mr-2 uppercase text-[10px]">Teléfono:</span> {business?.phone || 'N/A'}</p>
                            <p><span className="text-muted-foreground font-bold mr-2 uppercase text-[10px]">Categoría:</span> {business?.category || 'General'}</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                            <Info className="h-4 w-4 shrink-0 mt-0.5" />
                            <p>Sincronizado desde el Perfil del Negocio.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Catálogo Sincronizado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center">
                            <p className="text-3xl font-black text-primary">{catalog?.products?.length || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Productos en Memoria</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <p>La IA conoce tus precios y categorías actuales. Cualquier cambio en tu catálogo se refleja inmediatamente en sus respuestas.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="preview" className="pt-2 h-[550px] relative">
          <div className="absolute inset-0 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-white shadow-inner">
             {user?.uid && <PublicMenuChatWidget businessId={user.uid} isPreview={true} />}
          </div>
        </TabsContent>

        <TabsContent value="activacion" className="space-y-6 pt-2">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Activación del Asistente</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-primary/5 rounded-2xl border-2 border-primary/20">
                <div className="space-y-1">
                  <Label className="text-lg font-black text-primary">Chatbot Público Visible</Label>
                  <p className="text-sm text-muted-foreground">Al activar, el botón de chat aparecerá en tu catálogo.</p>
                </div>
                <Switch 
                  checked={localConfig.isActive} 
                  onCheckedChange={v => setLocalConfig({...localConfig, isActive: v})} 
                  disabled={!isGlobalActive}
                  className="scale-125"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Posición en Pantalla</Label>
                  <Select 
                    value={localConfig.position} 
                    onValueChange={(v: any) => setLocalConfig({...localConfig, position: v})}
                    disabled={!isGlobalActive}
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
                    value={localConfig.autoOpenDelay} 
                    onChange={e => setLocalConfig({...localConfig, autoOpenDelay: Number(e.target.value)})} 
                    disabled={!isGlobalActive}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO CRUD RESPUESTAS MANUALES */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingResponse ? 'Editar Respuesta' : 'Nueva Respuesta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pregunta exacta (Trigger)</Label>
              <Input 
                placeholder="¿Tienen envíos gratis?" 
                value={respForm.question} 
                onChange={e => setRespForm({...respForm, question: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Respuesta del Bot</Label>
              <Textarea 
                placeholder="Sí, en compras mayores a..." 
                value={respForm.answer} 
                onChange={e => setRespForm({...respForm, answer: e.target.value})} 
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResponseModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveResponse} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE VISTA PREVIA DE IMPORTACIÓN MASIVA */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Vista Previa de Importación
            </DialogTitle>
            <DialogDescription>
              Revisa los datos antes de guardarlos. Se detectaron {importRows.length} filas en total.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-muted/50 rounded-xl text-center border">
                <p className="text-2xl font-black text-primary">{importRows.filter(r => r.isValid).length}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Válidas</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center border border-red-100">
                <p className="text-2xl font-black text-red-600">{importRows.filter(r => !r.isValid).length}</p>
                <p className="text-[10px] uppercase font-bold text-red-400">Con Error</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center border border-blue-100">
                <p className="text-2xl font-black text-blue-600">{importRows.length}</p>
                <p className="text-[10px] uppercase font-bold text-blue-400">Total Leídas</p>
              </div>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-1/3">Pregunta</TableHead>
                    <TableHead className="w-1/3">Respuesta</TableHead>
                    <TableHead className="text-center">Estatus</TableHead>
                    <TableHead className="text-right">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRows.map((row, i) => (
                    <TableRow key={i} className={cn(!row.isValid && "bg-red-50/50")}>
                      <TableCell className="text-sm font-medium">{row.Pregunta || '-'}</TableCell>
                      <TableCell className="text-sm truncate max-w-[200px]">{row.Respuesta || '-'}</TableCell>
                      <TableCell className="text-center">
                        {row.isValid ? (
                          <Badge variant={row.Estado ? 'default' : 'secondary'}>{row.Estado ? 'Activo' : 'Inactivo'}</Badge>
                        ) : <Badge variant="destructive">Error</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!row.isValid && <span className="text-[10px] text-red-600 font-bold uppercase">{row.error}</span>}
                        {row.isValid && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t">
            <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} disabled={isImporting}>Cancelar</Button>
            <Button 
              onClick={confirmBulkImport} 
              disabled={isImporting || importRows.filter(r => r.isValid).length === 0}
              className="font-bold px-8"
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Confirmar Importación ({importRows.filter(r => r.isValid).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}