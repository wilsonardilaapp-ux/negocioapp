
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ExternalLink, MessageSquareText, ShieldCheck, Ban, EyeOff, Eye } from "lucide-react";
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
import type { Business, DirectoryStatus } from "@/models/business";
import { useState } from "react";
import { useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ActionCellProps {
  business: Business;
}

const ActionCell = ({ business }: ActionCellProps) => {
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notes, setNotes] = useState(business.internalNotes || "");
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdate = async (updates: Partial<Business>) => {
    if (!firestore) return;
    try {
      const docRef = doc(firestore, "businesses", business.id);
      await updateDocumentNonBlocking(docRef, updates);
      toast({ title: "Negocio actualizado" });
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
            <Link href={`/negocio/${business.id}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" /> Ver Perfil Público
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleUpdate({ directoryStatus: 'approved' })}>
            <ShieldCheck className="mr-2 h-4 w-4 text-green-500" /> Aprobar para Directorio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdate({ directoryStatus: 'suspended' })}>
            <Ban className="mr-2 h-4 w-4 text-destructive" /> Suspender en Directorio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpdate({ directoryStatus: 'hidden' })}>
            <EyeOff className="mr-2 h-4 w-4 text-muted-foreground" /> Ocultar de Listas
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
              Estas notas son privadas y solo visibles para el Super Admin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="notes">Contenido de la nota</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Seguimiento de validación..."
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

export const columns: ColumnDef<Business>[] = [
  {
    accessorKey: "name",
    header: "Negocio",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-bold">{row.original.name}</span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
          {row.original.category || 'Sin Categoría'}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "directoryStatus",
    header: "Estatus Directorio",
    cell: ({ row }) => {
      const firestore = useFirestore();
      const status = (row.getValue("directoryStatus") as DirectoryStatus) || 'approved';
      
      const handleStatusChange = (newStatus: DirectoryStatus) => {
        if (!firestore) return;
        const docRef = doc(firestore, "businesses", row.original.id);
        updateDocumentNonBlocking(docRef, { directoryStatus: newStatus });
      };

      return (
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className={cn(
            "w-[130px] h-8 text-[10px] font-black uppercase tracking-wider",
            status === 'approved' ? "border-green-200 text-green-700 bg-green-50" : 
            status === 'suspended' ? "border-red-200 text-red-700 bg-red-50" :
            "border-muted text-muted-foreground"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="approved" className="text-[10px] font-bold">Aprobado</SelectItem>
            <SelectItem value="suspended" className="text-[10px] font-bold">Suspendido</SelectItem>
            <SelectItem value="hidden" className="text-[10px] font-bold">Oculto</SelectItem>
          </SelectContent>
        </Select>
      );
    },
  },
  {
    accessorKey: "directoryEnabled",
    header: "Visible",
    cell: ({ row }) => {
      const firestore = useFirestore();
      const active = !!row.getValue("directoryEnabled");
      
      const handleChange = (checked: boolean) => {
        if (!firestore) return;
        const docRef = doc(firestore, "businesses", row.original.id);
        updateDocumentNonBlocking(docRef, { directoryEnabled: checked });
      };

      return (
        <div className="flex items-center gap-2">
          <Switch 
            checked={active} 
            onCheckedChange={handleChange} 
            className="data-[state=checked]:bg-green-500"
          />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            active ? "text-green-600" : "text-muted-foreground"
          )}>
            {active ? "ON" : "OFF"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-xs font-bold">
        <span>{(row.original.rating || 5).toFixed(1)}</span>
        <span className="text-[10px] text-muted-foreground font-normal">({row.original.reviewCount || 0})</span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell business={row.original} />,
  },
];
