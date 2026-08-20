'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Check, 
  MessageSquare, 
  Share2, 
  Link as LinkIcon, 
  ChevronRight,
  Sparkles,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WhatsAppIcon } from '@/components/icons';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import type { BookingService } from '@/models/booking';

/**
 * @fileOverview Generador dinámico de enlaces con Deep Linking para servicios específicos.
 * Incluye parámetros de tracking (?src=) para medición de impacto.
 */

export function ShareLinksList({ businessId, services }: { businessId: string, services: BookingService[] }) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/reservar/${businessId}`;
  }, [businessId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Enlace copiado', description: '¡Listo para compartir!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareWhatsApp = (url: string, serviceName: string) => {
    const message = `¡Hola! 👋 Me gustaría invitarte a agendar una cita para *${serviceName}* directamente desde nuestro portal web: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-3 duration-500">
      {/* Enlace General */}
      <Card className="rounded-3xl border-2 border-primary/10 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-muted/20 pb-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-widest">Enlace Maestro de Reservas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input readOnly value={`${baseUrl}?src=direct_link`} className="bg-muted/30 font-mono text-xs h-12 pr-12 focus-visible:ring-0 border-none" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 bg-white rounded-lg shadow-sm border flex items-center justify-center">
                        <Check className="h-3 w-3 text-green-500" />
                    </div>
                </div>
                <Button 
                    variant={copiedId === 'master' ? 'default' : 'outline'} 
                    className="h-12 px-6 font-bold rounded-xl"
                    onClick={() => handleCopy(`${baseUrl}?src=direct_link`, 'master')}
                >
                    {copiedId === 'master' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copiedId === 'master' ? 'Copiado' : 'Copiar URL'}
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* Enlaces por Servicio */}
      <Card className="rounded-[2rem] border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl font-black tracking-tight text-gray-900">Enlaces Directos por Servicio</CardTitle>
          </div>
          <CardDescription>Envía a tus clientes directamente al servicio que necesitan para aumentar la conversión.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pt-4">
          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => {
              const trackedUrl = `${baseUrl}?service=${service.id}&src=service_link`;
              const isCopied = copiedId === service.id;

              return (
                <div key={service.id} className="group p-5 bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-primary/20 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-base leading-tight">{service.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary py-0 px-2 h-4">Deep Link Activo</Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">{service.durationMinutes} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn("h-10 px-4 font-bold rounded-xl", isCopied && "bg-green-50 border-green-200 text-green-700")}
                      onClick={() => handleCopy(trackedUrl, service.id)}
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 mr-2" />}
                      {isCopied ? 'Listo' : 'Copiar'}
                    </Button>
                    <Button 
                      size="sm" 
                      className="h-10 px-4 font-bold bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl shadow-lg shadow-green-100"
                      onClick={() => handleShareWhatsApp(trackedUrl, service.name)}
                    >
                      <WhatsAppIcon className="h-4 w-4 mr-2" />
                      Difundir
                    </Button>
                  </div>
                </div>
              );
            })}

            {services.length === 0 && (
                <div className="p-12 text-center border-2 border-dashed rounded-[2rem] text-muted-foreground italic text-sm">
                    No hay servicios activos para generar enlaces.
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
