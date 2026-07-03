"use client";

import * as React from "react";
import { useState, ChangeEvent } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, X, Link2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WompiConfig } from "@/models/global-payment-config";
import { Textarea } from "@/components/ui/textarea";

interface WompiFormProps {
  data: WompiConfig;
  setData: (data: WompiConfig) => void;
}

export default function WompiForm({ data, setData }: WompiFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof WompiConfig, value: string) => {
    setData({ ...data, [field]: value });
  };
  
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Replicating current project pattern for image handling
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            setData({ ...data, qrImageUrl: imageUrl });
            setIsUploading(false);
             toast({
                title: "Imagen Subida",
                description: "La imagen del código QR de Wompi ha sido cargada.",
            });
        };
        reader.readAsDataURL(file);
    }, 1500);
  };

  const removeImage = () => {
    setData({ ...data, qrImageUrl: null });
  };

  return (
      <div className="space-y-6 pt-4 border-t">
        {/* Automatic Payment Section */}
        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-2">
            <Label htmlFor="wompi-checkout" className="flex items-center gap-2 text-primary font-bold">
                <Link2 className="h-4 w-4" />
                Link de Pago Wompi (Checkout Automático)
            </Label>
            <Input
                id="wompi-checkout"
                type="url"
                placeholder="https://checkout.wompi.co/l/..."
                value={data.checkoutUrl || ''}
                onChange={(e) => handleInputChange('checkoutUrl', e.target.value)}
                disabled={!data.enabled}
                className="bg-white border-primary/30"
            />
            <p className="text-[10px] text-muted-foreground italic">
                Si configuras este link, los clientes podrán pagar su suscripción automáticamente vía Wompi.
            </p>
        </div>

        <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-background px-2 text-muted-foreground font-bold italic text-center">O configura datos para transferencia manual</span></div>
        </div>

        {/* Manual Payment Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="wompi-holder">Nombre del Titular</Label>
            <Input
              id="wompi-holder"
              placeholder="Ej. Mi Negocio SaaS"
              value={data.holderName || ''}
              onChange={(e) => handleInputChange("holderName", e.target.value)}
              disabled={!data.enabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wompi-account">Referencia de Pago / Cuenta</Label>
            <Input
              id="wompi-account"
              placeholder="Ej. ID de Comercio Wompi"
              value={data.accountNumber || ''}
              onChange={(e) => handleInputChange("accountNumber", e.target.value)}
              disabled={!data.enabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Imagen Código QR Wompi (Opcional)</Label>
          <div className="relative">
            {data.qrImageUrl ? (
              <div className="relative group aspect-square w-full max-w-xs mx-auto">
                <Image
                  src={data.qrImageUrl}
                  alt="Código QR de Wompi"
                  fill
                  sizes="12rem"
                  className="rounded-md object-contain"
                />
                 <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeImage}
                    disabled={!data.enabled}
                >
                    <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="aspect-square w-full max-w-xs mx-auto border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:border-primary hover:bg-accent"
                onClick={() => data.enabled && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Subiendo...</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="font-semibold">Sube el código QR</p>
                    <p className="text-xs text-muted-foreground">
                      Haz clic para seleccionar la imagen de Wompi.
                    </p>
                  </>
                )}
              </div>
            )}
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                disabled={!data.enabled || isUploading}
            />
          </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="wompi-instructions">Instrucciones para el Cliente</Label>
            <Textarea
              id="wompi-instructions"
              placeholder="Ej: Escanea el QR y envía el soporte por nuestro chat interno."
              value={data.instructions || ''}
              onChange={(e) => handleInputChange("instructions", e.target.value)}
              disabled={!data.enabled}
            />
        </div>
      </div>
  );
}
