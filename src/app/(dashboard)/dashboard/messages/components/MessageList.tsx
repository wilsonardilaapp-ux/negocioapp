
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, updateDocumentNonBlocking, useDoc, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, type Timestamp, writeBatch } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Loader2, Inbox, Search, Send, Trash2 } from 'lucide-react';
import type { AdminNotification, ContactMessage } from '@/models/notification';
import type { Business } from '@/models/business';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';


interface MessageListProps {
  notifications: AdminNotification[];
  isLoading: boolean;
}

export default function MessageList({ notifications, isLoading }: MessageListProps) {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'payment_reminder'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [isReplyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const businessDocRef = useMemo(() => user ? doc(firestore, 'businesses', user.uid) : null, [user, firestore]);
  const { data: business } = useDoc<Business>(businessDocRef);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const filterMatch = 
        filter === 'all' ||
        (filter === 'unread' && !n.read) ||
        (filter === 'payment_reminder' && n.type === 'payment_reminder');
      
      const searchMatch = 
        !searchTerm ||
        n.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.body.toLowerCase().includes(searchTerm.toLowerCase());
        
      return filterMatch && searchMatch;
    });
  }, [notifications, filter, searchTerm]);

  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount === filteredNotifications.length && filteredNotifications.length > 0;
  const checkboxState = isAllSelected ? true : (selectedCount > 0 ? 'indeterminate' : false);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };
  
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (!user || !firestore || selectedCount === 0) return;
    setIsDeleting(true);
    let deletedCount = 0;
    try {
        const BATCH_SIZE = 500; // Límite de Firestore
        const chunks: string[][] = [];
        for (let i = 0; i < selectedIds.length; i += BATCH_SIZE) {
            chunks.push(selectedIds.slice(i, i + BATCH_SIZE));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(firestore);
            chunk.forEach(id => {
                const docRef = doc(firestore, `businesses/${user.uid}/notifications`, id);
                batch.delete(docRef);
            });
            await batch.commit();
            deletedCount += chunk.length;
        }

        toast({
            title: "Mensajes eliminados",
            description: `${deletedCount} mensajes han sido eliminados.`,
        });
        setSelectedIds([]);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: `Se eliminaron ${deletedCount} de ${selectedCount} mensajes. Inténtalo de nuevo. Error: ${error.message}`,
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSelectNotification = (notification: AdminNotification) => {
    setSelectedNotification(notification);
    if (!notification.read && user && firestore) {
      const notifRef = doc(firestore, `businesses/${user.uid}/notifications`, notification.id);
      updateDocumentNonBlocking(notifRef, { read: true });
    }
  };

  const handleSendReply = async () => {
    if (!replyBody.trim() || !selectedNotification || !user || !profile || !firestore) return;
    setIsSending(true);
    try {
        const contactMessagesRef = collection(firestore, 'contactMessages');
        const newReply: Omit<ContactMessage, 'id'> = {
            name: profile.name || user.email!,
            email: user.email!,
            whatsapp: business?.phone || '',
            subject: `Re: ${selectedNotification.subject}`,
            body: replyBody,
            read: false,
            replied: false,
            createdAt: new Date().toISOString(),
            source: 'client_reply',
            userId: user.uid,
        };
        await addDocumentNonBlocking(contactMessagesRef, newReply);
        toast({ title: "Respuesta enviada", description: "El superadministrador ha recibido tu mensaje." });
        setReplyOpen(false);
        setReplyBody('');
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Error al enviar", description: error.message });
    } finally {
        setIsSending(false);
    }
  };
  
  const formatDate = (dateValue: Timestamp | string | undefined) => {
    if (!dateValue) return '';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : (dateValue as Timestamp).toDate();
    return date;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por asunto o contenido..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
                <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todos</Button>
                <Button variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => setFilter('unread')} className="relative">
                No Leídos
                {unreadCount > 0 && <Badge className="absolute -top-2 -right-2 h-4 w-4 justify-center p-0">{unreadCount}</Badge>}
                </Button>
                <Button variant={filter === 'payment_reminder' ? 'default' : 'outline'} onClick={() => setFilter('payment_reminder')}>Recordatorios</Button>
            </div>
        </div>
        <div className="flex items-center gap-4 mt-4 h-10">
            <div className="flex items-center gap-2">
                <Checkbox id="select-all-messages" checked={checkboxState} onCheckedChange={handleToggleSelectAll} />
                <Label htmlFor="select-all-messages" className="text-sm font-medium">Seleccionar Visibles</Label>
            </div>
            {selectedCount > 0 && (
                <div className="flex items-center gap-4 border-l pl-4">
                <span className="text-sm text-muted-foreground">{selectedCount} seleccionado(s)</span>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar seleccionados
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción eliminará permanentemente {selectedCount} mensaje(s). No se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting} className="bg-destructive hover:bg-destructive/80">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Sí, eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                </div>
            )}
        </div>
      </div>
      
      {filteredNotifications.length === 0 ? (
         <div className="flex flex-col items-center justify-center text-center gap-4 p-10 min-h-[400px]">
          <Inbox className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-semibold">Bandeja de entrada vacía</h3>
          <p className="text-muted-foreground max-w-sm">No hay mensajes en la vista actual.</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-310px)]">
            <ul className="divide-y">
                {filteredNotifications.map(notification => {
                  const isSelected = selectedIds.includes(notification.id);
                  return (
                  <li key={notification.id} data-state={isSelected ? 'selected' : 'unselected'} className="group/item flex items-start gap-2 transition-colors hover:bg-muted/50 data-[state=selected]:bg-primary/5">
                    <label htmlFor={`select-${notification.id}`} className="p-4 flex items-center cursor-pointer">
                        <Checkbox 
                            id={`select-${notification.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectOne(notification.id)}
                            className="shrink-0"
                        />
                    </label>
                    <div 
                        className="flex-1 cursor-pointer py-4 pr-4"
                        onClick={() => handleSelectNotification(notification)}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-semibold truncate">{notification.subject}</p>
                        <Badge variant={notification.type === 'payment_reminder' ? 'destructive' : 'secondary'} className="capitalize">{notification.type.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{notification.body.replace(/<[^>]*>/g, '')}</p>
                       <div className="text-xs text-muted-foreground text-right mt-1">
                        {formatDistanceToNow(formatDate(notification.createdAt), { addSuffix: true, locale: es })}
                      </div>
                    </div>
                  </li>
                )})}
              </ul>
        </ScrollArea>
      )}
      
      {/* Details Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedNotification?.subject}</DialogTitle>
            <DialogDescription>
              Enviado el {selectedNotification?.createdAt && format(formatDate(selectedNotification.createdAt), 'PPP p', { locale: es })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 prose prose-sm max-w-none prose-p:text-card-foreground prose-strong:text-card-foreground prose-headings:text-card-foreground" dangerouslySetInnerHTML={{ __html: selectedNotification?.body || ''}} />
          <DialogFooter>
             <Button variant="outline" onClick={() => setSelectedNotification(null)}>Cerrar</Button>
             <Button onClick={() => setReplyOpen(true)}>Responder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reply Dialog */}
      <Dialog open={isReplyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Responder al Administrador</DialogTitle>
            <DialogDescription>Asunto: Re: {selectedNotification?.subject}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Label htmlFor="reply-body">Tu Mensaje</Label>
            <Textarea 
              id="reply-body" 
              rows={8} 
              value={replyBody} 
              onChange={(e) => setReplyBody(e.target.value)} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendReply} disabled={isSending || !replyBody.trim()}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              <Send className="mr-2 h-4 w-4"/>
              Enviar Respuesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
