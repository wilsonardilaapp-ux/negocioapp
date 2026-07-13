'use client';

import React, { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogFooter 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { moderateReview } from '@/actions/reviews';
import { 
    Star, 
    MessageSquare, 
    Check, 
    X, 
    Reply, 
    Loader2, 
    User,
    Calendar,
    MessageCircle,
    Bot,
    Smartphone,
    Mail,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import type { Review, ReviewStatus } from '@/models/review';
import { generateSimpleText } from '@/ai/flows/simple-text-flow';

interface ReviewModerationListProps {
  businessId: string;
  businessName?: string;
  googleReviewLink?: string | null;
}

export default function ReviewModerationList({ businessId, businessName, googleReviewLink }: ReviewModerationListProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // 1. Consulta de Reseñas
    const reviewsQuery = useMemoFirebase(() => 
        businessId ? query(collection(firestore, `businesses/${businessId}/reviews`), orderBy('createdAt', 'desc')) : null,
    [firestore, businessId]);

    const { data: reviews, isLoading } = useCollection<Review>(reviewsQuery);

    // Estados para Moderación y Respuesta
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [replyTarget, setReplyTarget] = useState<Review | null>(null);
    const [replyText, setReplyText] = useState('');

    // Estados para Recuperación con IA
    const [recoveryTarget, setRecoveryTarget] = useState<Review | null>(null);
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleUpdateStatus = async (reviewId: string, status: ReviewStatus) => {
        setIsActionLoading(reviewId);
        try {
            const result = await moderateReview(businessId, reviewId, status);
            if (result.success) {
                toast({ title: status === 'approved' ? "Reseña Aprobada" : "Reseña Rechazada" });
            } else {
                toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Error de conexión" });
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleSaveReply = async () => {
        if (!replyTarget || !replyText.trim()) return;
        setIsActionLoading(replyTarget.id);
        try {
            const result = await moderateReview(businessId, replyTarget.id, 'approved', replyText.trim());
            if (result.success) {
                toast({ title: "Respuesta enviada", description: "Tu respuesta ahora es pública." });
                setReplyTarget(null);
                setReplyText('');
            }
        } catch (e) {
            toast({ variant: 'destructive', title: "Error al guardar respuesta" });
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleGenerateAiMessage = async () => {
        if (!recoveryTarget) return;
        
        setIsGenerating(true);
        try {
            const prompt = `Actúa como el dueño del negocio. El cliente ${recoveryTarget.name} calificó con ${recoveryTarget.rating} estrellas y dijo: '${recoveryTarget.comment}'. Redacta un mensaje muy amable para WhatsApp, invitándolo a volver y ofreciéndole una mejor experiencia. Incluye este enlace para que actualice su reseña si queda satisfecho: ${googleReviewLink || ''}. Si el enlace no existe, omite esa parte. El mensaje debe ser corto y empático.`;
            
            const response = await generateSimpleText(prompt);
            setGeneratedMessage(response);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error de IA", description: "No se pudo generar el mensaje." });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!recoveryTarget?.whatsapp || !generatedMessage) return;
        const cleanPhone = normalizePhoneNumber(recoveryTarget.whatsapp);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(generatedMessage)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSendEmail = () => {
        if (!generatedMessage) return;
        const mailtoUrl = `mailto:?subject=Seguimiento de tu experiencia en ${businessName || 'nuestro negocio'}&body=${encodeURIComponent(generatedMessage)}`;
        window.location.href = mailtoUrl;
    };

    const getStatusBadge = (status: ReviewStatus) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-100 text-green-800 border-green-200">Aprobada</Badge>;
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
            case 'rejected': return <Badge variant="destructive">Rechazada</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                {reviews && reviews.length > 0 ? (
                    reviews.map((review) => (
                        <Card key={review.id} className={cn("transition-all border-l-4", review.status === 'pending' ? 'border-l-yellow-400' : 'border-l-transparent')}>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-4 flex-1">
                                        {/* Cabecera de la reseña */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{review.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex">
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star key={s} className={cn("h-3 w-3", s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter flex items-center gap-1">
                                                            <Calendar className="h-2.5 w-2.5" />
                                                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: es })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {getStatusBadge(review.status)}
                                        </div>

                                        {/* Contenido */}
                                        <div className="bg-muted/30 p-4 rounded-xl relative">
                                            <MessageCircle className="absolute -top-2 -left-2 h-5 w-5 text-muted-foreground/20" />
                                            <p className="text-sm text-gray-700 leading-relaxed italic">"{review.comment}"</p>
                                        </div>

                                        {/* Respuesta del negocio si existe */}
                                        {review.reply && (
                                            <div className="ml-8 p-4 bg-primary/5 border-l-2 border-primary rounded-r-xl space-y-1">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                                                    <Reply className="h-3 w-3" /> Tu Respuesta
                                                </p>
                                                <p className="text-sm text-gray-600">{review.reply}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex md:flex-col gap-2 shrink-0 justify-end md:justify-start">
                                        {review.status === 'pending' ? (
                                            <>
                                                <Button 
                                                    size="sm" 
                                                    className="bg-sky-500 hover:bg-sky-600 font-bold gap-2 text-white"
                                                    onClick={() => {
                                                        setRecoveryTarget(review);
                                                        setGeneratedMessage('');
                                                    }}
                                                    disabled={isActionLoading === review.id}
                                                >
                                                    <Bot className="h-3 w-3" />
                                                    Recuperar Cliente
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="destructive" 
                                                    className="font-bold gap-2"
                                                    onClick={() => handleUpdateStatus(review.id, 'rejected')}
                                                    disabled={isActionLoading === review.id}
                                                >
                                                    <X className="h-3 w-3" />
                                                    Rechazar
                                                </Button>
                                            </>
                                        ) : review.status === 'approved' && (
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="font-bold gap-2"
                                                onClick={() => {
                                                    setReplyTarget(review);
                                                    setReplyText(review.reply || '');
                                                }}
                                            >
                                                <Reply className="h-3 w-3" />
                                                {review.reply ? 'Editar Respuesta' : 'Responder'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-700">Sin reseñas aún</h3>
                        <p className="text-sm text-muted-foreground">Las opiniones que dejen tus clientes aparecerán aquí.</p>
                    </div>
                )}
            </div>

            {/* Modal de Respuesta Estándar */}
            <Dialog open={!!replyTarget} onOpenChange={(open) => !open && setReplyTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Responder a {replyTarget?.name}</DialogTitle>
                        <DialogDescription>Esta respuesta será visible públicamente junto al comentario del cliente.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-3 bg-muted rounded-lg text-xs italic">
                            "{replyTarget?.comment}"
                        </div>
                        <div className="space-y-2">
                            <Label>Tu mensaje</Label>
                            <Textarea 
                                placeholder="Gracias por tu visita, ¡nos alegra que te haya gustado!..." 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={5}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReplyTarget(null)} disabled={isActionLoading === replyTarget?.id}>Cancelar</Button>
                        <Button onClick={handleSaveReply} disabled={isActionLoading === replyTarget?.id || !replyText.trim()} className="font-bold">
                            {isActionLoading === replyTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Publicar Respuesta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL DE RECUPERACIÓN CON IA */}
            <Dialog open={!!recoveryTarget} onOpenChange={(open) => !open && !isGenerating && setRecoveryTarget(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-sky-500" />
                            Recuperar a {recoveryTarget?.name}
                        </DialogTitle>
                        <DialogDescription>Genera un mensaje empático para invitar al cliente a darnos una segunda oportunidad.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-6">
                        {/* Resumen de la reseña original */}
                        <div className="bg-muted/50 p-4 rounded-xl border space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} className={cn("h-3 w-3", s <= (recoveryTarget?.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Opinión Original</span>
                            </div>
                            <p className="text-sm italic text-gray-600">"{recoveryTarget?.comment}"</p>
                        </div>

                        {!googleReviewLink && (
                            <Alert className="bg-amber-50 border-amber-200">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800 font-bold">Configuración Incompleta</AlertTitle>
                                <AlertDescription className="text-amber-700 text-xs">
                                    No has configurado el link de Google Reviews. El mensaje se generará sin enlace de redirección.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="font-bold text-gray-700">Mensaje sugerido por IA</Label>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleGenerateAiMessage} 
                                    disabled={isGenerating}
                                    className="gap-2 border-sky-200 text-sky-700 hover:bg-sky-50"
                                >
                                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                                    {generatedMessage ? 'Regenerar Mensaje' : 'Generar Mensaje con IA'}
                                </Button>
                            </div>

                            {isGenerating ? (
                                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                                    <p className="text-xs text-muted-foreground animate-pulse">Redactando una respuesta perfecta...</p>
                                </div>
                            ) : (
                                <Textarea 
                                    value={generatedMessage}
                                    onChange={(e) => setGeneratedMessage(e.target.value)}
                                    placeholder="El mensaje generado aparecerá aquí..."
                                    className="min-h-[150px] bg-sky-50/20 border-sky-100 focus-visible:ring-sky-500"
                                />
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <Button 
                                onClick={handleSendWhatsApp} 
                                disabled={!generatedMessage || isGenerating || !recoveryTarget?.whatsapp}
                                className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold gap-2 h-12"
                            >
                                <Smartphone className="h-4 w-4" />
                                Enviar por WhatsApp
                            </Button>
                            <Button 
                                onClick={handleSendEmail} 
                                disabled={!generatedMessage || isGenerating}
                                variant="outline"
                                className="font-bold gap-2 h-12"
                            >
                                <Mail className="h-4 w-4" />
                                Enviar por Correo
                            </Button>
                        </div>
                    </div>

                    <DialogFooter className="bg-muted/30 p-6 -mx-6 -mb-6 border-t flex-col sm:flex-row gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setRecoveryTarget(null)}
                            disabled={isGenerating}
                            className="font-bold"
                        >
                            Cerrar sin cambios
                        </Button>
                        <Button 
                            onClick={() => {
                                if(recoveryTarget) handleUpdateStatus(recoveryTarget.id, 'approved');
                                setRecoveryTarget(null);
                            }}
                            className="bg-primary hover:bg-primary/90 font-black px-8"
                            disabled={isGenerating || !generatedMessage}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Cerrar y Marcar como Aprobada
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
