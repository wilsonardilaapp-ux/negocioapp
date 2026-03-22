
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  QrCode,
  Link2,
  Share2,
  Download,
  Copy,
  Facebook,
  Twitter,
  Check,
  Eye,
  Settings,
  Palette,
  Image as ImageIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { MenuShare, QRConfig } from '@/models/share';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import QRCode from "react-qr-code";
import { toPng, toSvg } from 'html-to-image';
import { WhatsAppIcon } from '@/components/icons';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import NextImage from 'next/image';

const defaultShareConfig: Omit<MenuShare, 'id' | 'businessId' | 'createdAt' | 'updatedAt'> = {
  slug: '',
  useCustomSlug: false,
  socialPreviewImageUrl: null,
  socialShareMessage: '¡Hola! Te invito a ver nuestro menú digital ✨',
  qrConfig: {
    size: 256,
    backgroundColor: "#ffffff",
    foregroundColor: "#000000",
    errorCorrectionLevel: 'L',
    style: 'squares',
    logoSize: 0.2,
    frameEnabled: false,
    frameText: 'Escanea',
    frameColor: '#000000',
  },
  totalViews: 0,
  totalScans: 0,
  totalShares: 0,
  isActive: true,
};

const QRCodeCustomizer = ({ config, setConfig }: { config: QRConfig, setConfig: (newConfig: QRConfig) => void }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Personalizar QR</CardTitle>
                <CardDescription>Ajusta la apariencia de tu código QR.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="qr-fg-color">Color Principal</Label>
                        <Input id="qr-fg-color" type="color" value={config.foregroundColor} onChange={(e) => setConfig({ ...config, foregroundColor: e.target.value })} />
                    </div>
                    <div>
                        <Label htmlFor="qr-bg-color">Color de Fondo</Label>
                        <Input id="qr-bg-color" type="color" value={config.backgroundColor} onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })} />
                    </div>
                </div>
                 <div>
                    <Label>Nivel de Corrección</Label>
                     <Select onValueChange={(v: 'L'|'M'|'Q'|'H') => setConfig({...config, errorCorrectionLevel: v})} defaultValue={config.errorCorrectionLevel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="L">Bajo (L)</SelectItem>
                            <SelectItem value="M">Medio (M)</SelectItem>
                            <SelectItem value="Q">Alto (Q)</SelectItem>
                            <SelectItem value="H">Máximo (H)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div>
                    <Label>Tamaño del logo ({Math.round((config.logoSize || 0.2) * 100)}%)</Label>
                    <Slider
                        min={0.1}
                        max={0.3}
                        step={0.05}
                        defaultValue={[config.logoSize || 0.2]}
                        onValueChange={(v) => setConfig({...config, logoSize: v[0]})}
                    />
                </div>
                <div>
                    <Label htmlFor="logo-url">URL del Logo (opcional)</Label>
                    <Input id="logo-url" placeholder="https://..." value={config.logoUrl || ''} onChange={e => setConfig({...config, logoUrl: e.target.value})} />
                </div>
            </CardContent>
        </Card>
    );
};

