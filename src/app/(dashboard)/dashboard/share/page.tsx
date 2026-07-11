'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Link2,
  Share2,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  Pencil,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { MenuShare, QRConfig } from '@/models/share';
import { useToast } from '@/hooks/use-toast';
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { WhatsAppIcon, TikTokIcon, XIcon, FacebookIcon, InstagramIcon } from '@/components/icons';
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

        if (file.size > 5 * 1024 * 1024) {
            toast({ variant: "destructive", title: "Archivo muy grande", description: "El tamaño máximo es de 5MB." });
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
                        <NextImage src={imageUrl} alt="Vista previa" fill sizes="100vw" className="object-contain rounded-md" />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
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
  const [isSaving, setIsSaving] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const shareConfigRef = useMemoFirebase(() => 
    user ? doc(firestore, `businesses/${user.uid}/shareConfig`, 'main') : null,
    [user, firestore]
  );
  const { data: savedShareConfig, isLoading } = useDoc<MenuShare>(shareConfigRef);
  
  useEffect(() => {
    if (isLoading || !user) return;
    if (savedShareConfig) {
        const firestoreTime = new Date(savedShareConfig.updatedAt || 0).getTime();
        const localTime = new Date(shareConfig?.updatedAt || 0).getTime();
        if (!isSaving && (!shareConfig || firestoreTime !== localTime)) {
            setShareConfig({
                id: savedShareConfig.id || 'main',
                businessId: savedShareConfig.businessId || user.uid,
                slug: savedShareConfig.slug || user.uid,
                slugLanding: savedShareConfig.slugLanding || user.uid,
                useCustomSlug: !!savedShareConfig.useCustomSlug,
                useCustomSlugLanding: !!savedShareConfig.useCustomSlugLanding,
                socialPreviewImageUrl: savedShareConfig.socialPreviewImageUrl || null,
                socialShareMessage: savedShareConfig.socialShareMessage || defaultShareConfig.socialShareMessage,
                qrConfig: { ...defaultShareConfig.qrConfig, ...(savedShareConfig.qrConfig || {}) },
                totalViews: savedShareConfig.totalViews || 0,
                totalScans: savedShareConfig.totalScans || 0,
                totalShares: savedShareConfig.totalShares || 0,
                isActive: savedShareConfig.isActive ?? true,
                createdAt: savedShareConfig.createdAt || new Date().toISOString(),
                updatedAt: savedShareConfig.updatedAt || new Date().toISOString(),
            });
        }
    } else if (savedShareConfig === null && !shareConfig) {
      setShareConfig({ id: 'main', businessId: user.uid, ...defaultShareConfig, slug: user.uid, slugLanding: user.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as MenuShare);
    }
  }, [savedShareConfig, isLoading, user, isSaving, shareConfig?.updatedAt]);

  const handleLocalChange = (newValues: Partial<MenuShare>) => setShareConfig(prev => prev ? { ...prev, ...newValues } : null);
  
  const handleSocialImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const mediaDataUri = reader.result as string;
        try {
            const result = await uploadMedia({ mediaDataUri });
            handleLocalChange({ socialPreviewImageUrl: result.secure_url });
            toast({ title: "Imagen subida" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        }
    };
  };

  const handleManualSave = async () => {
    if (!shareConfig || !shareConfigRef || !firestore || !user) return;
    setIsSaving(true);
    try {
      const finalSlug = shareConfig.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/^-+|-+$/g, '');
      const now = new Date().toISOString();
      const dataToSave = { id: 'main', businessId: user.uid, slug: finalSlug, useCustomSlug: !!shareConfig.useCustomSlug, socialShareMessage: shareConfig.socialShareMessage || defaultShareConfig.socialShareMessage, socialPreviewImageUrl: shareConfig.socialPreviewImageUrl || null, qrConfig: shareConfig.qrConfig || defaultShareConfig.qrConfig, isActive: true, updatedAt: now };
      await setDoc(shareConfigRef, dataToSave, { merge: true });
      handleLocalChange({ updatedAt: now });
      const publicCatalogRef = doc(firestore, `businesses/${user.uid}/publicData`, 'catalog');
      const publicCatalogSnap = await getDoc(publicCatalogRef);
      if (publicCatalogSnap.exists()) await setDoc(publicCatalogRef, { slug: finalSlug }, { merge: true });
      toast({ title: '¡Cambios Guardados!', description: 'La configuración de tu enlace de Catálogo ha sido actualizada.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la configuración.' });
    } finally { setIsSaving(false); }
  };

  const menuUrl = useMemo(() => {
    if (typeof window === 'undefined' || !shareConfig || !user) return '';
    const slugToUse = shareConfig.useCustomSlug ? (shareConfig.slug || user.uid) : user.uid;
    return `${window.location.origin}/catalog/${slugToUse}`;
  }, [shareConfig, user]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast({ title: 'Enlace copiado' });
    setTimeout(() => setCopied(false), 2000);
  };
  
  const downloadQR = () => {
    if (!qrCodeRef.current) return;
    html2canvas(qrCodeRef.current, { backgroundColor: null }).then((canvas) => {
        const link = document.createElement('a');
        link.download = 'qr-menu-digital.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
  };

  if (isLoading && !shareConfig) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!shareConfig || !user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div className="space-y-1">
            <CardTitle>Compartir Menú</CardTitle>
            <CardDescription>Gestiona el acceso público a tu catálogo digital.</CardDescription>
          </div>
          <Button onClick={handleManualSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> URL Personalizada</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <Label htmlFor="custom-slug-switch" className="text-base">Usar alias personalizado</Label>
                <Switch id="custom-slug-switch" checked={shareConfig.useCustomSlug === true} onCheckedChange={(checked) => handleLocalChange({ useCustomSlug: checked })} />
            </div>
            {shareConfig.useCustomSlug && (
                <div className="space-y-2">
                    <Label htmlFor="slug-input">Tu Alias</Label>
                    <div className="flex items-center">
                        <span className="p-2 bg-muted border border-r-0 rounded-l-md text-sm">/catalog/</span>
                        <Input id="slug-input" className="rounded-none" value={shareConfig.slug === user.uid ? '' : shareConfig.slug} onChange={(e) => handleLocalChange({ slug: e.target.value })} />
                        <Button variant="outline" size="icon" className="rounded-l-none" onClick={handleCopyLink}>{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}</Button>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Compartir</CardTitle></CardHeader>
        <CardContent className="space-y-6">
            <div className="flex justify-center">
                <SocialPreviewImageUploader imageUrl={shareConfig.socialPreviewImageUrl} onUpload={handleSocialImageUpload} onRemove={() => handleLocalChange({ socialPreviewImageUrl: null })} />
            </div>
            <Textarea placeholder="Mensaje de bienvenida..." value={shareConfig.socialShareMessage || ''} onChange={(e) => handleLocalChange({ socialShareMessage: e.target.value })} rows={3} />
            <div className="flex justify-center p-6 border rounded-xl" ref={qrCodeRef} style={{ background: shareConfig.qrConfig.backgroundColor }}>
                <QRCode value={menuUrl} size={180} bgColor={shareConfig.qrConfig.backgroundColor} fgColor={shareConfig.qrConfig.foregroundColor} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={downloadQR}><Download className="mr-2 h-4 w-4" /> Bajar QR</Button>
                <Button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(menuUrl)}`, '_blank')}><WhatsAppIcon className="mr-2" /> WhatsApp</Button>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparte tu Catálogo</CardTitle>
          <CardDescription>Promociona tus productos en redes sociales para aumentar las ventas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button onClick={() => window.open(`https://www.tiktok.com/`, '_blank')} className="bg-[#000000] hover:bg-[#000000]/90 text-white font-bold"><TikTokIcon className="mr-2 h-4 w-4" /> TikTok</Button>
          <Button onClick={() => window.open(`https://www.instagram.com/`, '_blank')} className="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-90 text-white font-bold"><InstagramIcon className="mr-2 h-4 w-4" /> Instagram</Button>
          <Button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(menuUrl)}`, '_blank')} className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-bold"><FacebookIcon className="mr-2 h-4 w-4" /> Facebook</Button>
          <Button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareConfig.socialShareMessage || '')} ${encodeURIComponent(menuUrl)}`, '_blank')} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white font-bold"><WhatsAppIcon className="mr-2" /> WhatsApp</Button>
          <Button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(menuUrl)}&text=${encodeURIComponent(shareConfig.socialShareMessage || '')}`, '_blank')} className="bg-[#000000] hover:bg-[#000000]/90 text-white font-bold"><XIcon className="mr-2 h-4 w-4" /> X</Button>
        </CardContent>
      </Card>
    </div>
  );
}
