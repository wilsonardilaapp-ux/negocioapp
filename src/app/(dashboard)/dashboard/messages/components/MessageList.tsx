'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, Inbox } from 'lucide-react';
import type { AdminNotification } from '@/models/notification';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Timestamp } from 'firebase/firestore';

interface MessageListProps {
  notifications: AdminNotification[];
  isLoading: boolean;
}

export default function MessageList({ notifications, isLoading }: MessageListProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  const handleOpen = (notificationId: string, isRead: boolean) => {
    if (!isRead && user && firestore) {
      const notifRef = doc(firestore, `businesses/${user.uid}/notifications`, notificationId);
      updateDocumentNonBlocking(notifRef, { read: true });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center text-center gap-4 p-10 min-h-[400px]">
        <Inbox className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-xl font-semibold">Bandeja de entrada vacía</h3>
        <p className="text-muted-foreground max-w-sm">
          No tienes mensajes nuevos. Te notificaremos cuando recibas algo.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {notifications.map(notification => {
        const date = notification.createdAt && typeof notification.createdAt !== 'string' 
            ? (notification.createdAt as Timestamp).toDate() 
            : new Date(notification.createdAt as string);

        return (
          <AccordionItem key={notification.id} value={notification.id}>
            <AccordionTrigger className={`p-4 ${!notification.read ? 'font-bold' : ''}`} onClick={() => handleOpen(notification.id, notification.read)}>
              <div className="flex items-center gap-4 flex-1 truncate">
                 {!notification.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                <span className="truncate">{notification.subject}</span>
                <Badge variant={notification.type === 'payment_reminder' ? 'destructive' : 'secondary'} className="ml-auto shrink-0 capitalize">{notification.type.replace('_', ' ')}</Badge>
                <span className="text-xs text-muted-foreground shrink-0 w-28 text-right hidden sm:block">
                  {formatDistanceToNow(date, { addSuffix: true, locale: es })}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
               <div className="prose prose-sm max-w-none prose-p:text-card-foreground prose-strong:text-card-foreground prose-headings:text-card-foreground" dangerouslySetInnerHTML={{ __html: notification.body }} />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  );
}
