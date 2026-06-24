
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, Reply, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DirectoryRating } from '@/models/directory-rating';

interface BusinessRatingsListProps {
  ratings: DirectoryRating[];
}

export function BusinessRatingsList({ ratings }: BusinessRatingsListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<DirectoryRating | null>(null);
  const [replyText, setReplyText] = useState('');

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    published: 'bg-green-100 text-green-800',
    hidden: 'bg-gray-100 text-gray-800',
    rejected: 'bg-red-100 text-red-800',
    reported: 'bg-orange-100 text-orange-800',
  };

  const handleReply = async () => {
    if (!replyTarget || !replyText.trim() || !firestore) return;

    setIsSubmitting(true);
    try {
      const docRef = doc(firestore, 'directoryRatings', replyTarget.id);
      await updateDocumentNonBlocking(docRef, {
        businessResponse: replyText.trim(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: 'Respuesta guardada',
        description: 'Tu respuesta ha sido publicada con éxito.',
      });
      setReplyTarget(null);
      setReplyText('');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la respuesta.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (ratings.length === 0) {
    return (
      <div className="text-center py-20 border rounded-lg bg-muted/20">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
        <p className="mt-4 text-muted-foreground font-medium">Aún no tienes valoraciones en el directorio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <Card key={rating.id} className="overflow-hidden">
          <CardHeader className="pb-3 flex flex-row justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">{rating.userName}</span>
                <Badge variant="outline" className={statusColors[rating.status]}>
                  {rating.status}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < rating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-muted-foreground">
                  {format(new Date(rating.createdAt), 'PPP p', { locale: es })}
                </span>
              </div>
            </div>
            {rating.status === 'published' && !rating.businessResponse && (
              <Button size="sm" variant="outline" onClick={() => setReplyTarget(rating)}>
                <Reply className="h-4 w-4 mr-2" /> Responder
              </Button>
            )}
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-sm leading-relaxed">{rating.comment}</p>
          </CardContent>
          {rating.businessResponse && (
            <CardFooter className="bg-muted/30 pt-4 flex-col items-start gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                <Reply className="h-3 w-3" /> Respuesta del Negocio
              </div>
              <p className="text-sm italic">{rating.businessResponse}</p>
            </CardFooter>
          )}
        </Card>
      ))}

      <Dialog open={!!replyTarget} onOpenChange={(open) => !open && setReplyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder valoración</DialogTitle>
            <DialogDescription>
              Escribe una respuesta para {replyTarget?.userName}. Esta respuesta será pública en el directorio.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Agradece el comentario o aclara cualquier duda..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReplyTarget(null)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleReply} disabled={isSubmitting || !replyText.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publicar Respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
