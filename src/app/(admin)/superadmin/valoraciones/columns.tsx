
"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, CheckCircle, XCircle, EyeOff, RefreshCcw, Reply, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DirectoryRating, RatingStatus } from "@/models/directory-rating";

interface ColumnsProps {
  onUpdateStatus: (id: string, status: RatingStatus) => Promise<void>;
  onAdminResponse: (id: string, response: string) => Promise<void>;
}

export const columns = ({ onUpdateStatus, onAdminResponse }: ColumnsProps): ColumnDef<DirectoryRating>[] => [
  {
    accessorKey: "businessName",
    header: "Negocio",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold">{row.original.businessName}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{row.original.businessId}</span>
      </div>
    ),
  },
  {
    accessorKey: "userName",
    header: "Usuario",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.userName}</span>
        <span className="text-[10px] text-muted-foreground">{row.original.userId}</span>
      </div>
    ),
  },
  {
    accessorKey: "rating",
    header: "Calificación",
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < row.original.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
            }`}
          />
        ))}
        <span className="ml-1 text-xs font-bold">{row.original.rating}</span>
      </div>
    ),
  },
  {
    accessorKey: "comment",
    header: "Comentario",
    cell: ({ row }) => <div className="max-w-[200px] truncate text-xs" title={row.original.comment}>{row.original.comment}</div>,
  },
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="text-xs">
        {format(new Date(row.original.createdAt), "dd/MM/yyyy", { locale: es })}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const status = row.original.status;
      const variants: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        published: "bg-green-100 text-green-800",
        hidden: "bg-gray-100 text-gray-800",
        rejected: "bg-red-100 text-red-800",
        reported: "bg-orange-100 text-orange-800",
      };
      return <Badge variant="outline" className={variants[status]}>{status}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const rating = row.original;
      const [isAdminReplyOpen, setAdminReplyOpen] = useState(false);
      const [adminReply, setAdminReply] = useState(rating.adminResponse || "");

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones Globales</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onUpdateStatus(rating.id, "published")}>
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Aprobar / Publicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(rating.id, "rejected")}>
                <XCircle className="mr-2 h-4 w-4 text-red-600" /> Rechazar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(rating.id, "hidden")}>
                <EyeOff className="mr-2 h-4 w-4 text-gray-600" /> Ocultar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateStatus(rating.id, "published")}>
                <RefreshCcw className="mr-2 h-4 w-4 text-blue-600" /> Restaurar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAdminReplyOpen(true)}>
                <Reply className="mr-2 h-4 w-4" /> Responder como Admin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAdminReplyOpen} onOpenChange={setAdminReplyOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Respuesta de Super Administrador</DialogTitle>
                <DialogDescription>
                  Esta respuesta será visible para el negocio y en el directorio (si está publicada).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-md text-xs italic">"{rating.comment}"</div>
                <div className="space-y-2">
                  <Label>Tu Respuesta</Label>
                  <Textarea 
                    value={adminReply} 
                    onChange={(e) => setAdminReply(e.target.value)}
                    placeholder="Escribe una respuesta administrativa..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdminReplyOpen(false)}>Cancelar</Button>
                <Button onClick={() => {
                  onAdminResponse(rating.id, adminReply);
                  setAdminReplyOpen(false);
                }}>Guardar Respuesta</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      );
    },
  },
];
