
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
import { Loader2, UploadCloud, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BreBFormData, BreBKeyType } from "@/models/payment-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface BreBFormProps {
  data: BreBFormData;
  setData: (data: BreBFormData) => void;
}

export default function BreBForm({ data, setData }: BreBFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleInputChange = (field: keyof BreBFormData, value: string | BreBKeyType) => {
    setData({ ...data, [field]: value });
  };
  
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulate upload
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
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Configuración Bre-B</CardTitle>
                <CardDescription>
                Completa los datos para recibir pagos a través de Bre-B.
                </CardDescription>
            </div>
            <Badge variant={data.holderName && data.keyValue ? "default" : "secondary"}>
                {data.holderName && data.keyValue ? (
                    <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configurado
                    </>
                ): "Incompleto"}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="holderName">Nombre del titular / comercio</Label>
            <Input
              id="holderName"
              placeholder="Ej. Mi Tienda SAS"
              value={data.holderName}
              onChange={(e) => handleInputChange("holderName", e.target.value)}
              disabled={!data.enabled}
            />
        </div>

        <div className="flex gap-4 items-end">
            <div className="flex-none w-40">
                <Label htmlFor="keyType">Llave Bre-B</Label>
                <Select
                    value={data.keyType}
                    onValueChange={(value: BreBKeyType) => handleInputChange('keyType', value)}
                    disabled={!data.enabled}
                >
                    <SelectTrigger id="keyType">
                        <SelectValue placeholder="Tipo de llave" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Celular">Celular</SelectItem>
                        <SelectItem value="Correo">Correo</SelectItem>
                        <SelectItem value="Documento">Documento</SelectItem>
                        <SelectItem value="Alfanumerico">Alfanumérico</SelectItem>
                    </SelectContent>
                </Select>
            </div>
             <div className="flex-grow">
                <Input
                  id="keyValue"
                  placeholder="Valor de la llave"
                  value={data.keyValue}
                  onChange={(e) => handleInputChange("keyValue", e.target.value)}
                  disabled={!data.enabled}
                />
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="commerceCode">Código de Comercio Bre-B (opcional)</Label>
            <Input
              id="commerceCode"
              placeholder="Ej. 123456789"
              value={data.commerceCode}
              onChange={(e) => handleInputChange("commerceCode", e.target.value)}
              disabled={!data.enabled}
            />
        </div>

        <div className="space-y-2">
          <Label>Código QR Bre-B</Label>
          <div className="relative">
            {data.qrImageUrl ? (
              <div className="relative group aspect-square w-full max-w-xs mx-auto">
                <Image
                  src={data.qrImageUrl}
                  alt="Código QR de Bre-B"
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
                      Haz clic aquí para seleccionar una imagen.
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
        
        {/* El botón de guardar es global, no se necesita aquí */}

      </CardContent>
    </Card>
  );
}
