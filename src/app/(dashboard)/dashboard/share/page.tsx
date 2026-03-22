
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
  Palette
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

const defaultShareConfig: Omit<MenuShare, 'id' | 'businessId' | 'createdAt' | 'updatedAt'> = {
  slug: '',
  qrConfig: {
    size: 256,
    backgroundColor: "#ffffff",
    foregroundColor: "#000000",
    errorCorrectionLevel: 'L',
    style: 'squares',
    logoSize: 0.2,
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
                    <Label>Tamaño del logo ({Math.round(config.logoSize * 100)}%)</Label>
                    <Slider
                        min={0.1}
                        max={0.3}
                        step={0.05}
                        defaultValue={[config.logoSize]}
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
      setShareConfig(savedShareConfig);
    } else if (user && !isLoading) {
      // Create a default config if one doesn't exist
      const newConfig: MenuShare = {
        id: 'main',
        businessId: user.uid,
        slug: user.uid,
        ...defaultShareConfig,
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
    // Debounce this in a real app
    if(shareConfigRef) {
        setDocumentNonBlocking(shareConfigRef, { qrConfig: newQRConfig, updatedAt: new Date().toISOString() }, { merge: true });
    }
  };

  const getCatalogUrl = () => {
    if (typeof window !== 'undefined' && shareConfig?.slug) {
      return `${window.location.origin}/catalog/${shareConfig.slug}`;
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
                              // The react-qr-code library has built-in support for an image overlay
                              qrStyle={qrConfig.style}
                              eyeRadius={qrConfig.style === 'rounded' ? 10 : 0}
                              imageSettings={qrConfig.logoUrl ? {
                                src: qrConfig.logoUrl,
                                x: undefined,
                                y: undefined,
                                height: 256 * qrConfig.logoSize,
                                width: 256 * qrConfig.logoSize,
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
