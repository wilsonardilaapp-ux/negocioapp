'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, type Timestamp, writeBatch } from 'firebase/firestore';
import type { ContactMessage } from '@/models/notification';
import { Loader2, Inbox, Search, Mail, Phone, MessageSquare, CornerDownRight, X, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { sendAdminNotification } from '@/actions/notifications';


// Main Component
export default function InboxTab() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [filter, setFilter] = useState<'all' | 'unread' | 'replied'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [isReplyModalOpen, setReplyModalOpen] = useState(false);
    const [isReplying, setIsReplying] = useState(false);

    // NEW state for bulk selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const messagesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'contactMessages'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: messages, isLoading } = useCollection<ContactMessage>(messagesQuery);

    const filteredMessages = useMemo(() => {
        if (!messages) return [];
        return messages.filter(msg => {
            const filterMatch = 
                filter === 'all' ||
                (filter === 'unread' && !msg.read) ||
                (filter === 'replied' && msg.replied);
            
            const searchMatch = 
                !searchTerm ||
                msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                msg.subject.toLowerCase().includes(searchTerm.toLowerCase());

            return filterMatch && searchMatch;
        });
    }, [messages, filter, searchTerm]);

    const unreadCount = useMemo(() => messages?.filter(m => !m.read).length || 0, [messages]);
    
    // NEW bulk selection logic
    const selectedCount = selectedIds.length;
    const isAllSelected = selectedCount > 0 && selectedCount === filteredMessages.length;
    const isSomeSelected = selectedCount > 0 && !isAllSelected;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredMessages.map(m => m.id));
        }
    };
    
    const handleToggleSelectOne = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const chunkArray = <T,>(array: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
        }
        return chunks;
    };

    const handleDeleteSelected = async () => {
        if (!firestore || selectedCount === 0) return;
        
        setIsDeleting(true);
        let deletedCount = 0;
        try {
            const BATCH_SIZE = 500;
            const chunks = chunkArray([...selectedIds], BATCH_SIZE);

            for (const chunk of chunks) {
                const batch = writeBatch(firestore);
                chunk.forEach(id => {
                    batch.delete(doc(firestore, 'contactMessages', id));
                });
                await batch.commit();
                deletedCount += chunk.length;
            }

            toast({
                title: "Mensajes eliminados",
                description: `${deletedCount} mensajes han sido eliminados con éxito.`,
            });
            setSelectedIds([]);

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Error al eliminar",
                description: `Se eliminaron ${deletedCount} de ${selectedCount}. Error: ${error.message}`,
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSelectMessage = (msg: ContactMessage) => {
        setSelectedMessage(msg);
        if (!msg.read && firestore) {
            const msgRef = doc(firestore, 'contactMessages', msg.id);
            updateDocumentNonBlocking(msgRef, { read: true });
        }
    };
    
    const handleSendReply = async (replyBody: string) => {
        if (!selectedMessage || !firestore) return;
        setIsReplying(true);
        try {
            if (selectedMessage.source === 'client_reply' && selectedMessage.userId) {
                await sendAdminNotification({
                    recipients: [selectedMessage.userId],
                    subject: `Re: ${selectedMessage.subject}`,
                    body: replyBody,
                });
            } else {
                const replyCollectionRef = collection(firestore, `contactMessages/${selectedMessage.id}/replies`);
                await addDocumentNonBlocking(replyCollectionRef, {
                    body: replyBody,
                    sentAt: new Date().toISOString(),
                    from: 'superadmin',
                });
            }

            const msgRef = doc(firestore, 'contactMessages', selectedMessage.id);
            await updateDocumentNonBlocking(msgRef, { replied: true });

            if (selectedMessage.whatsapp && selectedMessage.whatsapp.trim() !== '') {
                const whatsappNumber = selectedMessage.whatsapp.replace(/\D/g, '');
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(replyBody)}`;
                window.open(whatsappUrl, '_blank');
                toast({ title: "Respuesta guardada y WhatsApp abierto", description: "Tu mensaje se ha preparado en WhatsApp." });
            } else {
                toast({ title: "Respuesta enviada", description: "Tu mensaje ha sido guardado en el sistema." });
            }

            setReplyModalOpen(false);
            setSelectedMessage(null);

        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error al enviar", description: error.message });
        } finally {
            setIsReplying(false);
        }
    };

    if (isLoading && !messages) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Bandeja de Entrada</CardTitle>
                    <CardDescription>Cargando mensajes...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-muted"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                            <div className="h-4 bg-muted rounded w-1/4"></div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Bandeja de Entrada</CardTitle>
                <CardDescription>Gestiona los mensajes de clientes y visitantes.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nombre, email o asunto..." 
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todos</Button>
                         <Button variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => setFilter('unread')} className="relative">
                            No Leídos
                            {unreadCount > 0 && <Badge className="absolute -top-2 -right-2">{unreadCount}</Badge>}
                         </Button>
                         <Button variant={filter === 'replied' ? 'default' : 'outline'} onClick={() => setFilter('replied')}>Respondidos</Button>
                    </div>
                </div>

                {/* NEW BULK ACTION BAR */}
                <div className="border rounded-t-md p-2 flex items-center gap-4 h-14">
                    <Checkbox
                        id="select-all-inbox"
                        checked={isAllSelected || isSomeSelected}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Seleccionar todo"
                    />
                    {selectedCount > 0 ? (
                        <>
                            <span className="text-sm text-muted-foreground">{selectedCount} seleccionado(s)</span>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                                        <Trash2 className="mr-2 h-4 w-4"/>
                                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción eliminará {selectedCount} mensaje(s) permanentemente.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting} className="bg-destructive hover:bg-destructive/80">
                                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                            Sí, eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    ) : null}
                </div>
                
                <div className="border border-t-0 rounded-b-md">
                    {filteredMessages.length > 0 ? (
                        <ScrollArea className="h-[calc(100vh-420px)]">
                          <ul className="divide-y">
                            {filteredMessages.map(msg => (
                                <li key={msg.id} data-state={selectedIds.includes(msg.id) ? 'selected' : 'unselected'} className="flex items-start gap-2 transition-colors hover:bg-muted/50 data-[state=selected]:bg-primary/5">
                                    <label htmlFor={`select-${msg.id}`} className="p-4 flex items-center cursor-pointer">
                                        <Checkbox
                                            id={`select-${msg.id}`}
                                            checked={selectedIds.includes(msg.id)}
                                            onCheckedChange={() => handleToggleSelectOne(msg.id)}
                                        />
                                    </label>
                                    <div
                                        className="flex-1 cursor-pointer py-4 pr-4"
                                        onClick={() => handleSelectMessage(msg)}
                                    >
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <p className="font-semibold truncate">{msg.name}</p>
                                              <p className="text-sm text-muted-foreground truncate">{msg.email}</p>
                                          </div>
                                           <Badge variant={msg.source === 'client_reply' ? 'default' : 'secondary'}>{msg.source === 'client_reply' ? 'Respuesta Cliente' : 'Formulario Web'}</Badge>
                                      </div>
                                      <p className="font-medium mt-1 truncate">{msg.subject}</p>
                                      <p className="text-sm text-muted-foreground truncate">{msg.body}</p>
                                      <div className="text-xs text-muted-foreground text-right mt-1 flex items-center justify-end gap-2">
                                        {!msg.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0"></div>}
                                        {msg.replied && <CornerDownRight className="h-4 w-4 text-green-600"/>}
                                        <span>{formatDistanceToNow(new Date(typeof msg.createdAt === 'string' ? msg.createdAt : (msg.createdAt as Timestamp).toDate()), { addSuffix: true, locale: es })}</span>
                                      </div>
                                    </div>
                                </li>
                            ))}
                          </ul>
                        </ScrollArea>
                    ) : (
                        <div className="text-center p-12 text-muted-foreground">
                            <Inbox className="mx-auto h-12 w-12" />
                            <p className="mt-4 font-semibold">Tu bandeja de entrada está vacía</p>
                            <p className="text-sm">No hay mensajes en la vista actual.</p>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Message Detail Dialog */}
            <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedMessage?.subject}</DialogTitle>
                        <DialogDescription>De: {selectedMessage?.name} ({selectedMessage?.email})</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {selectedMessage?.whatsapp && (
                           <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground"/>
                                <span>WhatsApp:</span>
                                <a href={`https://wa.me/${selectedMessage.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{selectedMessage.whatsapp}</a>
                           </div>
                        )}
                        <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">{selectedMessage?.body}</div>
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setSelectedMessage(null)}>Cerrar</Button>
                         <Button onClick={() => setReplyModalOpen(true)}>
                            <MessageSquare className="mr-2 h-4 w-4"/>Responder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reply Modal */}
            <Dialog open={isReplyModalOpen} onOpenChange={setReplyModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Responder a {selectedMessage?.name}</DialogTitle>
                    </DialogHeader>
                    <ReplyForm 
                        originalSubject={selectedMessage?.subject || ''} 
                        onSendReply={handleSendReply}
                        isSending={isReplying}
                    />
                </DialogContent>
            </Dialog>
        </Card>
    );
}

// Sub-component for the reply form
const ReplyForm = ({ originalSubject, onSendReply, isSending }: { originalSubject: string, onSendReply: (body: string) => void, isSending: boolean }) => {
    const [replyBody, setReplyBody] = useState('');
    return (
        <div className="space-y-4 py-4">
            <div className="space-y-1">
                <Label>Asunto</Label>
                <Input readOnly value={`Re: ${originalSubject}`} />
            </div>
            <div className="space-y-1">
                <Label htmlFor="reply-body">Mensaje</Label>
                <Textarea id="reply-body" value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={6}/>
            </div>
             <DialogFooter>
                <Button onClick={() => onSendReply(replyBody)} disabled={isSending || !replyBody.trim()}>
                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Respuesta
                </Button>
            </DialogFooter>
        </div>
    );
};
