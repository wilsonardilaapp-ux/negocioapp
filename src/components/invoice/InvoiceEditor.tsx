
'use client';
import React, { useRef, useState } from 'react';
import type { InvoiceSettings } from '@/models/invoice-settings';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UploadCloud, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadMedia } from '@/ai/flows/upload-media-flow';

interface InvoiceEditorProps {
  settings: InvoiceSettings;
  setSettings: (updater: (prev: InvoiceSettings) => InvoiceSettings) => void;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ settings, setSettings }) => {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const qrCodeInputRef = useRef<HTMLInputElement>(null);

    const handleUpdate = (section: keyof InvoiceSettings, field: string, value: any) => {
        setSettings((prev) => ({
            ...prev,
            [section]: {
                ...(prev[section] as object),
                [field]: value,
            },
        }));
    };
    
    const handleBoldZoneToggle = (zone: keyof InvoiceSettings['bold']['zones']) => {
        setSettings((prev) => ({
            ...prev,
            bold: {
                ...prev.bold,
                zones: {
                    ...prev.bold.zones,
                    [zone]: !prev.bold.zones[zone],
                },
            },
        }));
    };
    
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
            toast({ variant: 'destructive', title: 'Formato inválido', description: 'Solo se permiten archivos PNG, JPG o SVG.' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            toast({ variant: 'destructive', title: 'Archivo muy grande', description: 'El tamaño máximo es de 2MB.' });
            return;
        }

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const mediaDataUri = reader.result as string;
                const result = await uploadMedia({ mediaDataUri });
                handleUpdate('logo', 'url', result.secure_url);
                toast({ title: 'Logo subido con éxito' });
            };
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al subir', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleQrImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
            toast({ variant: 'destructive', title: 'Formato inválido', description: 'Solo se permiten archivos PNG, JPG o SVG.' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            toast({ variant: 'destructive', title: 'Archivo muy grande', description: 'El tamaño máximo es de 2MB.' });
            return;
        }

        setIsUploading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const mediaDataUri = reader.result as string;
                const result = await uploadMedia({ mediaDataUri });
                handleUpdate('qr', 'qrImageUrl', result.secure_url);
                toast({ title: 'QR subido con éxito' });
            };
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error al subir', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };
  
    const boldZones: (keyof InvoiceSettings['bold']['zones'])[] = [
        'businessName', 'address', 'nit', 'invoiceNumber', 'dateTime', 'clientName', 'clientPhone', 'clientAddress',
        'paymentMethod', 'estimatedDelivery', 'items', 'total', 'subtotalFees', 'qrText', 'socialMedia', 'footer'
    ];
    
    const zoneLabels: Record<string, string> = {
        showInvoiceNumber: 'N° Factura',
        showDateTime: 'Fecha y Hora',
        showClientAddress: 'Dirección Cliente',
        showClientPhone: 'Teléfono Cliente',
        showPaymentMethod: 'Método de Pago',
        showDeliveryFee: 'Costo Domicilio',
        showPackaging: 'Costo Empaque',
        showEstimatedDelivery: 'Tiempo de Entrega',
        businessName: 'Nombre Negocio', 
        address: 'Dirección', 
        nit: 'NIT', 
        invoiceNumber: 'N° Factura', 
        dateTime: 'Fecha/Hora',
        clientName: 'Nombre Cliente', 
        clientPhone: 'Tel. Cliente', 
        clientAddress: 'Dir. Cliente', 
        paymentMethod: 'Método Pago',
        estimatedDelivery: 'Tiempo Entrega', 
        items: 'Ítems', 
        total: 'Total', 
        subtotalFees: 'Subtotal/Tasas',
        qrText: 'Texto QR', 
        socialMedia: 'Redes Sociales', 
        footer: 'Pie de Factura'
    };

    return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Editor de Configuración de Factura</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger className="text-foreground">1. Encabezado</AccordionTrigger>
                <AccordionContent className="space-y-4 p-2">
                    <div className="space-y-1"><Label className="text-foreground">Nombre del Negocio</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.header.businessName} onChange={(e) => handleUpdate('header', 'businessName', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-foreground">Dirección</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.header.address} onChange={(e) => handleUpdate('header', 'address', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-foreground">Teléfono</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.header.phone} onChange={(e) => handleUpdate('header', 'phone', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-foreground">NIT/RUT</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.header.nit} onChange={(e) => handleUpdate('header', 'nit', e.target.value)} /></div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
                <AccordionTrigger className="text-foreground">2. Logo</AccordionTrigger>
                <AccordionContent className="space-y-4 p-2">
                    <div className="border p-4 rounded-md">
                        {settings.logo.url && <img src={settings.logo.url} alt="logo preview" className="mx-auto h-16 object-contain mb-4" />}
                        <Button variant="outline" className="w-full" onClick={() => logoInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            {settings.logo.url ? 'Cambiar Logo' : 'Subir Logo'}
                        </Button>
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png, image/jpeg, image/svg+xml" />
                        {settings.logo.url && <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => handleUpdate('logo', 'url', null)}><Trash2 className="mr-2 h-4 w-4" />Quitar Logo</Button>}
                    </div>
                    <Label className="text-foreground">Tamaño del logo</Label><Select onValueChange={(val) => handleUpdate('logo', 'size', val)} value={settings.logo.size}><SelectTrigger><SelectValue placeholder="Tamaño del logo" /></SelectTrigger><SelectContent><SelectItem value="40px">Pequeño</SelectItem><SelectItem value="60px">Mediano</SelectItem><SelectItem value="80px">Grande</SelectItem></SelectContent></Select>
                    <Label className="text-foreground">Posición del logo</Label><Select onValueChange={(val) => handleUpdate('logo', 'position', val)} value={settings.logo.position}><SelectTrigger><SelectValue placeholder="Posición del logo" /></SelectTrigger><SelectContent><SelectItem value="left">Izquierda</SelectItem><SelectItem value="center">Centro</SelectItem><SelectItem value="right">Derecha</SelectItem></SelectContent></Select>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
                <AccordionTrigger className="text-foreground">3. Código QR</AccordionTrigger>
                <AccordionContent className="space-y-4 p-2">
                     <div className="flex items-center space-x-2"><Switch id="qr-show" checked={settings.qr.show} onCheckedChange={(val) => handleUpdate('qr', 'show', val)} /><Label className="text-foreground" htmlFor="qr-show">Mostrar QR</Label></div>

                     <div className="border p-4 rounded-md space-y-2">
                        <Label className="text-foreground">Imagen de QR (opcional)</Label>
                        <p className="text-xs text-muted-foreground">Sube una imagen si quieres usar un QR personalizado en lugar del generado automáticamente.</p>
                        {settings.qr.qrImageUrl && <img src={settings.qr.qrImageUrl} alt="qr preview" className="mx-auto h-24 w-24 object-contain mb-4 bg-white p-1 rounded-md" />}
                        <Button variant="outline" className="w-full" onClick={() => qrCodeInputRef.current?.click()} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            {settings.qr.qrImageUrl ? 'Cambiar Imagen QR' : 'Subir Imagen QR'}
                        </Button>
                        <input type="file" ref={qrCodeInputRef} onChange={handleQrImageUpload} className="hidden" accept="image/png, image/jpeg, image/svg+xml" />
                        {settings.qr.qrImageUrl && <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => handleUpdate('qr', 'qrImageUrl', null)}><Trash2 className="mr-2 h-4 w-4" />Quitar Imagen</Button>}
                    </div>

                     <Label className="text-foreground">Enlazar a</Label><Select onValueChange={(val) => handleUpdate('qr', 'linkType', val)} value={settings.qr.linkType}><SelectTrigger><SelectValue placeholder="Enlazar a..." /></SelectTrigger><SelectContent><SelectItem value="menu">Menú Digital</SelectItem><SelectItem value="review">Reseña Google</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="custom">Link Personalizado</SelectItem></SelectContent></Select>
                    <div className="space-y-1"><Label className="text-foreground">URL del QR (si no subes imagen)</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.qr.url} onChange={(e) => handleUpdate('qr', 'url', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-foreground">Texto bajo el QR</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.qr.labelText} onChange={(e) => handleUpdate('qr', 'labelText', e.target.value)} /></div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
                <AccordionTrigger className="text-foreground">4. Redes Sociales</AccordionTrigger>
                <AccordionContent className="space-y-4 p-2">
                     <div className="flex items-center space-x-2"><Switch id="social-show" checked={settings.socialMedia.show} onCheckedChange={(val) => handleUpdate('socialMedia', 'show', val)} /><Label className="text-foreground" htmlFor="social-show">Mostrar Redes</Label></div>
                    <div className="space-y-1"><Label className="text-foreground">Instagram (usuario)</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.socialMedia.instagram} onChange={(e) => handleUpdate('socialMedia', 'instagram', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-foreground">Facebook (usuario)</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.socialMedia.facebook} onChange={(e) => handleUpdate('socialMedia', 'facebook', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-foreground">WhatsApp (número)</Label><Input className="placeholder:text-muted-foreground text-foreground" value={settings.socialMedia.whatsapp} onChange={(e) => handleUpdate('socialMedia', 'whatsapp', e.target.value)} /></div>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
                <AccordionTrigger className="text-foreground">5. Campos Visibles</AccordionTrigger>
                <AccordionContent className="grid grid-cols-2 gap-4 p-2">
                    {Object.keys(settings.fields).map((key) => (
                        <div key={key} className="flex items-center space-x-2">
                            <Switch id={`field-${key}`} checked={settings.fields[key as keyof typeof settings.fields]} onCheckedChange={(val) => handleUpdate('fields', key, val)} />
                            <Label className="text-foreground" htmlFor={`field-${key}`}>{zoneLabels[key as keyof typeof zoneLabels]}</Label>
                        </div>
                    ))}
                </AccordionContent>
            </AccordionItem>
            
             <AccordionItem value="item-6">
                <AccordionTrigger className="text-foreground">6. Estilo de Negrita</AccordionTrigger>
                <AccordionContent className="space-y-4 p-2">
                    <div className="flex items-center space-x-2">
                        <Switch id="bold-all" checked={settings.bold.allBold} onCheckedChange={(val) => handleUpdate('bold', 'allBold', val)} />
                        <Label className="text-foreground" htmlFor="bold-all">Toda la factura en negrita</Label>
                    </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {boldZones.map(zone => (
                           <Button key={zone} variant={settings.bold.zones[zone] ? 'secondary' : 'outline'} size="sm" onClick={() => handleBoldZoneToggle(zone)}>
                               {zoneLabels[zone]}
                           </Button>
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
                <AccordionTrigger className="text-foreground">7. Estilo de Papel y Fuente</AccordionTrigger>
                 <AccordionContent className="space-y-4 p-2">
                    <Label className="text-foreground">Tamaño Papel</Label><Select onValueChange={(val) => handleUpdate('style', 'paperSize', val)} value={settings.style.paperSize}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="58mm">58mm</SelectItem><SelectItem value="80mm">80mm</SelectItem><SelectItem value="A4">A4</SelectItem></SelectContent></Select>
                    <Label className="text-foreground">Fuente</Label><Select onValueChange={(val) => handleUpdate('style', 'font', val)} value={settings.style.font}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monospace">Courier (Monospace)</SelectItem><SelectItem value="arial">Arial</SelectItem><SelectItem value="sans-serif">Sans-serif</SelectItem></SelectContent></Select>
                    <Label className="text-foreground">Tamaño Texto</Label><Select onValueChange={(val) => handleUpdate('style', 'fontSize', val)} value={settings.style.fontSize}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="9px">9px</SelectItem><SelectItem value="10px">10px</SelectItem><SelectItem value="11px">11px</SelectItem><SelectItem value="12px">12px</SelectItem></SelectContent></Select>
                    <Label className="text-foreground">Separadores</Label><Select onValueChange={(val) => handleUpdate('style', 'separatorStyle', val)} value={settings.style.separatorStyle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dashed">Guiones</SelectItem><SelectItem value="solid">Línea Sólida</SelectItem><SelectItem value="none">Sin Separador</SelectItem></SelectContent></Select>
                    <div className="space-y-2 pt-2">
                      <Label className="text-foreground">
                        Escala del Texto ({Math.round(
                          (settings.style.textScale ?? 1) * 100
                        )}%)
                      </Label>
                      <input
                        type="range"
                        min="70"
                        max="130"
                        step="5"
                        value={Math.round(
                          (settings.style.textScale ?? 1) * 100
                        )}
                        onChange={(e) => handleUpdate(
                          'style',
                          'textScale',
                          parseInt(e.target.value) / 100
                        )}
                        className="w-full accent-green-600"
                      />
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdate('style','textScale',0.8)}
                        >
                          Angosto
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdate('style','textScale',1.0)}
                        >
                          Normal
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUpdate('style','textScale',1.2)}
                        >
                          Ancho
                        </Button>
                      </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-8">
                <AccordionTrigger className="text-foreground">8. Promoción</AccordionTrigger>
                 <AccordionContent className="space-y-4 p-2">
                     <div className="flex items-center space-x-2"><Switch id="promo-show" checked={settings.promo.show} onCheckedChange={(val) => handleUpdate('promo', 'show', val)} /><Label className="text-foreground" htmlFor="promo-show">Mostrar Promoción</Label></div>
                     <Label className="text-foreground">Texto de la promoción</Label><Textarea className="placeholder:text-muted-foreground text-foreground" value={settings.promo.text} onChange={(e) => handleUpdate('promo', 'text', e.target.value)} />
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-9">
                <AccordionTrigger className="text-foreground">9. Pie de Factura</AccordionTrigger>
                <AccordionContent className="space-y-4 p-2">
                    <Label className="text-foreground">Mensaje de agradecimiento</Label><Textarea className="placeholder:text-muted-foreground text-foreground" value={settings.footer.message} onChange={(e) => handleUpdate('footer', 'message', e.target.value)} />
                    <div className="flex items-center space-x-2"><Switch id="footer-repeat" checked={settings.footer.repeatBusinessName} onCheckedChange={(val) => handleUpdate('footer', 'repeatBusinessName', val)} /><Label className="text-foreground" htmlFor="footer-repeat">Repetir nombre del negocio</Label></div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-10">
              <AccordionTrigger className="text-foreground">
                10. Código de Barras
              </AccordionTrigger>
              <AccordionContent className="space-y-4 p-2">
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="barcode-show"
                    checked={settings.barcode?.show ?? false}
                    onCheckedChange={(val) =>
                      handleUpdate('barcode', 'show', val)}
                  />
                  <Label className="text-foreground" 
                    htmlFor="barcode-show">
                    Mostrar Código de Barras
                  </Label>
                </div>

                <div className="space-y-1">
                  <Label className="text-foreground">
                    Valor del Código
                  </Label>
                  <Input
                    className="placeholder:text-muted-foreground 
                      text-foreground"
                    placeholder="Ej: 7501234567890"
                    value={settings.barcode?.value ?? ''}
                    onChange={(e) =>
                      handleUpdate('barcode', 'value', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingresa el número a representar en el código de barras
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="barcode-display"
                    checked={settings.barcode?.displayValue ?? true}
                    onCheckedChange={(val) =>
                      handleUpdate('barcode', 'displayValue', val)}
                  />
                  <Label className="text-foreground" 
                    htmlFor="barcode-display">
                    Mostrar número bajo el código
                  </Label>
                </div>

                <div className="space-y-1">
                  <Label className="text-foreground">Posición</Label>
                  <Select
                    onValueChange={(val) =>
                      handleUpdate('barcode', 'position', val)}
                    value={settings.barcode?.position ?? 'footer'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Posición" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">
                        Encabezado (tras NIT)
                      </SelectItem>
                      <SelectItem value="footer">
                        Pie de factura (tras QR)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </AccordionContent>
            </AccordionItem>

        </Accordion>
      </CardContent>
    </Card>
  );
};
