"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Trash2, Mail, Phone, CornerDownRight, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import type { ContactMessage } from "@/models/notification";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ColumnsProps = {
  handleDeleteMessage: (id: string) => Promise<void>;
  handleUpdateMessage: (id: string, data: Partial<ContactMessage>) => Promise<void>;
};

const ViewMessageDialog = ({ submission, onOpenChange, isOpen, onMarkRead }: { submission: ContactMessage, onOpenChange: (open: boolean) => void, isOpen: boolean, onMarkRead: () => void }) => {
    
    useEffect(() => {
        if(isOpen && !submission.read) {
            onMarkRead();
        }
    }, [isOpen, submission, onMarkRead]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Mensaje de: {submission.name}</DialogTitle>
                    <DialogDescription>Asunto: {submission.subject}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground"/>
                        <a href={`mailto:${submission.email}`} className="text-primary hover:underline">{submission.email}</a>
                    </div>
                     {submission.whatsapp && (
                        <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground"/>
                            <a href={`https://wa.me/${submission.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{submission.whatsapp}</a>
                        </div>
                    )}
                    <div className="p-4 bg-muted rounded-md whitespace-pre-wrap">{submission.body}</div>
                    <p className="text-xs text-muted-foreground text-right">Recibido el {format(new Date(submission.createdAt), "dd MMM, yyyy 'a las' p", { locale: es })}</p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export const columns = ({ handleDeleteMessage, handleUpdateMessage }: ColumnsProps): ColumnDef<ContactMessage>[] => {
  return [
    {
        id: "status",
        header: "",
        cell: ({ row }) => {
            const message = row.original;
            return (
                <div className="flex items-center gap-2">
                    {!message.read && <div className="h-2 w-2 rounded-full bg-primary" title="No leído"></div>}
                    {message.replied && <CornerDownRight className="h-4 w-4 text-green-500" title="Respondido"/>}
                </div>
            );
        }
    },
    {
      accessorKey: "name",
      header: "Remitente",
    },
    {
      accessorKey: "subject",
      header: "Asunto",
       cell: ({ row }) => {
        const subject = row.getValue("subject") as string;
        return <div className="truncate max-w-xs">{subject}</div>
      }
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return <span>{format(new Date(date), "dd/MM/yyyy")}</span>
      }
    },
    {
      accessorKey: "source",
      header: "Origen",
      cell: ({ row }) => {
          const source = row.getValue("source") as ContactMessage['source'];
          let variant: "default" | "secondary" | "outline" = "secondary";
          let text = "Formulario Web";

          if (source === 'client_reply') {
              variant = "default";
              text = "Respuesta de Cliente";
          } else if (source === 'client_contact') {
              variant = "outline";
              text = "Panel de Cliente";
          } else if (source === 'admin_form') {
              variant = "default"
              text = "Admin Form"
          }
          
          return <Badge variant={variant}>{text}</Badge>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const submission = row.original;
        const [isViewOpen, setViewOpen] = useState(false);

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setViewOpen(true)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Mensaje
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleUpdateMessage(submission.id, { replied: !submission.replied })}>
                     {submission.replied ? <X className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                    Marcar como {submission.replied ? 'No Respondido' : 'Respondido'}
                  </DropdownMenuItem>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>Esta acción no se puede deshacer y eliminará el mensaje permanentemente.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMessage(submission.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                   </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
            <ViewMessageDialog 
                submission={submission}
                isOpen={isViewOpen}
                onOpenChange={setViewOpen}
                onMarkRead={() => handleUpdateMessage(submission.id, { read: true })}
            />
          </>
        )
      },
    },
  ];
}
