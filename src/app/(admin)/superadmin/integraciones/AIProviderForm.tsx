'use client';

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { testApiKey } from '@/ai/flows/test-api-key-flow';
import { useToast } from '@/hooks/use-toast';
import type { Integration, AIProviderFields } from '@/models/integration';

type Provider = 'google' | 'openai' | 'groq' | 'nanobanana' | 'deepseek' | 'qwen' | 'zai' | 'custom';
type TestStatus = 'idle' | 'testing' | 'success' | 'error';
type ModalState = { isOpen: boolean; title: string; message: string };

export const AIProviderForm = ({
  integration, onSave, onCancel, isSaving,
}: {
  integration: Integration;
  onSave: (data: AIProviderFields) => void;
  onCancel: () => void;
  isSaving: boolean;
}) => {
  const { toast } = useToast();
  const PROVIDER_LABELS: Record<Provider, string> = {
    google: 'Google AI (Gemini)',
    openai: 'OpenAI (GPT)',
    groq: 'Groq (Llama/Mixtral)',
    nanobanana: 'NanoBanana (Gemini 2.5 Flash)',
    deepseek: 'DeepSeek',
    qwen: 'Qwen (Alibaba)',
    zai: 'z.ai (SaaS AI)',
    custom: 'Custom API (OpenAI Compatible)'
  };

  const [fields, setFields] = useState<AIProviderFields>(() => {
    let parsed: any = {};
    try {
      if (typeof integration.fields === 'object' && integration.fields !== null) {
        parsed = integration.fields;
      } else if (typeof integration.fields === 'string' && integration.fields.trim().startsWith('{')) {
        parsed = JSON.parse(integration.fields);
      }
    } catch (e) { console.error('AI parse error', e); }
    return {
      google: { apiKey: parsed?.google?.apiKey || '' },
      openai: { apiKey: parsed?.openai?.apiKey || '' },
      groq:   { apiKey: parsed?.groq?.apiKey   || '' },
      nanobanana: { apiKey: parsed?.nanobanana?.apiKey || '' },
      deepseek: { apiKey: parsed?.deepseek?.apiKey || '' },
      qwen: { apiKey: parsed?.qwen?.apiKey || '' },
      zai: { apiKey: parsed?.zai?.apiKey || '' },
      custom: { endpoint: parsed?.custom?.endpoint || '', apiKey: parsed?.custom?.apiKey || '' },
    };
  });

  const [testStatus, setTestStatus] = useState<Record<Provider, TestStatus>>({ 
    google: 'idle', openai: 'idle', groq: 'idle', 
    nanobanana: 'idle', deepseek: 'idle', qwen: 'idle', 
    zai: 'idle', custom: 'idle' 
  });

  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });

  const handleTestConnection = async (provider: Provider) => {
    const config = fields[provider];
    const apiKey = config?.apiKey;
    if (!apiKey) { setModalState({ isOpen: true, title: 'API Key Requerida', message: `Introduce una API Key para ${PROVIDER_LABELS[provider]}.` }); return; }
    
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
    try {
      const result = await testApiKey({ 
        provider, 
        apiKey, 
        endpoint: provider === 'custom' ? fields.custom?.endpoint : undefined 
      });
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
      <ScrollArea className="h-[60vh] pr-4">
        <div className="space-y-4">
          {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
            <Card key={p} className={fields[p]?.apiKey ? 'border-primary/30 bg-primary/5' : ''}>
              <CardHeader className="py-3"><CardTitle className="text-base">{PROVIDER_LABELS[p]}</CardTitle></CardHeader>
              <CardContent className="space-y-3 pb-4">
                {p === 'custom' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Endpoint API (OpenAI Compatible)</Label>
                    <Input 
                      placeholder="https://api.tu-servicio.com/v1/chat/completions"
                      value={fields.custom?.endpoint || ''} 
                      onChange={(e) => {
                        setFields(prev => ({ ...prev, custom: { ...prev.custom!, endpoint: e.target.value } }));
                        setTestStatus(prev => ({ ...prev, custom: 'idle' }));
                      }} 
                      disabled={isSaving} 
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">API Key</Label>
                  <Input type="password" value={fields[p]?.apiKey || ''} onChange={(e) => {
                    const val = e.target.value;
                    setFields(prev => {
                      if (p === 'custom') return { ...prev, custom: { ...prev.custom!, apiKey: val } };
                      return { ...prev, [p]: { apiKey: val } };
                    });
                    setTestStatus(prev => ({ ...prev, [p]: 'idle' }));
                  }} disabled={isSaving} />
                </div>
                <TestButton provider={p} />
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
      <DialogFooter className="border-t pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={() => onSave(fields)} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Configuración IA
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