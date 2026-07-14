"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  MessageSquare, 
  Bot, 
  Send, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Loader2, 
  Mail,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { generateSimpleText } from "@/ai/flows/simple-text-flow";
import { moderateReview } from "@/actions/reviews";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  whatsapp?: string;
  reply?: string;
  createdAt: any;
}

// 1. Definición de Plantillas de Recuperación
const RECOVERY_TEMPLATES = [
  {
    id: 'apology',
    label: '🤝 Disculpa Directa',
    text: 'Hola {{name}}, lamentamos mucho que tu experiencia no haya sido la mejor. En {{businessName}} valoramos mucho tu opinión y nos gustaría saber más para mejorar. ¿Podrías darnos más detalles?'
  },
  {
    id: 'invite',
    label: '🚀 Invitación a Volver',
    text: 'Hola {{name}}, gracias por tu opinión. Nos encantaría que nos dieras una segunda oportunidad en {{businessName}} para demostrarte nuestro compromiso. Si quedas satisfecho, podrías actualizar tu opinión aquí: {{googleLink}}'
  },
  {
    id: 'improvement',
    label: '📝 Agradecimiento por Mejora',
    text: 'Hola {{name}}, gracias por calificarnos con {{rating}} estrellas. Tus comentarios sobre "{{comment}}" son muy importantes para nosotros en {{businessName}} y ya estamos trabajando para que tu próxima visita sea perfecta.'
  }
];