const SocialPreviewImageUploader = ({ imageUrl, onUpload, onRemove }: {
    imageUrl: string | null | undefined;
    onUpload: (file: File) => void;
    onRemove: () => void;
}) => {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({
                variant: "destructive",
                title: "Archivo muy grande",
                description: "El tamaño máximo es de 5MB.",
            });
            return;
        }

        setIsUploading(true);
        await onUpload(file);
        setIsUploading(false);
    };

    return (
        <div className="space-y-2">
            <Label>Imagen de vista previa (1200x630 recomendado)</Label>
            <div className="relative w-full border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 group aspect-[1200/630]">
                {isUploading ? (
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : imageUrl ? (
                    <>
                        <NextImage src={imageUrl} alt="Vista previa" layout="fill" className="object-contain rounded-md" />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                    </>
                ) : (
                    <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm font-semibold">Click para subir imagen</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG (máx. 5MB)</p>
                    </div>
                )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png,image/jpeg" />
        </div>
    );
};


export default function SharePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [shareConfig, setShareConfig] = useState<MenuShare | null>(null);
  const [copied, setCopied] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const shareConfigRef = useMemoFirebase(() => 
    user ? doc(firestore, `businesses/${user.uid}/shareConfig`, 'main') : null,
    [user, firestore]
  );
  
  const { data: savedShareConfig, isLoading } = useDoc<MenuShare>(shareConfigRef);
  
  useEffect(() => {
    if (savedShareConfig) {
        const mergedConfig = { ...defaultShareConfig, ...savedShareConfig };
        setShareConfig(mergedConfig);
    } else if (user && !isLoading) {
      // Create a default config if one doesn't exist
      const newConfig: MenuShare = {
        ...defaultShareConfig,
        id: 'main',
        businessId: user.uid,
        slug: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setShareConfig(newConfig);
      if (shareConfigRef) {
        setDocumentNonBlocking(shareConfigRef, newConfig);
      }
    }
  }, [savedShareConfig, isLoading, user, shareConfigRef]);

  const handleConfigSave = (newConfig: Partial<MenuShare>) => {
    if (!shareConfig || !shareConfigRef) return;
    const updatedConfig = { ...shareConfig, ...newConfig, updatedAt: new Date().toISOString() };
    setShareConfig(updatedConfig);
    setDocumentNonBlocking(shareConfigRef, updatedConfig, { merge: true });
    toast({ title: 'Configuración guardada' });
  };
  
  const handleQRConfigChange = (newQRConfig: QRConfig) => {
    if (!shareConfig) return;
    const updatedConfig = { ...shareConfig, qrConfig: newQRConfig, updatedAt: new Date().toISOString() };
    setShareConfig(updatedConfig);
    if(shareConfigRef) {
        setDocumentNonBlocking(shareConfigRef, { qrConfig: newQRConfig, updatedAt: new Date().toISOString() }, { merge: true });
    }
  };

  const getCatalogUrl = () => {
    if (typeof window !== 'undefined' && shareConfig?.slug) {
      const slug = shareConfig.useCustomSlug ? shareConfig.slug : user?.uid;
      return `${window.location.origin}/catalog/${slug}`;
    }
    return '';
  };

  const menuUrl = getCatalogUrl();

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast({ title: 'Enlace copiado' });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const downloadQR = async (format: 'png' | 'svg') => {
    if (!qrCodeRef.current) return;
    
    let dataUrl;
    try {
        if(format === 'png') {
            dataUrl = await toPng(qrCodeRef.current, { cacheBust: true });
        } else {
            dataUrl = await toSvg(qrCodeRef.current, { cacheBust: true });
        }
        const link = document.createElement('a');
        link.download = `qr-catalogo.${format}`;
        link.href = dataUrl;
        link.click();
    } catch(e) {
        toast({variant: 'destructive', title: 'Error al descargar', description: 'No se pudo generar el archivo.'});
    }
  };

    const handleSocialImageUpload = async (file: File) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const mediaDataUri = reader.result as string;
            try {
                const result = await uploadMedia({ mediaDataUri });
                handleConfigSave({ socialPreviewImageUrl: result.secure_url });
            } catch (error: any) {
                toast({ variant: 'destructive', title: "Error al subir", description: error.message });
            }
        };
    };
    
    const handleShareSocialWhatsApp = () => {
        const text = encodeURIComponent(shareConfig?.socialShareMessage || `¡Mira nuestro menú digital! ${menuUrl}`);
        const whatsappUrl = `https://wa.me/?text=${text}`;
        window.open(whatsappUrl, '_blank');
    };
  
  const handleShare = (platform: 'facebook' | 'twitter' | 'whatsapp') => {
    let url = '';
    const text = encodeURIComponent(`¡Mira nuestro catálogo de productos!: ${menuUrl}`);
    switch(platform) {
        case 'facebook':
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(menuUrl)}`;
            break;
        case 'twitter':
             url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(menuUrl)}&text=${encodeURIComponent('¡Mira nuestro catálogo de productos!')}`;
            break;
        case 'whatsapp':
            url = `https://api.whatsapp.com/send?text=${text}`;
            break;
    }
    window.open(url, '_blank');
  };

  if (isLoading || !shareConfig) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const { qrConfig } = shareConfig;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compartir Menú</CardTitle>
          <CardDescription>Facilita a tus clientes el acceso a tu catálogo de productos.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> URL Personalizada</CardTitle>
            <CardDescription>Crea un enlace corto y memorable para tu menú.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                    <Label htmlFor="custom-slug-switch">Usar alias personalizado</Label>
                    <p className="text-sm text-muted-foreground">Activa para crear una URL corta para tu menú</p>
                </div>
                <Switch
                    id="custom-slug-switch"
                    checked={shareConfig.useCustomSlug}
                    onCheckedChange={(checked) => {
                        const newSlug = checked ? (shareConfig.slug === user?.uid ? '' : shareConfig.slug) : user?.uid;
                        handleConfigSave({ useCustomSlug: checked, slug: newSlug || user?.uid });
                    }}
                />
            </div>
            {shareConfig.useCustomSlug && (
                <div className="mt-4">
                    <Label htmlFor="slug-input">Tu alias</Label>
                    <div className="flex items-center">
                        <span className="p-2 bg-muted border border-r-0 rounded-l-md text-sm text-muted-foreground">{window.location.origin.replace(/https?:\/\//, '')}/catalog/</span>
                        <Input
                            id="slug-input"
                            className="rounded-l-none rounded-r-none"
                            value={shareConfig.slug === user?.uid ? '' : shareConfig.slug}
                            placeholder="tu-negocio"
                            onChange={(e) => handleConfigSave({ slug: e.target.value })}
                        />
                         <Button variant="outline" size="icon" className="rounded-l-none border-l-0" onClick={handleCopyLink}>
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            <span className="sr-only">Copiar URL</span>
                        </Button>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Vista Previa Social</CardTitle>
            <CardDescription>Personaliza cómo se ve tu menú al compartirlo en redes sociales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="max-w-lg mx-auto">
              <SocialPreviewImageUploader
                  imageUrl={shareConfig.socialPreviewImageUrl}
                  onUpload={handleSocialImageUpload}
                  onRemove={() => handleConfigSave({ socialPreviewImageUrl: null })}
              />
            </div>
            <div>
                <Label htmlFor="social-message">Mensaje personalizado</Label>
                <Textarea
                    id="social-message"
                    placeholder="¡Hola! Te invito a ver nuestro menú digital ✨"
                    value={shareConfig.socialShareMessage}
                    onChange={(e) => handleConfigSave({ socialShareMessage: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Este mensaje se incluirá al compartir por WhatsApp.</p>
            </div>
            <Button className="w-full bg-green-500 hover:bg-green-600" onClick={handleShareSocialWhatsApp}>
                <WhatsAppIcon className="h-5 w-5 mr-2" /> Compartir en WhatsApp
            </Button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Tabs defaultValue="qr">
                <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="qr"><QrCode className="w-4 h-4 mr-2" />Código QR</TabsTrigger>
                <TabsTrigger value="link"><Link2 className="w-4 h-4 mr-2" />Enlace</TabsTrigger>
                <TabsTrigger value="social"><Share2 className="w-4 h-4 mr-2" />Redes Sociales</TabsTrigger>
                </TabsList>
                <TabsContent value="qr" className="mt-4">
                    <Card>
                        <CardContent className="pt-6 flex flex-col items-center">
                          <div ref={qrCodeRef} style={{ background: qrConfig.backgroundColor, padding: '16px', display: 'inline-block', borderRadius: '8px' }}>
                            <QRCode
                              value={menuUrl}
                              size={256}
                              bgColor={qrConfig.backgroundColor}
                              fgColor={qrConfig.foregroundColor}
                              level={qrConfig.errorCorrectionLevel}
                              qrStyle={qrConfig.style}
                              eyeRadius={qrConfig.style === 'dots' ? 5 : 0}
                              imageSettings={qrConfig.logoUrl ? {
                                src: qrConfig.logoUrl,
                                x: undefined,
                                y: undefined,
                                height: 256 * (qrConfig.logoSize || 0.2),
                                width: 256 * (qrConfig.logoSize || 0.2),
                                excavate: true,
                              } : undefined}
                            />
                          </div>
                           <div className="flex gap-2 mt-4">
                            <Button onClick={() => downloadQR('png')}><Download className="w-4 h-4 mr-2" /> PNG</Button>
                            <Button variant="outline" onClick={() => downloadQR('svg')}><Download className="w-4 h-4 mr-2" /> SVG</Button>
                          </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="link" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Enlace Directo</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input value={menuUrl} readOnly />
                                <Button onClick={handleCopyLink}>
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copied ? 'Copiado' : 'Copiar'}
                                </Button>
                            </div>
                            <Button onClick={() => window.open(menuUrl, '_blank')}><Eye className="w-4 h-4 mr-2" /> Abrir Menú</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="social" className="mt-4">
                    <Card>
                         <CardHeader><CardTitle>Compartir en Redes</CardTitle></CardHeader>
                         <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Button className="bg-green-500 hover:bg-green-600" onClick={() => handleShare('whatsapp')}><WhatsAppIcon className="w-4 h-4 mr-2" /> WhatsApp</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleShare('facebook')}><Facebook className="w-4 h-4 mr-2" /> Facebook</Button>
                            <Button className="bg-sky-500 hover:bg-sky-600" onClick={() => handleShare('twitter')}><Twitter className="w-4 h-4 mr-2" /> Twitter</Button>
                         </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
        <div className="lg:col-span-1">
            <QRCodeCustomizer config={qrConfig} setConfig={handleQRConfigChange} />
        </div>
      </div>
    </div>
  );
}
