
'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { LandingHeaderConfigData, CarouselItem } from '@/models/landing-page';
import { Loader2, UploadCloud, RotateCcw, Trash2, Pencil, Youtube, Linkedin, Facebook } from "lucide-react";
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useFirestore, useUser, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Business } from '@/models/business';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons';
import { Switch } from '../ui/switch';


interface EditorHeaderConfigFormProps {
  data: LandingHeaderConfigData;
  setData: (updater: (prevData: LandingHeaderConfigData) => LandingHeaderConfigData) => void;
}

// Subcomponente para cada tarjeta del carrusel
function CarouselItemCard({ item, index, onUpload, onRemove, onSloganChange }: {
  item: CarouselItem;
  index: number;
  onUpload: (id: string, file: File) => Promise<void>;
  onRemove: (id: string) => void;
  onSloganChange: (id: string, field: 'slogan', value: string) => void;
}) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    await onUpload(item.id, file);
    setIsUploading(false);
  };
  
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Elemento {index + 1}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div className="space-y-2">
          <div className="relative w-full border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 group aspect-[1920/600]">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Procesando...</p>
              </div>
            ) : item.mediaUrl ? (
              <>
                {item.mediaType === 'image' && (
                  <Image 
                    src={item.mediaUrl} 
                    alt={`Carrusel ${index + 1}`} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover rounded-md" 
                  />
                )}
                {item.mediaType === 'video' && (
                  <video src={item.mediaUrl} controls className="w-full h-full rounded-md" />
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={() => onRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-2 font-semibold">Haz clic para subir una imagen o video</p>
                <p className="text-lg font-bold text-muted-foreground mt-2">1920×600 px</p>
                <p className="text-xs text-muted-foreground">Carrusel (productos de cualquier tipo)</p>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden" 
            accept="image/*,video/*" 
          />
        </div>
        <div>
          <Label htmlFor={`slogan-${item.id}`}>Texto sobreimpreso</Label>
          <Input 
            id={`slogan-${item.id}`} 
            value={item.slogan || ''} 
            onChange={e => onSloganChange(item.id, 'slogan', e.target.value)} 
          />
        </div>
      </CardContent>
    </Card>
  );
}

const MediaUploader = ({
  mediaUrl,
  mediaType,
  onUpload,
  onRemove,
  aspectRatio,
  dimensions,
  description,
}: {
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  aspectRatio?: string;
  dimensions?: string;
  description?: string;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    await onUpload(file);
    setIsUploading(false);
  };

  return (
    <div className="space-y-2">
      <div className={`relative w-full border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 group ${aspectRatio}`}>
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Procesando...</p>
          </div>
        ) : mediaUrl ? (
          <>
            {mediaType === 'image' && <Image src={mediaUrl} alt="Banner" fill sizes="100vw" className="object-cover rounded-md" />}
            {mediaType === 'video' && <video src={mediaUrl} controls className="w-full h-full rounded-md" />}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
              <Button variant="destructive" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-2 font-semibold">Haz clic para subir una imagen o video</p>
            {dimensions && <p className="text-lg font-bold text-muted-foreground mt-2">{dimensions}</p>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
    </div>
  );
};


export default function EditorHeaderConfigForm({ data, setData }: EditorHeaderConfigFormProps) {
  const { toast } = useToast();
  const [initialData] = useState<LandingHeaderConfigData>(JSON.parse(JSON.stringify(data)));
  const { user } = useUser();
  const firestore = useFirestore();

  const businessDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'businesses', user.uid);
  }, [firestore, user]);

  const { data: business } = useDoc<Business>(businessDocRef);

  useEffect(() => {
    // Ensure carousel items exist
    if (!data.carouselItems || data.carouselItems.length < 3) {
      const currentItems = data.carouselItems || [];
      const newItems = Array.from({ length: 3 }, (_, i) => {
        return currentItems[i] || { id: `carousel-item-${i+1}-${Date.now()}`, mediaUrl: null, mediaType: null, slogan: '' };
      });
       if (JSON.stringify(currentItems) !== JSON.stringify(newItems)) {
         setData((prev) => ({ ...prev, carouselItems: newItems }));
      }
    }
    // Pre-fill business info if not set
    if (business && !data.businessInfo.name) {
        setData((prev) => ({
            ...prev,
            businessInfo: {
                ...prev.businessInfo,
                name: business.name,
                email: user?.email || '',
            }
        }));
    }

  }, [data, setData, business, user]);

  const handleInputChange = (section: keyof LandingHeaderConfigData, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value
      }
    }));
  };

  const handleSocialLinkChange = (network: keyof LandingHeaderConfigData['socialLinks'], value: string) => {
    const updatedSocialLinks = { ...data.socialLinks, [network]: value };
    setData((prev) => ({ ...prev, socialLinks: updatedSocialLinks }));
  };
  
  const handleCarouselItemChange = (id: string, field: keyof CarouselItem, value: any) => {
    const updatedItems = data.carouselItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setData((prev) => ({ ...prev, carouselItems: updatedItems }));
  };
  
  const handleReset = () => {
    setData(() => initialData);
    toast({ title: "Cambios Descartados", description: "La configuración ha sido restablecida." });
  };
  
  const handleFileUpload = async (file: File): Promise<{ secure_url: string; mediaType: 'image' | 'video' } | null> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const mediaDataUri = reader.result as string;
            try {
                const result = await uploadMedia({ mediaDataUri });
                const mediaType = file.type.startsWith('image') ? 'image' : 'video';
                toast({ title: "Archivo subido", description: "El medio ha sido cargado a Cloudinary." });
                resolve({ secure_url: result.secure_url, mediaType });
            } catch (error: any) {
                toast({ variant: 'destructive', title: "Error al subir", description: error.message });
                resolve(null);
            }
        };
        reader.onerror = () => {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo leer el archivo."});
            resolve(null);
        }
    });
  };

  const handleBannerUpload = async (file: File) => {
    const uploadResult = await handleFileUpload(file);
    if (uploadResult) {
        setData((prev) => ({ ...prev, banner: { mediaUrl: uploadResult.secure_url, mediaType: uploadResult.mediaType } }));
    }
  };
  
  const handleCarouselUpload = async (id: string, file: File) => {
    const uploadResult = await handleFileUpload(file);
    if (uploadResult) {
        const updatedItems = data.carouselItems.map(item => 
          item.id === id ? {...item, mediaUrl: uploadResult.secure_url, mediaType: uploadResult.mediaType} : item
        );
        setData((prev) => ({ ...prev, carouselItems: updatedItems }));
    }
  };
  
  const removeCarouselItemMedia = (id: string) => {
     const updatedItems = data.carouselItems.map(item => 
       item.id === id ? {...item, mediaUrl: null, mediaType: null, slogan: ''} : item
     );
     setData((prev) => ({ ...prev, carouselItems: updatedItems }));
  };
  
  const socialIcons: { [key: string]: React.ReactNode } = {
    tiktok: <TikTokIcon />,
    instagram: <InstagramIcon />,
    facebook: <FacebookIcon />,
    whatsapp: <WhatsAppIcon />,
    twitter: <XIcon />,
    youtube: <YoutubeIcon />,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Configurar Encabezado y Carrusel</CardTitle>
                <CardDescription>Personaliza la cabecera que se mostrará en tu página principal pública.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}><RotateCcw className="mr-2 h-4 w-4"/> Restablecer</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        
        <div className="space-y-4">
            <Label className="text-lg font-semibold">Banner Principal de la Landing Page</Label>
            <MediaUploader
                mediaUrl={data.banner.mediaUrl}
                mediaType={data.banner.mediaType}
                onUpload={handleBannerUpload}
                onRemove={() => setData((prev) => ({ ...prev, banner: { mediaUrl: null, mediaType: null } }))}
                aspectRatio="aspect-[1920/500]"
                dimensions="1920 × 500 px (desktop)"
                description="Dimensiones recomendadas"
            />
        </div>

        <div className="space-y-4">
          <Label className="text-lg font-semibold">Posición del Banner Principal</Label>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="banner-position">
                {data.bannerPosition === 'above' ? 'Encima del Carrusel' : 'Debajo del Carrusel (Recomendado)'}
              </Label>
              <p className="text-xs text-muted-foreground">Define el orden visual entre el carrusel y el banner principal.</p>
            </div>
            <Switch
              id="banner-position"
              checked={data.bannerPosition === 'above'}
              onCheckedChange={(checked) => setData((prev) => ({ ...prev, bannerPosition: checked ? 'above' : 'below' }))}
            />
          </div>
        </div>
        
        <div className="space-y-4">
            <Label className="text-lg font-semibold">Información del Negocio</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="business-name">Nombre del Negocio</Label>
                    <Input id="business-name" value={data.businessInfo.name} onChange={e => handleInputChange('businessInfo', 'name', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-phone">Teléfono / WhatsApp</Label>
                    <Input id="business-phone" value={data.businessInfo.phone} onChange={e => handleInputChange('businessInfo', 'phone', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-address">Dirección</Label>
                    <Input id="business-address" value={data.businessInfo.address} onChange={e => handleInputChange('businessInfo', 'address', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-email">Correo Electrónico (opcional)</Label>
                    <Input id="business-email" type="email" value={data.businessInfo.email} onChange={e => handleInputChange('businessInfo', 'email', e.target.value)} />
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <Label className="text-lg font-semibold">Redes Sociales</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.keys(socialIcons).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className="h-9 w-9 flex items-center justify-center bg-muted rounded-md text-muted-foreground">
                            {socialIcons[key as keyof typeof socialIcons]}
                        </div>
                        <Input 
                            placeholder={`URL de ${key.charAt(0).toUpperCase() + key.slice(1)}`}
                            value={(data.socialLinks as any)[key] || ''}
                            onChange={(e) => handleSocialLinkChange(key as keyof typeof data.socialLinks, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
        
        <div className="space-y-4">
            <Label className="text-lg font-semibold">Carrusel Promocional</Label>
            <p className="text-sm text-muted-foreground">Sube aquí las imágenes o videos que se mostrarán en el carrusel principal de tu landing page (máximo 3).</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.carouselItems.map((item, index) => (
                    <CarouselItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      onUpload={handleCarouselUpload}
                      onRemove={removeCarouselItemMedia}
                      onSloganChange={handleCarouselItemChange}
                    />
                ))}
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
