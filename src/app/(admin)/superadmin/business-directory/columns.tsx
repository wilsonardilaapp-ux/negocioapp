
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ShieldCheck, Star, ExternalLink, MessageSquareText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BusinessDirectoryEntry } from "@/models/business-directory";
import { useState } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface ActionCellProps {
  entry: BusinessDirectoryEntry;
}

const ActionCell = ({ entry }: ActionCellProps) => {
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notes, setNotes] = useState(entry.internalNotes || "");
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdate = async (updates: Partial<BusinessDirectoryEntry>) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, "businessDirectory", entry.id);
      await updateDocumentNonBlocking(docRef, { ...updates, updatedAt: new Date().toISOString() });
      toast({ title: "Registro actualizado" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el registro." });
    }
  };

  const saveNotes = async () => {
    await handleUpdate({ internalNotes: notes });
    setIsNotesOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/negocio/${entry.id}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" /> Ver Perfil Público
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleUpdate({ isVerified: !entry.isVerified })}>
            <ShieldCheck className="mr-2 h-4 w-4" /> {entry.isVerified ? "Quitar Verificación" : "Verificar Negocio"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdate({ featured: !entry.featured })}>
            <Star className="mr-2 h-4 w-4" /> {entry.featured ? "Quitar de Destacados" : "Destacar Negocio"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsNotesOpen(true)}>
            <MessageSquareText className="mr-2 h-4 w-4" /> Notas Internas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notas Internas Administrativas</DialogTitle>
            <DialogDescription>
              Estas notas son privadas y solo visibles para el Super Admin. Úsalas para seguimiento de validación.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notes">Contenido de la nota</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe detalles sobre la verificación, incidencias, etc."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNotesOpen(false)}>Cancelar</Button>
            <Button onClick={saveNotes}>Guardar Notas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const columns: ColumnDef<BusinessDirectoryEntry>[] = [
  {
    accessorKey: "name",
    header: "Negocio",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold">{row.original.name}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{row.original.category}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      const firestore = useFirestore();
      const status = row.getValue("status") as string;
      
      const handleStatusChange = (newStatus: string) => {
        if (!firestore) return;
        const docRef = doc(firestore, "businessDirectory", row.original.id);
        updateDocumentNonBlocking(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
      };

      return (
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="hidden">Oculto</SelectItem>
          </SelectContent>
        </Select>
      );
    },
  },
  {
    accessorKey: "publicProfile",
    header: "Público",
    cell: ({ row }) => {
      const firestore = useFirestore();
      const active = !!row.getValue("publicProfile");
      
      const handleChange = (checked: boolean) => {
        if (!firestore) return;
        const docRef = doc(firestore, "businessDirectory", row.original.id);
        updateDocumentNonBlocking(docRef, { publicProfile: checked, updatedAt: new Date().toISOString() });
      };

      return (
        <div className="flex items-center gap-2">
          <Switch checked={active} onCheckedChange={handleChange} />
          <span className="text-[10px] font-bold uppercase">{active ? "ON" : "OFF"}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "badges",
    header: "Atributos",
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.isVerified && <Badge className="bg-blue-500 text-[10px] py-0 h-4">Verificado</Badge>}
        {row.original.featured && <Badge className="bg-amber-500 text-[10px] py-0 h-4">Destacado</Badge>}
      </div>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-xs">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span>{row.original.rating.toFixed(1)}</span>
        <span className="text-muted-foreground">({row.original.reviewCount})</span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell entry={row.original} />,
  },
];
