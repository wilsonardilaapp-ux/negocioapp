'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/firebase';
import { confirmReferralPayment } from '@/actions/affiliates';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { Referral } from '@/models/referral';

interface ConfirmPaymentModalProps {
  referral: Referral | null;
  isOpen: boolean;
  onClose: () => void;
  referentName: string;
  referreeName: string;
}

export default function ConfirmPaymentModal({ referral, isOpen, onClose, referentName, referreeName }: ConfirmPaymentModalProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!referral || !user) return;

    setIsSubmitting(true);
    try {
      const result = await confirmReferralPayment(referral.id, user.uid);
      
      if (result.success) {
        toast({
          title: "Pago Confirmado",
          description: result.message,
        });
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-primary h-5 w-5" />
            ¿Confirmar pago del referido?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>Al confirmar el pago, se realizarán las siguientes acciones:</p>
            <ul className="list-disc list-inside text-xs space-y-1 bg-muted p-3 rounded-lg border">
              <li>El estado de <strong>{referreeName}</strong> pasará a confirmado.</li>
              <li>Se otorgará capacidad extra a <strong>{referentName}</strong> (Referente).</li>
              <li>Se otorgará capacidad extra a <strong>{referreeName}</strong> (Nuevo cliente).</li>
              <li>Se generarán los logs de auditoría correspondientes.</li>
            </ul>
            <p className="text-sm font-bold text-destructive">Esta acción es irreversible y afecta los límites de ambos negocios.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 font-bold"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar y Otorgar Premios
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
