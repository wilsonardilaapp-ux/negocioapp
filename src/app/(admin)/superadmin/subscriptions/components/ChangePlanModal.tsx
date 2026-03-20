
"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc, Timestamp } from "firebase/firestore";
import type { ClientWithSubscription } from "../hooks/useAllSubscriptions";
import { format } from "date-fns";

const changePlanSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
  status: z.enum(["active", "canceled", "past_due", "trialing"]),
  currentPeriodEnd: z.date().nullable(),
});

type ChangePlanFormData = z.infer<typeof changePlanSchema>;

interface ChangePlanModalProps {
  client: ClientWithSubscription | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePlanModal({ client, isOpen, onClose }: ChangePlanModalProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePlanFormData>({
    resolver: zodResolver(changePlanSchema),
  });

  useEffect(() => {
    if (client) {
      reset({
        plan: client.subscription?.plan || "free",
        status: client.subscription?.status || "canceled",
        currentPeriodEnd: client.subscription?.currentPeriodEnd
          ? client.subscription.currentPeriodEnd.toDate()
          : null,
      });
    }
  }, [client, reset]);

  const onSubmit = async (data: ChangePlanFormData) => {
    if (!client || !firestore) return;

    setIsSaving(true);
    try {
      const subscriptionRef = doc(firestore, `businesses/${client.userId}/subscription`, "current");
      
      const dataToUpdate: Partial<ClientWithSubscription['subscription']> = {
        plan: data.plan,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd
          ? Timestamp.fromDate(data.currentPeriodEnd)
          : null,
        updatedAt: Timestamp.now(),
      };

      await setDocumentNonBlocking(subscriptionRef, dataToUpdate, { merge: true });

      toast({
        title: "Suscripción actualizada",
        description: `El plan de ${client.name} ha sido modificado con éxito.`,
      });
      onClose();
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: "No se pudo guardar la suscripción. Inténtalo de nuevo.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Plan de Suscripción</DialogTitle>
          <DialogDescription>
            Modifica el plan y estado para el cliente <span className="font-bold">{client.name}</span> ({client.email}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan">Nuevo Plan</Label>
              <Controller
                name="plan"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="plan">
                      <SelectValue placeholder="Selecciona un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="status">Nuevo Estado</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                      <SelectItem value="past_due">Vencido</SelectItem>
                      <SelectItem value="trialing">En prueba</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="currentPeriodEnd">Fecha de Vencimiento</Label>
            <Controller
              name="currentPeriodEnd"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Sin fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                     <div className="p-2 border-t text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => field.onChange(null)}
                        >
                            Quitar fecha
                        </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
