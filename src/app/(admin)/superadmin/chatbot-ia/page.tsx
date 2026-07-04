'use client';

import { useState, useTransition, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
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
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Bot, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { Integration } from '@/models/integration';
import { AIProviderForm } from '../integraciones/page';
import { saveIntegrationFields, updateIntegrationStatus } from '@/actions/integrations';

const AI_INTEGRATION_ID = 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas';

export default function ChatbotIAPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, startSavingTransition] = useTransition();
  const [isUpdatingStatus, startStatusTransition] = useTransition();

  const aiDocRef = useMemoFirebase(
    () => (!firestore ? null : doc(firestore, 'integrations', AI_INTEGRATION_ID)),
    [firestore]
  );
  
  const { data: integration, isLoading } = useDoc<Integration>(aiDocRef);

  const isConfigured = useMemo(() => {
    if (!integration?.fields) return false;
    try {
      let fields: any = {};
      if (typeof integration.fields === 'object') {
        fields = integration.fields;
      } else if (typeof integration.fields === 'string' && integration.fields.trim().startsWith('{')) {
        fields = JSON.parse(integration.fields);
      }
      return !!(
        fields.google?.apiKey || 
        fields.openai?.apiKey || 
        fields.groq?.apiKey ||
        fields.nanobanana?.apiKey ||
        fields.deepseek?.apiKey ||
        fields.qwen?.apiKey ||
        fields.zai?.apiKey ||
        (fields.custom?.apiKey && fields.custom?.endpoint)
      );
    } catch { return false; }
  }, [integration]);

  const handleStatusChange = (checked: boolean) => {
    startStatusTransition(async () => {
      const newStatus = checked ? 'active' : 'inactive';
      const result = await updateIntegrationStatus(AI_INTEGRATION_ID, newStatus);
      if (result.success) {
        toast({ title: 'Estado Actualizado', description: `El motor de IA ahora está ${newStatus}.` });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'Error al actualizar.' });
      }
    });
  };

  const handleSaveFields = (formData: any) => {
    startSavingTransition(async () => {
      const result = await saveIntegrationFields(AI_INTEGRATION_ID, JSON.stringify(formData));
      if (result.success) {
        toast({ title: 'Éxito', description: 'Configuración de IA guardada correctamente.' });
        setIsEditing(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error || 'No se pudo guardar la configuración.' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!integration) {
    return (
        <div className="p-4 text-center text-muted-foreground">
            No se encontró la configuración del motor de IA. Asegúrate de que las integraciones base estén inicializadas.
        </div>
    );
  }

  const isActive = integration.status === 'active';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Configuración Global del Motor de IA</CardTitle>
              <CardDescription>Gestiona el proveedor de IA y las llaves de API para todos los asistentes del sistema.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
                <CardTitle className="text-lg">Estado del Motor</CardTitle>
                <CardDescription>Habilita o deshabilita la IA en toda la plataforma.</CardDescription>
            </div>
            <Badge variant={isActive ? 'default' : 'secondary'} className="px-4 py-1 text-sm">
                {isActive ? 'Activo' : 'Inactivo'}
            </Badge>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between border p-4 rounded-xl bg-muted/30">
                <div className="space-y-0.5">
                    <Label className="text-base font-bold">Servicio Maestro de IA</Label>
                    <p className="text-xs text-muted-foreground">Define si los chatbots de WhatsApp y Menú pueden generar respuestas.</p>
                </div>
                <Switch
                    checked={isActive}
                    onCheckedChange={handleStatusChange}
                    disabled={isUpdatingStatus}
                />
            </div>

            <div className="flex items-center justify-between border p-4 rounded-xl bg-muted/30">
                <div className="space-y-0.5">
                    <Label className="text-base font-bold">Configuración de Proveedores</Label>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {isConfigured
                        ? <><CheckCircle className="h-3.5 w-3.5 text-green-500" /> Al menos un proveedor está listo</>
                        : <><XCircle className="h-3.5 w-3.5 text-destructive" /> Ningún proveedor configurado</>}
                    </div>
                </div>
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="font-bold">
                    <Settings className="mr-2 h-4 w-4" />
                    Editar Config.
                </Button>
            </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-4 text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center">
            Este motor es consumido por los módulos publicMenuChatbot y Chatbot de Soporte
        </CardFooter>
      </Card>

      <Dialog open={isEditing} onOpenChange={(open) => !isSaving && setIsEditing(open)}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Proveedores de Inteligencia Artificial</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <AIProviderForm 
                integration={integration} 
                onSave={handleSaveFields} 
                onCancel={() => setIsEditing(false)} 
                isSaving={isSaving} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}