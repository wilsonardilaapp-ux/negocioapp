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
import { Loader2, UploadCloud, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { QRFormData } from "@/models/payment-settings";

interface QRFormProps {
  methodName: string;
  data: QRFormData;
  setData: (data: QRFormData) => void;
  accountLabel: string;
}

export function QRForm({ methodName, data, setData, accountLabel }: QRFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof QRFormData, value: string) => {
    setData({ ...data, [field]: value });
  };
  
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Simulate an upload process
    // In a real app, you would upload to a service like Cloudinary or Firebase Storage
    // and get a URL back.
    setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target?.result as string;
            setData({ ...data, qrImageUrl: imageUrl });
            setIsUploading(false);
             toast({
                title: "Imagen Subida",
                description: "La imagen del código QR ha sido cargada.",
            });
        };
        reader.readAsDataURL(file);
    }, 1500);
  };

  const removeImage = () => {
    setData({ ...data, qrImageUrl: null });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de {methodName}</CardTitle>
        <CardDescription>
          Completa los datos para recibir pagos a través de {methodName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="holderName">Nombre del Titular</Label>
            <Input
              id="holderName"
              placeholder="Ej. Juan Pérez"
              value={data.holderName}
              onChange={(e) => handleInputChange("holderName", e.target.value)}
              disabled={!data.enabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">{accountLabel}</Label>
            <Input
              id="accountNumber"
              placeholder="Ej. 3001234567"
              value={data.accountNumber}
              onChange={(e) => handleInputChange("accountNumber", e.target.value)}
              disabled={!data.enabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Código QR</Label>
          <div className="relative">
            {data.qrImageUrl ? (
              <div className="relative group aspect-square w-full max-w-xs mx-auto">
                <Image
                  src={data.qrImageUrl}
                  alt={`Código QR de ${methodName}`}
                  layout="fill"
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
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Subiendo...</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="font-semibold">Sube una imagen</p>
                    <p className="text-xs text-muted-foreground">
                      Haz clic aquí o arrastra tu archivo.
                    </p>
                  </>
                )}
              </div>
            )}
             <Input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                disabled={!data.enabled || isUploading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
