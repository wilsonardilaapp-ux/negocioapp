'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Star, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { redeemReward } from '@/actions/loyalty';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Reward {
  id: string;
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
}

interface Props {
  businessId: string;
  rewards: Reward[];
  currentBalance: number;
  whatsapp: string;
  onRedeemed?: () => void;
}

export default function RewardsCatalog({ businessId, rewards, currentBalance, whatsapp, onRedeemed }: Props) {
  const { toast } = useToast();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [invoiceCode, setInvoiceCode] = useState('');

  const handleRedeem = async () => {
    if (!selectedReward || !invoiceCode.trim()) return;

    setIsRedeeming(true);
    try {
      const result = await redeemReward(
        businessId,
        whatsapp,
        selectedReward.id,
        invoiceCode.trim()
      );

      if (result.success) {
        toast({
          title: "¡Premio Canjeado!",
          description: `Has canjeado ${selectedReward.name}. Mostrá tu código de factura para reclamarlo.`,
        });
        setSelectedReward(null);
        setInvoiceCode('');
        if (onRedeemed) onRedeemed();
      } else {
        toast({
          variant: "destructive",
          title: "No se pudo canjear",
          description: result.error || "Ocurrió un problema durante el canje.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error de conexión con el servidor.",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => {
          const canAfford = currentBalance >= reward.pointsCost;
          
          return (
            <Card key={reward.id} className="flex flex-col overflow-hidden group">
              <CardHeader className="p-0">
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {reward.imageUrl ? (
                    <img src={reward.imageUrl} alt={reward.name} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/20">
                      <Gift className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge variant={canAfford ? "default" : "secondary"} className="font-black shadow-md">
                      {reward.pointsCost} pts
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <CardTitle className="text-base line-clamp-1">{reward.name}</CardTitle>
                <CardDescription className="text-xs mt-1 line-clamp-2 min-h-[32px]">
                  {reward.description || "Sin descripción disponible."}
                </CardDescription>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button 
                  className="w-full font-bold" 
                  disabled={!canAfford}
                  onClick={() => setSelectedReward(reward)}
                  variant={canAfford ? "default" : "outline"}
                >
                  {canAfford ? "¡Lo quiero!" : `Te faltan ${reward.pointsCost - currentBalance} pts`}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedReward} onOpenChange={(open) => !open && !isRedeeming && setSelectedReward(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Canje</DialogTitle>
            <DialogDescription>
              Vas a canjear <strong>{selectedReward?.pointsCost} puntos</strong> por:
              <span className="block mt-1 font-bold text-primary text-lg">{selectedReward?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Por seguridad, necesitás ingresar el <strong>Código de Factura</strong> de tu última compra para validar tu identidad.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice-code">Código de Factura (últimos 8 caracteres)</Label>
              <Input
                id="invoice-code"
                placeholder="Ej: A1B2C3D4"
                value={invoiceCode}
                onChange={(e) => setInvoiceCode(e.target.value.toUpperCase())}
                className="font-mono font-bold text-center text-lg tracking-widest"
                disabled={isRedeeming}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedReward(null)} disabled={isRedeeming}>Cancelar</Button>
            <Button onClick={handleRedeem} disabled={isRedeeming || !invoiceCode.trim()} className="font-bold">
              {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar Canje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
