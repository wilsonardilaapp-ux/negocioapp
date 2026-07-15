"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Star, 
  MessageSquare, 
  Bot, 
  Send, 
  XCircle, 
  CheckCircle2, 
  Loader2, 
  Mail,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/firebase";
import { generateSimpleText } from "@/ai/flows/simple-text-flow";
import { moderateReview, deleteReview } from "@/actions/reviews";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected' | 'deleted';
  whatsapp?: string;
  reply?: string;
  createdAt: any;
}

const RECOVERY_TEMPLATES = [
  {
    id: "disculpa-segunda-oportunidad",
    label: "Disculpa y segunda oportunidad",
    text: `Hola {NOMBRE_CLIENTE},

Lamentamos sinceramente la experiencia que tuviste con {NOMBRE_NEGOCIO}.

Tu opinión es muy importante para nosotros y nos gustaría tener la oportunidad de mejorar.

Si logramos resolver tu situación y quedas satisfecho con nuestra atención, te agradeceríamos compartir tu experiencia actualizada aquí:

{GOOGLE_REVIEW_URL}

Gracias por brindarnos una segunda oportunidad.`
  },
  {
    id: "recuperar-confianza",
    label: "Recuperar confianza",
    text: `Hola {NOMBRE_CLIENTE},

Gracias por compartir tu experiencia.

Sentimos no haber cumplido tus expectativas y estamos trabajando para mejorar cada día.

Nos gustaría tener una nueva oportunidad para demostrar nuestro compromiso contigo.

Si consideras que hemos solucionado tu inconveniente, puedes compartir tu experiencia aquí:

{GOOGLE_REVIEW_URL}

Muchas gracias por tu confianza.`
  },
  {
    id: "resolver-inconveniente",
    label: "Resolver inconveniente",
    text: `Hola {NOMBRE_CLIENTE},

Hemos revisado tu comentario y queremos ayudarte a solucionar lo ocurrido.

Nuestro objetivo es ofrecerte una experiencia satisfactoria y recuperar tu confianza.

Si quedas conforme con la solución brindada, puedes actualizar tu opinión aquí:

{GOOGLE_REVIEW_URL}

Gracias por permitirnos mejorar.`
  },
  {
    id: "cliente-valioso",
    label: "Cliente valioso",
    text: `Hola {NOMBRE_CLIENTE},

Valoramos enormemente tu confianza en {NOMBRE_NEGOCIO}.

Lamentamos cualquier inconveniente presentado y queremos asegurarnos de brindarte una mejor experiencia.

Si tu situación fue resuelta satisfactoriamente, puedes compartir tu opinión aquí:

{GOOGLE_REVIEW_URL}

Gracias por seguir confiando en nosotros.`
  },
  {
    id: "actualizacion-resena",
    label: "Actualización de reseña",
    text: `Hola {NOMBRE_CLIENTE},

Gracias por compartir tu comentario.

Tu opinión nos ayuda a mejorar constantemente.

Si consideras que tu experiencia ha mejorado después de nuestra atención, agradeceríamos que actualizaras tu reseña en el siguiente enlace:

{GOOGLE_REVIEW_URL}

Muchas gracias por tu apoyo.`
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
  const { user, profile } = useUser();
  const { toast } = useToast();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryTarget, setRecoveryTarget] = useState<Review | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- LÓGICA DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'cliente_admin';

  // Filtrado de seguridad: No mostrar reseñas eliminadas
  const visibleReviews = useMemo(() => {
    return reviews.filter(r => r.status !== 'deleted');
  }, [reviews]);

  // Resetear a página 1 si la cantidad total de reseñas cambia
  useEffect(() => {
    setCurrentPage(1);
  }, [visibleReviews.length]);

  const totalPages = Math.ceil(visibleReviews.length / itemsPerPage);
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return visibleReviews.slice(startIndex, startIndex + itemsPerPage);
  }, [visibleReviews, currentPage]);

  const handleRecoverClick = (review: Review) => {
    setRecoveryTarget(review);
    setGeneratedMessage("");
    setIsRecovering(true);
  };

  const applyTemplate = (templateText: string) => {
    if (!recoveryTarget) return;
    
    let processedText = templateText
      .replace(/{NOMBRE_CLIENTE}/g, recoveryTarget.name || "cliente")
      .replace(/{NOMBRE_NEGOCIO}/g, businessName || "nuestro negocio")
      .replace(/{GOOGLE_REVIEW_URL}/g, googleReviewLink || "https://g.page/r/...");
      
    setGeneratedMessage(processedText);
  };

  const handleGenerateAiMessage = async () => {
    if (!recoveryTarget) return;
    setIsGenerating(true);
    try {
      const prompt = `Actúa como el dueño del negocio ${businessName || 'nuestro restaurante'}. El cliente ${recoveryTarget.name} calificó con ${recoveryTarget.rating} estrellas y dijo: '${recoveryTarget.comment}'. Redacta un mensaje muy amable para WhatsApp, invitándolo a volver y ofreciéndole una mejor experiencia. Incluye este enlace para que actualice su reseña si queda satisfecho: ${googleReviewLink || 'TU_LINK_DE_GOOGLE'}. El mensaje debe ser corto y empático.`;
      
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
    setIsProcessing(true);
    try {
      const result = await moderateReview(businessId, reviewId, status);
      if (result.success) {
        toast({ title: `Reseña ${status === 'approved' ? 'Aprobada' : 'Rechazada'}` });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al moderar", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const result = await deleteReview(businessId, reviewId, user.uid);
      if (result.success) {
        toast({ title: "Reseña eliminada", description: "El registro ha sido removido de la vista pública." });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      {visibleReviews.length === 0 && (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">
            <MessageSquare className="h-10 w-10 mx-auto opacity-20 mb-2" />
            No hay reseñas para mostrar.
        </div>
      )}
      
      {paginatedReviews.map((review) => (
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
                  <button 
                    onClick={() => handleRecoverClick(review)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 transition-colors text-xs font-bold"
                  >
                    <Bot className="h-4 w-4" /> Recuperar Cliente
                  </button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-600 font-bold hover:bg-red-50" 
                    onClick={() => handleAction(review.id, 'rejected')}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Rechazar
                  </Button>
                </>
              )}
              {review.status === 'approved' && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold">
                    <CheckCircle2 className="h-4 w-4" /> Reseña Visible
                </div>
              )}
              
              {/* ACCIÓN DE ELIMINAR (Solo Administradores) */}
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      disabled={isProcessing}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar reseña permanentemente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción ocultará la reseña de la vista pública y de los reportes. Podrás seguir consultándola en los registros de auditoría.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDelete(review.id)}
                        className="bg-red-600 hover:bg-red-700 font-bold"
                      >
                        Eliminar Reseña
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* CONTROLES DE PÁGINACIÓN */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4 border-t mt-4">
          <div className="text-sm text-muted-foreground font-medium">
            Mostrando {paginatedReviews.length} de {visibleReviews.length} reseñas
            (Página {currentPage} de {totalPages})
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isProcessing}
              className="font-bold"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || isProcessing}
              className="font-bold"
            >
              Siguiente <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DE RECUPERACIÓN */}
      <Dialog open={isRecovering} onOpenChange={setIsRecovering}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-sky-500" /> Recuperar Cliente
            </DialogTitle>
            <DialogDescription>
              Usa una de nuestras plantillas profesionales o genera un mensaje personalizado con IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="bg-muted p-3 rounded-lg text-xs italic">
              <span className="font-bold block mb-1 uppercase text-[10px] text-muted-foreground tracking-widest">Opinión Original:</span>
              "{recoveryTarget?.comment}"
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Plantillas de Recuperación</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {RECOVERY_TEMPLATES.map((t) => (
                  <Button 
                    key={t.id} 
                    variant="outline" 
                    size="sm" 
                    className="text-[10px] h-auto py-2 px-3 text-left justify-start font-medium bg-white"
                    onClick={() => applyTemplate(t.text)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="my-2" />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Mensaje sugerido por IA</Label>
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={handleGenerateAiMessage} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Bot className="h-3 w-3 mr-1" />}
                  {isGenerating ? "Generando..." : "Generar con IA"}
                </Button>
              </div>
              <Textarea 
                value={generatedMessage} 
                onChange={(e) => setGeneratedMessage(e.target.value)}
                placeholder="Selecciona una plantilla o genera un mensaje con IA..."
                className="min-h-[180px] text-sm bg-white"
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
