'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useToast } from "../../hooks/use-toast";
import type { LandingHeaderConfigData, CarouselItem } from '../../models/landing-page';
import { Loader2, UploadCloud, RotateCcw, Save, Trash2, Pencil, Image as ImageIcon } from "lucide-react";
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon, YoutubeIcon } from '../icons';
import { uploadMedia } from '../../ai/flows/upload-media-flow';
import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useMemoFirebase } from '../../firebase';
import { doc } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CatalogHeaderFormProps {
  data: LandingHeaderConfigData;
  setData: (data: LandingHeaderConfigData) => void;
}

export default function CatalogHeaderForm({ data, setData }: CatalogHeaderFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [localData, setLocalData] = useState<LandingHeaderConfigData>(data);

  // --- OBTENCIÓN DE CATEGORÍAS DEL DIRECTORIO ---
  const categoriesRef = useMemoFirebase(() => doc(firestore, 'globalConfig', 'directoryCategories'), [firestore]);
  const { data: catConfig } = useDoc<any>(categoriesRef);
  const categoriesList = useMemo(() => (catConfig?.categories || []) as { name: string, subcategories: string[] }[], [catConfig]);

  useEffect(() => {
    setLocalData(data);
  }, [data]);
  
  const handleInputChange = (section: keyof LandingHeaderConfigData, field: string, value: any) => {
    setLocalData(prevData => ({
      ...prevData,
      [section]: {
        ...(prevData[section] as object),
        [field]: value
      }
    }));
  };
  
  const handleCategoryChange = (value: string) => {
    setLocalData(prev => ({
        ...prev,
        businessInfo: {
            ...prev.businessInfo,
            category: value,
            subcategory: '' // Reiniciar subcategoría al cambiar categoría
        }
    }));
  };

  const handleSocialLinkChange = (network: keyof LandingHeaderConfigData['socialLinks'], value: string) => {
    setLocalData(prevData => {
        const updatedSocialLinks = { ...prevData.socialLinks, [network]: value };
        return { ...prevData, socialLinks: updatedSocialLinks };
    });
  };

  const handleCarouselItemChange = (id: string, field: keyof CarouselItem, value: any) => {
    setLocalData(prevData => {
        const updatedItems = prevData.carouselItems.map(item =>
        item.id === id ? { ...item, [field]: value } : item
        );
        return { ...prevData, carouselItems: updatedItems };
    });
  };
  
  const handleReset = () => {
    setLocalData(data);
    toast({ title: "Cambios Descartados", description: "La configuración ha sido restablecida." });
  };
  
  const handleSave = () => {
    setData(localData);
  };
  
  const handleFileUpload = async (file: File, callback: (mediaUrl: string, mediaType: 'image' | 'video') => void) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const mediaDataUri = reader.result as string;
        try {
            const result = await uploadMedia({ mediaDataUri });
            const mediaType = file.type.startsWith('image') ? 'image' : 'video';
            callback(result.secure_url, mediaType);
            toast({ title: "Archivo subido", description: "El medio ha sido cargado a Cloudinary." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error al subir", description: error.message });
        }
    };
  };

  const handleBannerUpload = (file: File) => {
    handleFileUpload(file, (mediaUrl, mediaType) => {
        setLocalData(prevData => ({ ...prevData, banner: { mediaUrl, mediaType } }));
    });
  };
  
  const handleCarouselUpload = (id: string, file: File) => {
    handleFileUpload(file, (mediaUrl, mediaType) => {
        const updatedItems = localData.carouselItems.map(item => item.id === id ? {...item, mediaUrl, mediaType} : item);
        setLocalData(prevData => ({ ...prevData, carouselItems: updatedItems }));
    });
  };
  
  const removeCarouselItemMedia = (id: string) => {
     const updatedItems = localData.carouselItems.map(item => item.id === id ? {...item, mediaUrl: null, mediaType: null, slogan: ''} : item);
     setLocalData(prevData => ({ ...prevData, carouselItems: updatedItems }));
  };
  
  const socialIcons: { [key: string]: React.ReactNode } = {
    tiktok: <TikTokIcon />,
    instagram: <InstagramIcon />,
    facebook: <FacebookIcon />,
    whatsapp: <WhatsAppIcon />,
    twitter: <XIcon />,
    youtube: <YoutubeIcon />,
  };
  
  const safeCarouselItems = Array.isArray(localData.carouselItems) ? localData.carouselItems : [];

  // Lógica de filtrado de subcategorías
  const selectedCategoryName = localData.businessInfo.category;
  const subcategoriesList = useMemo(() => {
    const catObj = categoriesList.find(c => c.name === selectedCategoryName);
    return catObj?.subcategories || [];
  }, [selectedCategoryName, categoriesList]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Configurar Encabezado de la Landing Page</CardTitle>
                <CardDescription>Personaliza la cabecera que se mostrará en tu página principal pública.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}><RotateCcw className="mr-2 h-4 w-4"/> Restablecer</Button>
                <Button onClick={handleSave}><Save className="mr-2 h-4 w-4"/> Guardar Cambios</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        
        <div className="space-y-4">
            <Label className="text-lg font-semibold">Banner Principal de la Landing Page</Label>
            <MediaUploader
                mediaUrl={localData.banner.mediaUrl}
                mediaType={localData.banner.mediaType}
                onUpload={handleBannerUpload}
                onRemove={() => setLocalData(prevData => ({ ...prevData, banner: { mediaUrl: null, mediaType: null } }))}
                aspectRatio="aspect-[1920/120]"
                dimensions="1920 × 120 px (desktop)"
                description="Dimensiones recomendadas"
            />
        </div>
        
        <div className="space-y-4">
            <Label className="text-lg font-semibold">Información del Negocio</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="business-name">Nombre del Negocio</Label>
                    <Input id="business-name" value={localData.businessInfo.name} onChange={e => handleInputChange('businessInfo', 'name', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-phone">Teléfono / WhatsApp</Label>
                    <Input id="business-phone" value={localData.businessInfo.phone} onChange={e => handleInputChange('businessInfo', 'phone', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-address">Dirección</Label>
                    <Input id="business-address" value={localData.businessInfo.address} onChange={e => handleInputChange('businessInfo', 'address', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-email">Correo Electrónico (opcional)</Label>
                    <Input id="business-email" type="email" value={localData.businessInfo.email || ''} onChange={e => handleInputChange('businessInfo', 'email', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-delivery-fee">Costo Domicilio ($)</Label>
                    <Input id="business-delivery-fee" type="number" value={localData.businessInfo.deliveryFee ?? ''} onChange={e => handleInputChange('businessInfo', 'deliveryFee', Number(e.target.value))} placeholder="Ej: 5000" />
                </div>
                <div>
                    <Label htmlFor="business-vat-rate">IVA (%)</Label>
                    <Input id="business-vat-rate" type="number" value={localData.businessInfo.vatRate ?? ''} onChange={e => handleInputChange('businessInfo', 'vatRate', Number(e.target.value))} placeholder="Ej: 19" />
                </div>
                <div>
                    <Label htmlFor="business-phone2">Teléfono / WhatsApp 2</Label>
                    <Input id="business-phone2" value={localData.businessInfo.phone2 || ''} onChange={e => handleInputChange('businessInfo', 'phone2', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-phone3">Teléfono / WhatsApp 3</Label>
                    <Input id="business-phone3" value={localData.businessInfo.phone3 || ''} onChange={e => handleInputChange('businessInfo', 'phone3', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-phone4">Teléfono / WhatsApp 4</Label>
                    <Input id="business-phone4" value={localData.businessInfo.phone4 || ''} onChange={e => handleInputChange('businessInfo', 'phone4', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="business-phone5">Teléfono / WhatsApp 5</Label>
                    <Input id="business-phone5" value={localData.businessInfo.phone5 || ''} onChange={e => handleInputChange('businessInfo', 'phone5', e.target.value)} />
                </div>

                {/* --- NUEVOS CAMPOS: CATEGORÍA Y SUBCATEGORÍA --- */}
                <div>
                    <Label>Categoría del Negocio</Label>
                    <Select value={localData.businessInfo.category || ''} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ninguna</SelectItem>
                            {categoriesList.map(cat => (
                                <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Subcategoría</Label>
                    <Select 
                        value={localData.businessInfo.subcategory || ''} 
                        onValueChange={(val) => handleInputChange('businessInfo', 'subcategory', val)}
                        disabled={subcategoriesList.length === 0}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={subcategoriesList.length === 0 ? "Sin subcategorías" : "Seleccionar subcategoría"} />
                        </SelectTrigger>
                        <SelectContent>
                            {subcategoriesList.map(sub => (
                                <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="business-short-desc">Descripción Corta</Label>
                        <span className={cn(
                            "text-[10px] font-bold",
                            (localData.businessInfo.shortDescription?.length || 0) > 150 ? "text-destructive" : "text-muted-foreground"
                        )}>
                            {localData.businessInfo.shortDescription?.length || 0} / 150
                        </span>
                    </div>
                    <Input 
                        id="business-short-desc" 
                        value={localData.businessInfo.shortDescription || ''} 
                        onChange={e => handleInputChange('businessInfo', 'shortDescription', e.target.value)} 
                        placeholder="Una frase breve que describe tu negocio (aparecerá debajo del nombre)"
                        maxLength={150}
                    />
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
                            value={localData.socialLinks[key as keyof typeof localData.socialLinks]}
                            onChange={(e) => handleSocialLinkChange(key as keyof typeof localData.socialLinks, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
        
        <div className="space-y-4">
            <Label className="text-lg font-semibold">Carrusel Promocional</Label>
            <p className="text-sm text-muted-foreground">Sube aquí las imágenes o videos que se mostrarán en el carrusel principal de tu landing page (máximo 3).</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(safeCarouselItems || []).map((item, index) => (
                    <Card key={item.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-base">Elemento {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-grow">
                            <MediaUploader
                                mediaUrl={item.mediaUrl}
                                mediaType={item.mediaType}
                                onUpload={(file) => handleCarouselUpload(item.id, file)}
                                onRemove={() => removeCarouselItemMedia(item.id)}
                                aspectRatio="aspect-video"
                                dimensions="1280x720px (16:9)"
                                description="Carrusel"
                            />
                            <div>
                                <Label htmlFor={`slogan-${item.id}`}>Texto sobreimpreso</Label>
                                <Input id={`slogan-${item.id}`} value={item.slogan || ''} onChange={e => handleCarouselItemChange(item.id, 'slogan', e.target.value)} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
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
    aspectRatio = 'aspect-[3/1]',
    dimensions,
    description,
    isAvatar = false,
  }: {
    mediaUrl: string | null;
    mediaType: 'image' | 'video' | null;
    onUpload: (file: File) => void;
    onRemove?: () => void;
    aspectRatio?: string;
    dimensions?: string;
    description?: string;
    isAvatar?: boolean;
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
        <div className={`relative w-full border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 group ${aspectRatio} ${isAvatar ? 'rounded-full' : ''}`}>
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Procesando...</p>
            </div>
          ) : mediaUrl ? (
            <>
              {mediaType === 'image' && <Image src={mediaUrl} alt="Banner" fill sizes="100%" className={isAvatar ? 'object-cover rounded-full' : 'object-cover rounded-md'} />}
              {mediaType === 'video' && <video src={mediaUrl} controls className="w-full h-full rounded-md" />}
              { onRemove && (
                 <div className={`absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${isAvatar ? 'justify-center items-center inset-0 bg-black/30 rounded-full' : ''}`}>
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </>
          ) : (
            <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              { isAvatar ? <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" /> : <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" /> }
              <p className="mt-2 font-semibold">Haz clic para subir {isAvatar ? 'un logo' : 'una imagen o video'}</p>
              {dimensions && <p className="text-lg font-bold text-muted-foreground mt-2">{dimensions}</p>}
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
      </div>
    );
  };
