'use client';

import { useState, useRef, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlignCenter, AlignLeft, AlignRight, GripVertical, PlusCircle, Trash2, X, Star, UploadCloud, Loader2, Pencil, Youtube, Linkedin, Facebook } from "lucide-react";
import type { LandingPageData, NavLink, ContentSection, TestimonialSection, FormField, SubSection, FooterLink } from "@/models/landing-page";
import type { GlobalConfig } from "@/models/global-config";
import { Badge } from "../ui/badge";
import RichTextEditor from "../editor/RichTextEditor";
import { cn } from "@/lib/utils";
import EditorHeaderConfigForm from "./editor-header-config-form";
import { useToast } from "@/hooks/use-toast";
import { uploadMedia } from "@/ai/flows/upload-media-flow";
import Image from 'next/image';
import { TikTokIcon, WhatsAppIcon, XIcon, FacebookIcon, InstagramIcon } from '@/components/icons';
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";


interface EditorLandingFormProps {
  data: LandingPageData;
  setData: React.Dispatch<React.SetStateAction<LandingPageData>>;
}

const MediaUploader = ({
    mediaUrl,
    mediaType,
    onUpload,
    onRemove,
    aspectRatio = 'aspect-video',
    dimensions,
    description,
    accept = "image/*,video/*",
    isIcon = false,
  }: {
    mediaUrl: string | null;
    mediaType: 'image' | 'video' | null;
    onUpload: (file: File) => void;
    onRemove: () => void;
    aspectRatio?: string;
    dimensions?: string;
    description?: string;
    accept?: string;
    isIcon?: boolean;
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
        <div 
          className={cn(
            "relative w-full border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 group",
            mediaUrl && isIcon ? 'h-24' : (!mediaUrl ? 'h-32' : aspectRatio)
          )}
          onClick={() => !mediaUrl && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Procesando...</p>
            </div>
          ) : mediaUrl ? (
            <>
              {mediaUrl && isIcon ? (
                <div className="relative w-24 h-24 mx-auto">
                  <Image src={mediaUrl} alt="Icono" fill sizes="6rem" className="object-contain rounded-md" />
                </div>
              ) : mediaType === 'image' ? (
                <Image src={mediaUrl} alt="Subido" fill sizes="10rem" className="object-cover rounded-md" />
              ) : (
                <video src={mediaUrl} controls className="w-full h-full rounded-md" />
              )}
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><Pencil className="h-4 w-4" /></Button>
                <Button variant="destructive" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
             <div className="cursor-pointer">
              <UploadCloud className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="mt-1 text-xs font-semibold">Clic para subir imagen</p>
              {dimensions && <p className="text-xs text-muted-foreground mt-1">{dimensions}</p>}
              {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={accept} />
      </div>
    );
  };

export default function EditorLandingForm({ data, setData }: EditorLandingFormProps) {
    const [newKeyword, setNewKeyword] = useState('');
    const { toast } = useToast();
    const firestore = useFirestore();

    const globalConfigRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig/system'), [firestore]);
    const { data: globalConfig } = useDoc<GlobalConfig>(globalConfigRef);

    const handleFileUpload = async (file: File): Promise<{ secure_url: string, mediaType: 'image' | 'video' } | null> => {
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

    const handleLogoUpload = async (file: File) => {
        const uploadResult = await handleFileUpload(file);
        if (uploadResult && uploadResult.mediaType === 'image') {
            handleInputChange('navigation', 'logoUrl', uploadResult.secure_url);
        } else if (uploadResult) {
            toast({ variant: 'destructive', title: 'Error de formato', description: 'Solo se pueden subir imágenes como logo.' });
        }
    };
    
    const handleSubSectionMediaUpload = async (sectionId: string, subSectionId: string, file: File) => {
        const uploadResult = await handleFileUpload(file);
        if (uploadResult) {
            const updatedSections = data.sections.map(section => {
                if (section.id === sectionId) {
                    const updatedSubSections = section.subsections.map(sub =>
                        sub.id === subSectionId ? { ...sub, imageUrl: uploadResult.secure_url, mediaType: uploadResult.mediaType } : sub
                    );
                    return { ...section, subsections: updatedSubSections };
                }
                return section;
            });
            setData((prevData) => ({ ...prevData, sections: updatedSections }));
        }
    };
    
    const handleTestimonialAvatarUpload = async (id: string, file: File) => {
        const uploadResult = await handleFileUpload(file);
         if (uploadResult && uploadResult.mediaType === 'image') {
            updateTestimonial(id, 'avatarUrl', uploadResult.secure_url);
        } else if (uploadResult) {
            toast({ variant: 'destructive', title: 'Error de formato', description: 'Solo se pueden subir imágenes como avatares.' });
        }
    };

    const handleInputChange = (section: keyof LandingPageData, field: string, value: any) => {
        setData((prevData: LandingPageData) => ({
            ...prevData,
            [section]: {
                ...(prevData[section] as object),
                [field]: value
            }
        }));
    };

    const handleNavLinkChange = (id: string, field: keyof NavLink, value: any) => {
        const updatedLinks = data.navigation.links.map(link =>
            link.id === id ? { ...link, [field]: value } : link
        );
        handleInputChange('navigation', 'links', updatedLinks);
    };
    
    const handleFooterChange = (section: keyof LandingPageData['footer'], field: string, value: any) => {
        setData((prevData) => ({
            ...prevData,
            footer: {
                ...prevData.footer,
                [section]: {
                    ...(prevData.footer[section] as object),
                    [field]: value
                }
            }
        }));
    };
    
    const handleFooterLinkChange = (id: string, field: keyof FooterLink, value: any) => {
        const updatedLinks = data.footer.quickLinks.map(link => 
            link.id === id ? { ...link, [field]: value } : link
        );
        setData((prevData) => ({ ...prevData, footer: { ...prevData.footer, quickLinks: updatedLinks }}));
    };
    
    const addFooterLink = () => {
        const newLink: FooterLink = { id: uuidv4(), text: 'Nuevo Enlace', url: '#' };
        setData((prevData) => ({ ...prevData, footer: { ...prevData.footer, quickLinks: [...prevData.footer.quickLinks, newLink] }}));
    };

    const removeFooterLink = (id: string) => {
        const updatedLinks = data.footer.quickLinks.filter(link => link.id !== id);
        setData((prevData) => ({ ...prevData, footer: { ...prevData.footer, quickLinks: updatedLinks }}));
    };
    

    const addNavLink = () => {
        const newLink: NavLink = { id: uuidv4(), text: 'Nuevo Enlace', url: '#', openInNewTab: false, enabled: true };
        handleInputChange('navigation', 'links', [...data.navigation.links, newLink]);
    };

    const removeNavLink = (id: string) => {
        const updatedLinks = data.navigation.links.filter(link => link.id !== id);
        handleInputChange('navigation', 'links', updatedLinks);
    };
    
    const addKeyword = () => {
        if (newKeyword && !data.seo.keywords.includes(newKeyword)) {
          handleInputChange('seo', 'keywords', [...data.seo.keywords, newKeyword]);
          setNewKeyword('');
        }
    };
    
    const removeKeyword = (keywordToRemove: string) => {
        handleInputChange('seo', 'keywords', data.seo.keywords.filter(keyword => keyword !== keywordToRemove));
    };

    const addContentSection = () => {
        const newSection: ContentSection = {
            id: uuidv4(),
            title: 'Nuevo Título de Sección',
            subtitle: 'Un subtítulo interesante para tu nueva sección.',
            content: '<p>Este es el contenido inicial de tu sección. ¡Edítalo!</p>',
            subsections: [],
            backgroundColor: '#FFFFFF',
            textColor: '#000000',
        };
        setData((prevData) => ({ ...prevData, sections: [...prevData.sections, newSection] }));
    };

    const updateContentSection = (id: string, field: keyof ContentSection, value: any) => {
        const updatedSections = data.sections.map(section =>
            section.id === id ? { ...section, [field]: value } : section
        );
        setData((prevData) => ({ ...prevData, sections: updatedSections }));
    };

    const removeContentSection = (id: string) => {
        setData((prevData) => ({ ...prevData, sections: prevData.sections.filter(section => section.id !== id) }));
    };

    const addSubSection = (sectionId: string) => {
        const newSubSection: SubSection = {
            id: uuidv4(),
            title: 'Nueva Característica',
            description: '<p>Descripción breve de esta característica.</p>',
            imageUrl: null,
            mediaType: null,
        };
        const updatedSections = data.sections.map(section => {
            if (section.id === sectionId) {
                return { ...section, subsections: [...section.subsections, newSubSection] };
            }
            return section;
        });
        setData((prevData) => ({ ...prevData, sections: updatedSections }));
    };

    const updateSubSection = (sectionId: string, subSectionId: string, field: keyof Omit<SubSection, 'id'>, value: any) => {
        const updatedSections = data.sections.map(section => {
            if (section.id === sectionId) {
                const updatedSubSections = section.subsections.map(sub => 
                    sub.id === subSectionId ? { ...sub, [field]: value } : sub
                );
                return { ...section, subsections: updatedSubSections };
            }
            return section;
        });
        setData((prevData) => ({ ...prevData, sections: updatedSections }));
    };

    const removeSubSection = (sectionId: string, subSectionId: string) => {
        const updatedSections = data.sections.map(section => {
            if (section.id === sectionId) {
                return { ...section, subsections: section.subsections.filter(sub => sub.id !== subSectionId) };
            }
            return section;
        });
        setData((prevData) => ({ ...prevData, sections: updatedSections }));
    };

    const addTestimonial = () => {
        const newTestimonial: TestimonialSection = {
            id: uuidv4(),
            authorName: 'Nombre del Cliente',
            authorRole: 'Cargo del Cliente',
            text: '<p>Un testimonio increíble sobre mi producto o servicio.</p>',
            avatarUrl: `https://i.pravatar.cc/100?u=${uuidv4()}`,
            rating: 5,
        };
        setData((prevData) => ({ ...prevData, testimonials: [...prevData.testimonials, newTestimonial] }));
    };

    const updateTestimonial = (id: string, field: keyof TestimonialSection, value: any) => {
        setData(prevData => ({
            ...prevData,
            testimonials: prevData.testimonials.map(testimonial =>
                testimonial.id === id ? { ...testimonial, [field]: value } : testimonial
            )
        }));
    };

    const removeTestimonial = (id: string) => {
        setData((prevData) => ({ ...prevData, testimonials: prevData.testimonials.filter(testimonial => testimonial.id !== id) }));
    };

    const addFormField = () => {
        const newField: FormField = {
            id: uuidv4(),
            label: 'Nuevo Campo',
            type: 'text',
            placeholder: 'Escribe aquí...',
            required: false,
        };
        handleInputChange('form', 'fields', [...data.form.fields, newField]);
    };
    
    const updateFormField = (id: string, field: keyof FormField, value: any) => {
        const updatedFields = data.form.fields.map(f =>
            f.id === id ? { ...f, [field]: value } : f
        );
        handleInputChange('form', 'fields', updatedFields);
    };

    const removeFormField = (id: string) => {
        const updatedFields = data.form.fields.filter(f => f.id !== id);
        handleInputChange('form', 'fields', updatedFields);
    };

    const socialIcons: { [key: string]: React.ReactNode } = {
        tiktok: <TikTokIcon className="h-5 w-5"/>,
        instagram: <InstagramIcon className="h-5 w-5"/>,
        facebook: <FacebookIcon className="h-5 w-5"/>,
        whatsapp: <WhatsAppIcon className="h-5 w-5"/>,
        twitter: <XIcon className="h-5 w-5"/>,
    };


  return (
    <Card>
        <CardHeader>
            <CardTitle>Panel de Edición</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="hero" className="w-full">
                <TabsList className="h-auto p-2 mb-4 bg-muted rounded-lg flex flex-wrap gap-2">
                    <TabsTrigger value="hero">Principal</TabsTrigger>
                    <TabsTrigger value="navigation">Navegación</TabsTrigger>
                    <TabsTrigger value="carousel">Carrusel</TabsTrigger>
                    <TabsTrigger value="sections">Secciones</TabsTrigger>
                    <TabsTrigger value="testimonials">Testimonios</TabsTrigger>
                    <TabsTrigger value="seo">SEO</TabsTrigger>
                    <TabsTrigger value="form">Formulario</TabsTrigger>
                </TabsList>
                
                {/* HERO TAB */}
                <TabsContent value="hero">
                    <div className="space-y-4">
                        <CardTitle className="text-lg">Configuración del Hero</CardTitle>
                        <div>
                            <Label htmlFor="hero-title">Título Principal</Label>
                            <Input id="hero-title" value={data.hero.title} onChange={(e) => handleInputChange('hero', 'title', e.target.value)} />
                        </div>
                         <div>
                            <Label htmlFor="hero-subtitle">Subtítulo</Label>
                            <Input id="hero-subtitle" value={data.hero.subtitle} onChange={(e) => handleInputChange('hero', 'subtitle', e.target.value)} />
                        </div>
                        <div>
                            <Label>Contenido Adicional</Label>
                             <RichTextEditor
                                value={data.hero.additionalContent}
                                onChange={(content) => handleInputChange('hero', 'additionalContent', content)}
                                placeholder="Escribe aquí..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="hero-image">URL de Imagen del Hero</Label>
                            <Input id="hero-image" value={data.hero.imageUrl ?? ''} onChange={(e) => handleInputChange('hero', 'imageUrl', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="hero-cta-text">Texto del Botón CTA</Label>
                                <Input id="hero-cta-text" value={data.hero.ctaButtonText} onChange={(e) => handleInputChange('hero', 'ctaButtonText', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="hero-cta-url">URL del Botón CTA</Label>
                                <Input id="hero-cta-url" value={data.hero.ctaButtonUrl} onChange={(e) => handleInputChange('hero', 'ctaButtonUrl', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="hero-bg-color">Color de Fondo</Label>
                                <Input id="hero-bg-color" type="color" value={data.hero.backgroundColor} onChange={(e) => handleInputChange('hero', 'backgroundColor', e.target.value)} className="p-1"/>
                            </div>
                            <div>
                                <Label htmlFor="hero-text-color">Color de Texto</Label>
                                <Input id="hero-text-color" type="color" value={data.hero.textColor} onChange={(e) => handleInputChange('hero', 'textColor', e.target.value)} className="p-1"/>
                            </div>
                            <div>
                                <Label htmlFor="hero-btn-color">Color del Botón</Label>
                                <Input id="hero-btn-color" type="color" value={data.hero.buttonColor} onChange={(e) => handleInputChange('hero', 'buttonColor', e.target.value)} className="p-1"/>
                            </div>
                        </div>
                        
                        {/* Social Media Section */}
                        <div className="space-y-4 pt-4">
                            <Label className="text-lg font-semibold">Redes Sociales</Label>
                            <Card className="bg-muted/30">
                                <CardContent className="p-6 space-y-4">
                                    {Object.keys(data.header.socialLinks).map(key => (
                                        <div key={key} className="flex items-center gap-4">
                                            <div className={cn("h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-white", {
                                                'bg-black': key === 'tiktok' || key === 'twitter',
                                                'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500': key === 'instagram',
                                                'bg-[#1877F2]': key === 'facebook',
                                                'bg-[#25D366]': key === 'whatsapp',
                                            })}>
                                                {key === 'twitter' ? <XIcon className="h-5 w-5" /> : socialIcons[key as keyof typeof socialIcons]}
                                            </div>
                                            <Input 
                                                placeholder={`https://www.${key}.com/...`}
                                                value={(data.header.socialLinks as any)[key]}
                                                onChange={e => {
                                                    const updatedSocialLinks = { ...data.header.socialLinks, [key]: e.target.value };
                                                    handleInputChange('header', 'socialLinks', updatedSocialLinks);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* NAVIGATION TAB */}
                <TabsContent value="navigation">
                    <Accordion type="multiple" defaultValue={["item-1"]} className="w-full space-y-4">
                        <AccordionItem value="item-1" className="border rounded-lg">
                            <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">Barra Superior (Header)</AccordionTrigger>
                            <AccordionContent className="space-y-6 pt-4 px-4">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <Label htmlFor="nav-enabled" className="flex flex-col space-y-1">
                                        <span>Habilitar Barra Superior</span>
                                        <span className="font-normal leading-snug text-muted-foreground">
                                        Controla la visibilidad de toda la barra de navegación.
                                        </span>
                                    </Label>
                                    <Switch
                                        id="nav-enabled"
                                        checked={data.navigation.enabled}
                                        onCheckedChange={(checked) => handleInputChange('navigation', 'enabled', checked)}
                                    />
                                </div>

                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-medium">Sección de Logo</h3>
                                    <MediaUploader
                                        mediaUrl={data.navigation.logoUrl}
                                        mediaType="image"
                                        onUpload={handleLogoUpload}
                                        onRemove={() => handleInputChange('navigation', 'logoUrl', '')}
                                        accept="image/*"
                                        dimensions="500x500px"
                                        description="Logo"
                                        isIcon={true}
                                    />
                                    <div>
                                        <Label htmlFor="nav-logo-alt">Texto Alternativo (si no hay logo)</Label>
                                        <Input id="nav-logo-alt" value={data.navigation.logoAlt} onChange={(e) => handleInputChange('navigation', 'logoAlt', e.target.value)} />
                                    </div>
                                    <div>
                                        <Label>Ancho del Logo: {data.navigation.logoWidth}px</Label>
                                        <Slider
                                            value={[data.navigation.logoWidth]}
                                            onValueChange={(value) => handleInputChange('navigation', 'logoWidth', value[0])}
                                            min={20}
                                            max={300}
                                            step={5}
                                        />
                                    </div>
                                    <div>
                                        <Label>Alineación del Logo</Label>
                                        <div className="flex gap-2 mt-2">
                                            <Button variant={data.navigation.logoAlignment === 'left' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleInputChange('navigation', 'logoAlignment', 'left')}><AlignLeft/></Button>
                                            <Button variant={data.navigation.logoAlignment === 'center' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleInputChange('navigation', 'logoAlignment', 'center')}><AlignCenter/></Button>
                                            <Button variant={data.navigation.logoAlignment === 'right' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleInputChange('navigation', 'logoAlignment', 'right')}><AlignRight/></Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-medium">Enlaces de Navegación</h3>
                                    <div className="space-y-3">
                                        {data.navigation.links.map((link) => (
                                            <div key={link.id} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                                <div className="grid grid-cols-2 gap-2 flex-1">
                                                    <Input placeholder="Texto del enlace" value={link.text} onChange={(e) => handleNavLinkChange(link.id, 'text', e.target.value)} />
                                                    <Input placeholder="URL" value={link.url} onChange={(e) => handleNavLinkChange(link.id, 'url', e.target.value)} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`enabled-${link.id}`} className="text-xs">Activado</Label>
                                                    <Switch id={`enabled-${link.id}`} checked={link.enabled} onCheckedChange={(checked) => handleNavLinkChange(link.id, 'enabled', checked)} />
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => removeNavLink(link.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button onClick={addNavLink}>Añadir Enlace</Button>
                                </div>

                                <div className="space-y-4 p-4 border rounded-lg">
                                    <h3 className="font-medium">Estilos</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="nav-bg-color">Color de Fondo</Label>
                                            <Input id="nav-bg-color" type="color" value={data.navigation.backgroundColor} onChange={(e) => handleInputChange('navigation', 'backgroundColor', e.target.value)} className="p-1 h-10"/>
                                        </div>
                                        <div>
                                            <Label htmlFor="nav-text-color">Color de Texto</Label>
                                            <Input id="nav-text-color" type="color" value={data.navigation.textColor} onChange={(e) => handleInputChange('navigation', 'textColor', e.target.value)} className="p-1 h-10"/>
                                        </div>
                                        <div>
                                            <Label htmlFor="nav-hover-color">Color de Hover</Label>
                                            <Input id="nav-hover-color" type="color" value={data.navigation.hoverColor} onChange={(e) => handleInputChange('navigation', 'hoverColor', e.target.value)} className="p-1 h-10"/>
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Tamaño de Fuente: {data.navigation.fontSize}px</Label>
                                            <Slider
                                                value={[data.navigation.fontSize]}
                                                onValueChange={(value) => handleInputChange('navigation', 'fontSize', value[0])}
                                                min={12} max={24} step={1}
                                            />
                                        </div>
                                        <div>
                                            <Label>Espaciado entre enlaces: {data.navigation.spacing}</Label>
                                            <Slider
                                                value={[data.navigation.spacing]}
                                                onValueChange={(value) => handleInputChange('navigation', 'spacing', value[0])}
                                                min={1} max={10} step={1}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch id="nav-shadow" checked={data.navigation.useShadow} onCheckedChange={(checked) => handleInputChange('navigation', 'useShadow', checked)} />
                                        <Label htmlFor="nav-shadow">Añadir Sombra</Label>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border rounded-lg">
                            <AccordionTrigger className="p-4 text-lg font-semibold hover:no-underline">Pie de Página (Footer)</AccordionTrigger>
                            <AccordionContent className="p-4 pt-2 space-y-6">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <Label htmlFor="footer-enabled" className="flex flex-col space-y-1">
                                        <span>Habilitar Pie de Página</span>
                                        <span className="font-normal leading-snug text-muted-foreground">
                                        Controla la visibilidad de toda la sección del footer.
                                        </span>
                                    </Label>
                                    <Switch
                                        id="footer-enabled"
                                        checked={data.footer.enabled}
                                        onCheckedChange={(checked) => setData((prev) => ({ ...prev, footer: { ...prev.footer, enabled: checked }}))}
                                    />
                                </div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">1. Información de Contacto</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Input placeholder="Dirección física" value={data.footer.contactInfo.address} onChange={(e) => handleFooterChange('contactInfo', 'address', e.target.value)} />
                                        <Input placeholder="Teléfono/WhatsApp" value={data.footer.contactInfo.phone} onChange={(e) => handleFooterChange('contactInfo', 'phone', e.target.value)} />
                                        <Input placeholder="Correo electrónico" type="email" value={data.footer.contactInfo.email} onChange={(e) => handleFooterChange('contactInfo', 'email', e.target.value)} />
                                        <Input placeholder="Horarios de atención" value={data.footer.contactInfo.hours} onChange={(e) => handleFooterChange('contactInfo', 'hours', e.target.value)} />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">2. Enlaces Rápidos</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {data.footer.quickLinks.map(link => (
                                            <div key={link.id} className="flex gap-2 items-center">
                                                <Input placeholder="Texto" value={link.text} onChange={e => handleFooterLinkChange(link.id, 'text', e.target.value)} />
                                                <Input placeholder="URL" value={link.url} onChange={e => handleFooterLinkChange(link.id, 'url', e.target.value)} />
                                                <Button variant="ghost" size="icon" onClick={() => removeFooterLink(link.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        ))}
                                        <Button variant="outline" size="sm" onClick={addFooterLink}>Añadir Enlace Rápido</Button>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle className="text-base">4. Redes Sociales</CardTitle></CardHeader>
                                    <CardContent className="space-y-2">
                                        <Input placeholder="URL Facebook" value={data.footer.socialLinks.facebookUrl} onChange={e => handleFooterChange('socialLinks', 'facebookUrl', e.target.value)} />
                                        <Input placeholder="URL Instagram" value={data.footer.socialLinks.instagramUrl} onChange={e => handleFooterChange('socialLinks', 'instagramUrl', e.target.value)} />
                                        <Input placeholder="URL TikTok" value={data.footer.socialLinks.tiktokUrl} onChange={e => handleFooterChange('socialLinks', 'tiktokUrl', e.target.value)} />
                                        <Input placeholder="URL YouTube" value={data.footer.socialLinks.youtubeUrl} onChange={e => handleFooterChange('socialLinks', 'youtubeUrl', e.target.value)} />
                                        <Input placeholder="URL LinkedIn" value={data.footer.socialLinks.linkedinUrl} onChange={e => handleFooterChange('socialLinks', 'linkedinUrl', e.target.value)} />
                                        <div className="flex items-center gap-2 pt-2">
                                            <Switch id="footer-show-social" checked={data.footer.socialLinks.showIcons} onCheckedChange={checked => handleFooterChange('socialLinks', 'showIcons', checked)} />
                                            <Label htmlFor="footer-show-social">Mostrar iconos de redes sociales</Label>
                                        </div>
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>

                {/* CAROUSEL TAB */}
                <TabsContent value="carousel">
                     <EditorHeaderConfigForm
                        data={data.header}
                        setData={(valOrUpdater) => setData(prev => ({
                            ...prev,
                            header: typeof valOrUpdater === 'function'
                                ? (valOrUpdater as any)(prev.header)
                                : valOrUpdater
                        }))}
                    />
                </TabsContent>
                
                {/* SECTIONS TAB */}
                <TabsContent value="sections">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Secciones de Contenido</CardTitle>
                            <Button onClick={addContentSection} size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Agregar Sección
                            </Button>
                        </div>
                        {data.sections.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-4">
                                {data.sections.map((section, index) => (
                                    <AccordionItem key={section.id} value={`item-${index}`} className="border rounded-lg bg-background">
                                        <AccordionTrigger className="p-4 text-base font-semibold hover:no-underline">
                                            <div className="flex items-center gap-2 flex-1 truncate">
                                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                                <span className="truncate">{section.title}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 pt-0 space-y-4">
                                            <div className="flex justify-end">
                                                <Button variant="destructive" size="sm" onClick={() => removeContentSection(section.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar Sección
                                                </Button>
                                            </div>
                                            <div>
                                                <Label>Título</Label>
                                                <Input value={section.title} onChange={(e) => updateContentSection(section.id, 'title', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>Subtítulo</Label>
                                                <Input value={section.subtitle} onChange={(e) => updateContentSection(section.id, 'subtitle', e.target.value)} />
                                            </div>
                                            <div>
                                                <Label>Contenido</Label>
                                                <RichTextEditor value={section.content} onChange={(content) => updateContentSection(section.id, 'content', content)} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Color de Fondo</Label>
                                                    <Input type="color" value={section.backgroundColor} onChange={(e) => updateContentSection(section.id, 'backgroundColor', e.target.value)} className="p-1 h-10" />
                                                </div>
                                                <div>
                                                    <Label>Color de Texto</Label>
                                                    <Input type="color" value={section.textColor} onChange={(e) => updateContentSection(section.id, 'textColor', e.target.value)} className="p-1 h-10" />
                                                </div>
                                            </div>
                                            <div className="p-4 border rounded-md mt-4 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-medium">Subsecciones (Tarjetas/Columnas)</h4>
                                                    <Button variant="outline" size="sm" onClick={() => addSubSection(section.id)}>
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Añadir Tarjeta
                                                    </Button>
                                                </div>
                                                {section.subsections.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {section.subsections.map(sub => (
                                                            <div key={sub.id} className="p-3 border rounded-lg bg-muted/50 space-y-3">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="font-semibold text-sm">{sub.title}</p>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSubSection(section.id, sub.id)}>
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <MediaUploader
                                                                        mediaUrl={sub.imageUrl}
                                                                        mediaType={sub.mediaType}
                                                                        onUpload={(file) => handleSubSectionMediaUpload(section.id, sub.id, file)}
                                                                        onRemove={() => updateSubSection(section.id, sub.id, 'imageUrl', null)}
                                                                        aspectRatio="aspect-[4/3]"
                                                                        dimensions="600x400px (4:3)"
                                                                        description="Imagen para tarjeta"
                                                                    />
                                                                    <div>
                                                                        <Label htmlFor={`sub-title-${sub.id}`}>Título Tarjeta</Label>
                                                                        <Input id={`sub-title-${sub.id}`} value={sub.title} onChange={(e) => updateSubSection(section.id, sub.id, 'title', e.target.value)} />
                                                                    </div>
                                                                    <div>
                                                                        <Label htmlFor={`sub-desc-${sub.id}`}>Descripción</Label>
                                                                        <RichTextEditor 
                                                                            value={sub.description} 
                                                                            onChange={(content) => updateSubSection(section.id, sub.id, 'description', content)} 
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground text-center py-4">No hay subsecciones todavía.</p>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-10 h-64 border rounded-md bg-muted/20">
                                <p className="text-muted-foreground">Aún no has agregado ninguna sección de contenido.</p>
                                <p className="text-sm text-muted-foreground">¡Haz clic en "Agregar Sección" para comenzar!</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
                
                {/* TESTIMONIALS TAB */}
                <TabsContent value="testimonials">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Testimonios de Clientes</CardTitle>
                            <Button onClick={addTestimonial} size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Agregar Testimonio
                            </Button>
                        </div>
                        {data.testimonials.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-4">
                                {data.testimonials.map((testimonial, index) => (
                                    <AccordionItem key={testimonial.id} value={`testimonial-${index}`} className="border rounded-lg bg-background">
                                        <AccordionTrigger className="p-4 text-base font-semibold hover:no-underline">
                                            <div className="flex items-center gap-2 flex-1 truncate">
                                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                                <span className="truncate">{testimonial.authorName}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 pt-0 space-y-4">
                                            <div className="flex justify-end">
                                                <Button variant="destructive" size="sm" onClick={() => removeTestimonial(testimonial.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar Testimonio
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Nombre del Autor</Label>
                                                    <Input value={testimonial.authorName} onChange={(e) => updateTestimonial(testimonial.id, 'authorName', e.target.value)} />
                                                </div>
                                                <div>
                                                    <Label>Cargo del Autor</Label>
                                                    <Input value={testimonial.authorRole} onChange={(e) => updateTestimonial(testimonial.id, 'authorRole', e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Avatar del Autor</Label>
                                                <MediaUploader
                                                    mediaUrl={testimonial.avatarUrl}
                                                    mediaType={testimonial.avatarUrl ? 'image' : null}
                                                    onUpload={(file) => handleTestimonialAvatarUpload(testimonial.id, file)}
                                                    onRemove={() => updateTestimonial(testimonial.id, 'avatarUrl', `https://i.pravatar.cc/100?u=${testimonial.id}`)}
                                                    aspectRatio="aspect-square"
                                                    dimensions="100x100px"
                                                    description="Avatar"
                                                    accept="image/*"
                                                />
                                            </div>
                                            <div>
                                                <Label>Testimonio</Label>
                                                <RichTextEditor value={testimonial.text} onChange={(content) => updateTestimonial(testimonial.id, 'text', content)} />
                                            </div>
                                            <div>
                                                <Label>Calificación (1-5 estrellas)</Label>
                                                <div className="flex items-center gap-1 mt-2">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Button key={star} variant="ghost" size="icon" onClick={() => updateTestimonial(testimonial.id, 'rating', star)}>
                                                            <Star className={cn("h-5 w-5", testimonial.rating >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-10 h-64 border rounded-md bg-muted/20">
                                <p className="text-muted-foreground">Aún no has agregado ningún testimonio.</p>
                                <p className="text-sm text-muted-foreground">¡Haz clic en "Agregar Testimonio" para empezar!</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* SEO TAB */}
                <TabsContent value="seo">
                    <div className="space-y-4">
                        <CardTitle className="text-lg">Configuración SEO</CardTitle>
                        <div>
                            <Label htmlFor="seo-title">Título SEO</Label>
                            <Input id="seo-title" value={data.seo.title} onChange={(e) => handleInputChange('seo', 'title', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="seo-description">Descripción SEO</Label>
                             <Input id="seo-description" value={data.seo.description} onChange={(e) => handleInputChange('seo', 'description', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="seo-keywords">Palabras Clave</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="seo-keywords"
                                    value={newKeyword}
                                    onChange={(e) => setNewKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                />
                                <Button onClick={addKeyword}>Añadir</Button>
                            </div>
                             <div className="flex flex-wrap gap-2 mt-2">
                                {data.seo.keywords.map(keyword => (
                                <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
                                    {keyword}
                                    <button onClick={() => removeKeyword(keyword)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>
                
                {/* FORM TAB */}
                <TabsContent value="form">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Editor Visual de Formulario</CardTitle>
                                <p className="text-sm text-muted-foreground">Arrastra y edita los campos de tu formulario.</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {data.form.fields.map((field, index) => (
                                    <Card key={field.id} className="p-4 bg-muted/50">
                                        <div className="flex items-start gap-4">
                                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-2.5" />
                                            <div className="flex-1 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor={`label-${field.id}`}>Etiqueta</Label>
                                                        <Input id={`label-${field.id}`} value={field.label} onChange={(e) => updateFormField(field.id, 'label', e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor={`type-${field.id}`}>Tipo de Campo</Label>
                                                        <Select value={field.type} onValueChange={(value) => updateFormField(field.id, 'type', value)}>
                                                            <SelectTrigger id={`type-${field.id}`}>
                                                                <SelectValue placeholder="Seleccionar tipo" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="text">Texto</SelectItem>
                                                                <SelectItem value="email">Email</SelectItem>
                                                                <SelectItem value="textarea">Área de texto</SelectItem>
                                                                <SelectItem value="tel">Teléfono</SelectItem>
                                                                <SelectItem value="number">Número</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label htmlFor={`placeholder-${field.id}`}>Placeholder</Label>
                                                    <Input id={`placeholder-${field.id}`} value={field.placeholder} onChange={(e) => updateFormField(field.id, 'placeholder', e.target.value)} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <Switch id={`required-${field.id}`} checked={field.required} onCheckedChange={(checked) => updateFormField(field.id, 'required', checked)} />
                                                        <Label htmlFor={`required-${field.id}`}>Requerido</Label>
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => removeFormField(field.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                <Button onClick={addFormField} variant="outline" className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Agregar Campo
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Configuración del Correo</CardTitle>
                                <p className="text-sm text-muted-foreground">Define a dónde llegarán los mensajes.</p>
                            </CardHeader>
                            <CardContent>
                                <div>
                                    <Label htmlFor="form-email">Correo de Destino</Label>
                                    <Input id="form-email" type="email" value={data.form.destinationEmail} onChange={(e) => handleInputChange('form', 'destinationEmail', e.target.value)} placeholder="tu-correo@ejemplo.com" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}
