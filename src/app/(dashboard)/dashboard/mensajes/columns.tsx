
"use client"

import { useState } from "react";
import Link from 'next/link';
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Eye, Trash2, Edit, Mail, Phone, Printer, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import type { ContactSubmission } from "@/models/contact-submission";

type ColumnsProps = {
  handleDeleteSubmission: (id: string) => Promise<void>;
};

export const columns = ({ handleDeleteSubmission }: ColumnsProps): ColumnDef<ContactSubmission>[] => {
  const ViewMessageDialog = ({ submission }: { submission: ContactSubmission }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsOpen(true); }}>
          <Eye className="mr-2 h-4 w-4" />
          Ver Mensaje
        </DropdownMenuItem>
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Detalle del Mensaje</AlertDialogTitle>
                <AlertDialogDescription>
                    Mensaje recibido de {submission.sender}.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">De:</span>
                        <span className="col-span-2">{submission.sender}</span>
                    </div>
                     <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Email:</span>
                        <a href={`mailto:${submission.email}`} className="col-span-2 text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {submission.email}
                        </a>
                    </div>
                    {submission.whatsapp && (
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold">WhatsApp:</span>
                            <a href={`https://wa.me/${submission.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="col-span-2 text-primary hover:underline flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {submission.whatsapp}
                            </a>
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                        <span className="font-semibold">Fecha:</span>
                        <span className="col-span-2">{new Date(submission.date).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <span className="text-right font-semibold mt-1">Mensaje:</span>
                        <p className="col-span-3 bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                            {submission.message}
                        </p>
                    </div>
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel>Cerrar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  const DeleteMessageItem = ({ submissionId }: { submissionId: string }) => {
    const { toast } = useToast();
    const [isConfirmOpen, setConfirmOpen] = useState(false);

    const onDelete = async () => {
        try {
            await handleDeleteSubmission(submissionId);
            toast({
                title: "Mensaje Eliminado",
                description: "El mensaje ha sido eliminado con éxito.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar el mensaje.",
            });
        }
        setConfirmOpen(false);
    }

    return (
      <>
        <DropdownMenuItem onSelect={(e) => {e.preventDefault(); setConfirmOpen(true)}} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
        </DropdownMenuItem>
        <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente el mensaje.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return [
    {
      accessorKey: "sender",
      header: "Remitente",
    },
    {
      accessorKey: "message",
      header: "Mensaje",
      cell: ({ row }) => {
        const message = row.getValue("message") as string;
        return <div className="truncate max-w-xs">{message}</div>
      }
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => {
        const date = row.getValue("date") as string;
        return <span>{new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString()}</span>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const submission = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <ViewMessageDialog submission={submission} />
                <DeleteMessageItem submissionId={submission.id} />
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ];
}
