'use client';

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveShareCard } from "@/actions/share-cards-actions";
import type { ShareCard } from "@/models/share-card";

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  cardToEdit?: ShareCard | null;
  onSuccess: () => void;
}

const SUGGESTIONS = ["Google", "Instagram", "Facebook", "TikTok", "Volante impreso"];

export function ShareCardModal({ isOpen, onClose, businessId, cardToEdit, onSuccess }: ShareCardModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [refValue, setRefValue] = useState("");
  const [isManualRef, setIsManualRef] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (cardToEdit) {
      setName(cardToEdit.name);
      setRefValue(cardToEdit.ref);
    } else {
      setName("");
      setRefValue("");
      setIsManualRef(false);
    }
  }, [cardToEdit, isOpen]);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 30);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 30);
    setName(val);
    if (!cardToEdit && !isManualRef) {
      setRefValue(slugify(val));
    }
  };

  const handleApplySuggestion = (sug: string) => {
    setName(sug);
    setRefValue(slugify(sug));
    setIsManualRef(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast({ variant: "destructive", title: "Error", description: "El nombre debe tener mínimo 2 caracteres." });
      return;
    }
    if (!cardToEdit && refValue.trim().length < 2) {
      toast({ variant: "destructive", title: "Error", description: "El ref debe tener mínimo 2 caracteres." });
      return;
    }

    setIsSaving(true);
    const res = await saveShareCard(businessId, {
      id: cardToEdit?.id,
      name,
      ref: refValue
    });
    setIsSaving(false);

    if (res.success) {
      toast({ title: "Guardado", description: "Tarjeta configurada correctamente." });
      onSuccess();
      onClose();
    } else {
      toast({ variant: "destructive", title: "Error", description: res.error || "No se pudo guardar la tarjeta." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
            {cardToEdit ? "Editar Tarjeta de Seguimiento" : "Nueva Tarjeta de Seguimiento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {!cardToEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-semibold">Sugerencias rápidas:</Label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(sug => (
                  <Badge 
                    key={sug} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors text-xs font-medium"
                    onClick={() => handleApplySuggestion(sug)}
                  >
                    {sug}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">Nombre del Canal</Label>
            <Input 
              value={name} 
              onChange={handleNameChange} 
              placeholder="Ej. Campaña Facebook Ads" 
              maxLength={30}
              required 
            />
            <p className="text-[10px] text-muted-foreground text-right">{name.length}/30 caracteres</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider">
              Identificador (ref) {cardToEdit && "(No modificable)"}
            </Label>
            <Input 
              value={refValue} 
              disabled={!!cardToEdit}
              onChange={e => {
                setIsManualRef(true);
                setRefValue(slugify(e.target.value));
              }} 
              placeholder="ej-facebook-ads" 
              maxLength={30}
              className="font-mono text-xs"
              required 
            />
            <p className="text-[10px] text-muted-foreground">
              {cardToEdit 
                ? "El identificador no se puede alterar para no romper enlaces ya difundidos." 
                : "Solo letras minúsculas, números y guiones. Se usará en ?ref=" + (refValue || "...")}
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="font-bold">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {cardToEdit ? "Guardar Cambios" : "Crear Tarjeta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