export function ReviewModerationList({ 
  reviews, 
  businessId, 
  businessName,
  googleReviewLink 
}: { 
  reviews: Review[], 
  businessId: string,
  businessName?: string,
  googleReviewLink?: string 
}) {
  const { toast } = useToast();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryTarget, setRecoveryTarget] = useState<Review | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRecoverClick = (review: Review) => {
    setRecoveryTarget(review);
    setGeneratedMessage("");
    setIsRecovering(true);
  };

  // 2. Lógica para aplicar plantillas dinámicas
  const applyTemplate = (templateId: string) => {
    if (!recoveryTarget) return;
    const template = RECOVERY_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    let text = template.text;
    text = text.replace(/{{name}}/g, recoveryTarget.name);
    text = text.replace(/{{businessName}}/g, businessName || 'nuestro negocio');
    text = text.replace(/{{rating}}/g, recoveryTarget.rating.toString());
    text = text.replace(/{{comment}}/g, recoveryTarget.comment);
    text = text.replace(/{{googleLink}}/g, googleReviewLink || '[Link de Google]');

    setGeneratedMessage(text);
    toast({ title: "Plantilla aplicada", description: "El mensaje ha sido actualizado." });
  };

  const handleGenerateAiMessage = async () => {
    if (!recoveryTarget) return;
    setIsGenerating(true);
    try {
      const prompt = `Actúa como el dueño del negocio ${businessName || 'nuestro restaurante'}. El cliente ${recoveryTarget.name} calificó con ${recoveryTarget.rating} estrellas y dijo: '${recoveryTarget.comment}'. Redacta un mensaje muy amable para WhatsApp, invitándolo a volver y ofreciéndole una mejor experiencia. Incluye este enlace para que actualice su reseña si queda satisfecho: ${googleReviewLink || 'TU_LINK_DE_GOOGLE'}. Si el enlace no existe, omite esa parte. El mensaje debe ser corto y empático.`;
      
      const response = await generateSimpleText(prompt, businessId);
      setGeneratedMessage(response);
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de IA", 
        description: error.message || "No se pudo generar el mensaje." 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendWhatsApp = () => {
    if (!recoveryTarget?.whatsapp) return;
    const phone = recoveryTarget.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generatedMessage)}`, "_blank");
  };

  const handleAction = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      const result = await moderateReview(businessId, reviewId, status);
      if (result.success) {
        toast({ title: `Reseña ${status === 'approved' ? 'Aprobada' : 'Rechazada'}` });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al moderar", description: error.message });
    }
  };

  return (
    <div className="space-y-4 py-4">
      {reviews.length === 0 && (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
            <MessageSquare className="h-10 w-10 mx-auto opacity-20 mb-2" />
            No hay reseñas para mostrar.
        </div>
      )}
      
      {reviews.map((review) => (
        <Card key={review.id} className="overflow-hidden border-gray-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{review.name}</h4>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("h-3 w-3", i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
                    ))}
                    <span className="text-[10px] text-muted-foreground ml-2 uppercase font-bold">
                      {formatDistanceToNow(review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant={review.status === 'approved' ? 'default' : review.status === 'pending' ? 'secondary' : 'destructive'}>
                {review.status === 'approved' ? 'Aprobado' : review.status === 'pending' ? 'Pendiente' : 'Rechazado'}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-700 italic mb-4">"{review.comment}"</p>

            <div className="flex gap-2 justify-end">
              {review.status === 'pending' && (
                <>
                  <Button size="sm" variant="outline" className="bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100 font-bold" onClick={() => handleRecoverClick(review)}>
                    <Bot className="h-4 w-4 mr-2" /> Recuperar Cliente
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 font-bold hover:bg-red-50" onClick={() => handleAction(review.id, 'rejected')}>
                    <XCircle className="h-4 w-4 mr-2" /> Rechazar
                  </Button>
                </>
              )}
              {review.status === 'approved' && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold">
                    <CheckCircle2 className="h-4 w-4" /> Reseña Visible
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* MODAL DE RECUPERACIÓN (IA + Plantillas) */}
      <Dialog open={isRecovering} onOpenChange={setIsRecovering}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-sky-500" /> Recuperar Cliente
            </DialogTitle>
            <DialogDescription>Elige una respuesta predefinida o deja que la IA redacte un mensaje personalizado.</DialogDescription>
          </DialogHeader>

          {!googleReviewLink && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold">Configuración Incompleta</AlertTitle>
              <AlertDescription className="text-[10px]">
                No has configurado el link de Google Reviews. Las plantillas y la IA omitirán este enlace.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 my-4">
            <div className="bg-muted p-3 rounded-lg text-xs italic">
              <span className="font-bold block mb-1 uppercase text-[10px] text-muted-foreground tracking-widest">Opinión Original:</span>
              "{recoveryTarget?.comment}"
            </div>

            {/* Selector de Plantillas */}
            <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-primary" /> Usar una Plantilla Rápida
                </Label>
                <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar una estrategia de respuesta..." />
                    </SelectTrigger>
                    <SelectContent>
                        {RECOVERY_TEMPLATES.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Separator className="my-2" />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-muted-foreground">Mensaje de Recuperación</label>
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={handleGenerateAiMessage} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
                  {isGenerating ? "Generando..." : "Generar con IA"}
                </Button>
              </div>
              <Textarea 
                value={generatedMessage} 
                onChange={(e) => setGeneratedMessage(e.target.value)}
                placeholder="Elige una plantilla arriba o pulsa 'Generar con IA' para redactar una respuesta..."
                className="min-h-[150px] text-sm bg-white"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-wrap justify-center sm:justify-between gap-3 mt-6 border-t pt-6 bg-muted/20 -mx-6 -mb-6 p-6">
            <Button className="flex-1 min-w-[140px] bg-green-500 hover:bg-green-600 font-bold" onClick={sendWhatsApp} disabled={!generatedMessage}>
              <Send className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button variant="outline" className="flex-1 min-w-[140px] font-bold" onClick={() => window.open(`mailto:?body=${encodeURIComponent(generatedMessage)}`, "_blank")} disabled={!generatedMessage}>
              <Mail className="h-4 w-4 mr-2" /> Correo
            </Button>
            <Button variant="outline" className="flex-1 min-w-[140px] font-bold" onClick={() => handleAction(recoveryTarget?.id!, 'approved').then(() => setIsRecovering(false))}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar Reseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}