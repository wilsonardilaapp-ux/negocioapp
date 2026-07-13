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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Plus, Trash2, Clock, Globe } from 'lucide-react';
import { testApiKey } from '@/ai/flows/test-api-key-flow';
import { useToast } from '@/hooks/use-toast';
import type { Integration, AIProviderFields, PeakHourRange } from '@/models/integration';

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
      google: { 
        apiKey: parsed?.google?.apiKey || '',
        peakHours: parsed?.google?.peakHours || [],
        timezone: parsed?.google?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.google?.avoidInPeakHours || false,
      },
      openai: { 
        apiKey: parsed?.openai?.apiKey || '',
        peakHours: parsed?.openai?.peakHours || [],
        timezone: parsed?.openai?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.openai?.avoidInPeakHours || false,
      },
      groq: { 
        apiKey: parsed?.groq?.apiKey || '',
        peakHours: parsed?.groq?.peakHours || [],
        timezone: parsed?.groq?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.groq?.avoidInPeakHours || false,
      },
      nanobanana: { 
        apiKey: parsed?.nanobanana?.apiKey || '',
        peakHours: parsed?.nanobanana?.peakHours || [],
        timezone: parsed?.nanobanana?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.nanobanana?.avoidInPeakHours || false,
      },
      deepseek: { 
        apiKey: parsed?.deepseek?.apiKey || '',
        peakHours: parsed?.deepseek?.peakHours || [],
        timezone: parsed?.deepseek?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.deepseek?.avoidInPeakHours || false,
      },
      qwen: { 
        apiKey: parsed?.qwen?.apiKey || '',
        peakHours: parsed?.qwen?.peakHours || [],
        timezone: parsed?.qwen?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.qwen?.avoidInPeakHours || false,
      },
      zai: { 
        apiKey: parsed?.zai?.apiKey || '',
        peakHours: parsed?.zai?.peakHours || [],
        timezone: parsed?.zai?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.zai?.avoidInPeakHours || false,
      },
      custom: { 
        endpoint: parsed?.custom?.endpoint || '', 
        apiKey: parsed?.custom?.apiKey || '',
        peakHours: parsed?.custom?.peakHours || [],
        timezone: parsed?.custom?.timezone || 'America/Bogota',
        avoidInPeakHours: parsed?.custom?.avoidInPeakHours || false,
      },
    };
  });

  const [testStatus, setTestStatus] = useState<Record<Provider, TestStatus>>({ 
    google: 'idle', openai: 'idle', groq: 'idle', 
    nanobanana: 'idle', deepseek: 'idle', qwen: 'idle', 
    zai: 'idle', custom: 'idle' 
  });

  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', message: '' });

  // Estado temporal para los nuevos rangos horarios que se están escribiendo
  const [tempRanges, setTempRanges] = useState<Record<Provider, { start: string, end: string }>>({
    google: { start: '09:00', end: '18:00' },
    openai: { start: '09:00', end: '18:00' },
    groq: { start: '09:00', end: '18:00' },
    nanobanana: { start: '09:00', end: '18:00' },
    deepseek: { start: '09:00', end: '18:00' },
    qwen: { start: '09:00', end: '18:00' },
    zai: { start: '09:00', end: '18:00' },
    custom: { start: '09:00', end: '18:00' },
  });

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

  const addPeakHour = (provider: Provider) => {
    const range = tempRanges[provider];
    setFields(prev => {
        const currentProviderFields = prev[provider] || {};
        const currentPeakHours = currentProviderFields.peakHours || [];
        return {
            ...prev,
            [provider]: {
                ...currentProviderFields,
                peakHours: [...currentPeakHours, range]
            }
        };
    });
  };

  const removePeakHour = (provider: Provider, index: number) => {
    setFields(prev => {
        const currentProviderFields = prev[provider] || {};
        const currentPeakHours = currentProviderFields.peakHours || [];
        return {
            ...prev,
            [provider]: {
                ...currentProviderFields,
                peakHours: currentPeakHours.filter((_, i) => i !== index)
            }
        };
    });
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
              <CardContent className="space-y-4 pb-4">
                {p === 'custom' && (
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Endpoint API (OpenAI Compatible)</Label>
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
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">API Key</Label>
                  <Input type="password" value={fields[p]?.apiKey || ''} onChange={(e) => {
                    const val = e.target.value;
                    setFields(prev => {
                      const current = prev[p] || {};
                      return { ...prev, [p]: { ...current, apiKey: val } };
                    });
                    setTestStatus(prev => ({ ...prev, [p]: 'idle' }));
                  }} disabled={isSaving} />
                </div>
                
                <div className="flex justify-between items-center">
                    <TestButton provider={p} />
                </div>

                <Separator className="my-2" />

                {/* CONFIGURACIÓN DE HORARIOS DE COSTOS */}
                <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold">Optimización de Horarios</Label>
                            <p className="text-[10px] text-muted-foreground">Define cuándo evitar este proveedor por costos.</p>
                        </div>
                        <Switch 
                            checked={fields[p]?.avoidInPeakHours || false}
                            onCheckedChange={(val) => setFields(prev => ({ ...prev, [p]: { ...prev[p]!, avoidInPeakHours: val } }))}
                            disabled={isSaving}
                        />
                    </div>

                    {fields[p]?.avoidInPeakHours && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Globe className="h-3 w-3" /> Zona Horaria de Referencia
                                </Label>
                                <Input 
                                    placeholder="America/Bogota" 
                                    className="h-8 text-xs" 
                                    value={fields[p]?.timezone || ''}
                                    onChange={(e) => setFields(prev => ({ ...prev, [p]: { ...prev[p]!, timezone: e.target.value } }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Horas Pico (Bloqueadas)
                                </Label>
                                
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {fields[p]?.peakHours?.map((range, idx) => (
                                        <Badge key={idx} variant="secondary" className="gap-1 pl-2 pr-1 h-6 text-[10px] font-mono">
                                            {range.start} - {range.end}
                                            <button 
                                                onClick={() => removePeakHour(p, idx)}
                                                className="rounded-full hover:bg-muted p-0.5"
                                            >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>

                                <div className="flex items-end gap-2 bg-muted/30 p-2 rounded-lg border">
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-bold uppercase">Inicio</Label>
                                            <Input 
                                                type="time" 
                                                className="h-7 text-[10px] px-1" 
                                                value={tempRanges[p].start}
                                                onChange={(e) => setTempRanges(prev => ({ ...prev, [p]: { ...prev[p], start: e.target.value } }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-bold uppercase">Fin</Label>
                                            <Input 
                                                type="time" 
                                                className="h-7 text-[10px] px-1" 
                                                value={tempRanges[p].end}
                                                onChange={(e) => setTempRanges(prev => ({ ...prev, [p]: { ...prev[p], end: e.target.value } }))}
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-7 w-7 shrink-0"
                                        onClick={() => addPeakHour(p)}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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