
"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, HandCoins, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PaymentSettings, BreBKeyType } from "@/models/payment-settings";
import QRForm from "@/components/pagos/qr-form";
import BreBForm from "@/components/pagos/breb-form";
import Image from "next/image";

const initialSettings: PaymentSettings = {
  id: '',
  userId: '',
  nequi: {
    enabled: false,
    qrImageUrl: null,
    accountNumber: "",
    holderName: "",
  },
  bancolombia: {
    enabled: false,
    qrImageUrl: null,
    accountNumber: "",
    holderName: "",
  },
  daviplata: {
    enabled: false,
    qrImageUrl: null,
    accountNumber: "",
    holderName: "",
  },
  breB: {
    enabled: false,
    holderName: "",
    keyType: "Celular",
    keyValue: "",
    commerceCode: "",
    qrImageUrl: null,
  },
  pagoContraEntrega: {
    enabled: false,
  },
};

export default function PagosPage() {
  const [selectedMethod, setSelectedMethod] = useState("nequi");
  const [settings, setSettings] = useState<PaymentSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const paymentSettingsDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'paymentSettings', user.uid);
  }, [firestore, user]);

  const { data: savedSettings, isLoading } = useDoc<PaymentSettings>(paymentSettingsDocRef);

  useEffect(() => {
    if (user) {
        if (savedSettings) {
            const completeSettings = { 
                ...initialSettings, 
                ...savedSettings, 
                id: user.uid, 
                userId: user.uid,
            };
            setSettings(completeSettings);
        } else {
            setSettings(prev => ({ ...prev, id: user.uid, userId: user.uid }));
        }
    }
}, [savedSettings, user]);

  const handleEnabledChange = (method: "nequi" | "bancolombia" | "daviplata" | "breB" | "pagoContraEntrega", enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [method]: { ...prev[method], enabled },
    }));
  };

  const handleSave = () => {
    if (!paymentSettingsDocRef) return;
    setIsSaving(true);
    setDocumentNonBlocking(paymentSettingsDocRef, settings, { merge: true });
    setTimeout(() => {
        setIsSaving(false);
        toast({
            title: "Configuración Guardada",
            description: "Tus métodos de pago han sido actualizados.",
        });
    }, 1000);
  };

  if (isLoading) {
      return <div>Cargando configuración de pagos...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
            <div>
                <CardTitle>Configuración de Pagos</CardTitle>
                <CardDescription>
                Habilita y configura los métodos de pago que aceptarás.
                </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Opciones de Pago</CardTitle>
              <CardDescription>
                Selecciona un método para configurarlo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedMethod}
                onValueChange={setSelectedMethod}
                className="grid gap-4"
              >
                {/* Nequi Option */}
                <Label htmlFor="nequi" className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="nequi" id="nequi" />
                    <Image src="/iconos/nequi.png" alt="Nequi" width={24} height={24} className="object-contain" />
                    <span className="font-medium">Paga con Nequi</span>
                  </div>
                  <Switch
                    checked={settings.nequi.enabled}
                    onCheckedChange={(checked) => handleEnabledChange("nequi", checked)}
                    onClick={(e) => e.stopPropagation()} // Prevent radio change on switch click
                  />
                </Label>
                
                {/* Bancolombia Option */}
                <Label htmlFor="bancolombia" className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                   <div className="flex items-center gap-3">
                    <RadioGroupItem value="bancolombia" id="bancolombia" />
                     <Image src="/iconos/bancolombia.png" alt="Bancolombia" width={24} height={24} className="object-contain" />
                    <span className="font-medium">Paga con Bancolombia</span>
                  </div>
                  <Switch
                    checked={settings.bancolombia.enabled}
                    onCheckedChange={(checked) => handleEnabledChange("bancolombia", checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Label>

                 {/* Daviplata */}
                 <Label htmlFor="daviplata" className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                   <div className="flex items-center gap-3">
                    <RadioGroupItem value="daviplata" id="daviplata" />
                     <Image src="/iconos/daviplata.png" alt="Daviplata" width={24} height={24} className="object-contain"/>
                    <span className="font-medium">Paga con Daviplata</span>
                  </div>
                  <Switch
                    checked={settings.daviplata.enabled}
                    onCheckedChange={(checked) => handleEnabledChange("daviplata", checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Label>

                {/* Bre-B Option */}
                <Label htmlFor="breB" className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                   <div className="flex items-center gap-3">
                    <RadioGroupItem value="breB" id="breB" />
                    <Building className="h-6 w-6 text-muted-foreground" />
                    <span className="font-medium">Paga con Bre-B</span>
                  </div>
                  <Switch
                    checked={settings.breB.enabled}
                    onCheckedChange={(checked) => handleEnabledChange("breB", checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Label>
                
                {/* Pago Contra Entrega */}
                <Label htmlFor="pagoContraEntrega" className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-accent has-[[data-state=checked]]:border-primary">
                   <div className="flex items-center gap-3">
                    <RadioGroupItem value="pagoContraEntrega" id="pagoContraEntrega" />
                    <HandCoins className="h-6 w-6 text-muted-foreground" />
                    <span className="font-medium">Pago contra entrega</span>
                  </div>
                  <Switch
                    checked={settings.pagoContraEntrega.enabled}
                    onCheckedChange={(checked) => handleEnabledChange("pagoContraEntrega", checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Label>

              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
            {selectedMethod === 'nequi' && (
                <QRForm
                    methodName="Nequi"
                    data={settings.nequi}
                    setData={(formData) => setSettings(prev => ({...prev, nequi: formData}))}
                    accountLabel="Número de Teléfono"
                />
            )}
            {selectedMethod === 'bancolombia' && (
                <QRForm
                    methodName="Bancolombia"
                    data={settings.bancolombia}
                    setData={(formData) => setSettings(prev => ({...prev, bancolombia: formData}))}
                    accountLabel="Número de Cuenta"
                />
            )}
            {selectedMethod === 'daviplata' && (
                <QRForm
                    methodName="Daviplata"
                    data={settings.daviplata}
                    setData={(formData) => setSettings(prev => ({...prev, daviplata: formData}))}
                    accountLabel="Número de Teléfono"
                />
            )}
            {selectedMethod === 'breB' && (
                <BreBForm
                    data={settings.breB}
                    setData={(formData) => setSettings(prev => ({...prev, breB: formData}))}
                />
            )}
            {selectedMethod === 'pagoContraEntrega' && (
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Pago contra entrega</CardTitle>
                  <CardDescription>
                    Esta opción permite a tus clientes pagar al momento de recibir el producto. No requiere configuración adicional.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-muted/50 rounded-lg text-center">
                    <HandCoins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Al habilitar esta opción, aparecerá como un método de pago disponible para tus clientes. Podrás coordinar el pago directamente con ellos al momento de la entrega.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}
