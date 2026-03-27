'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import EditorLandingForm from '@/components/landing-page/editor-landing-form';
import SuperAdminEditorLandingPreview from '@/components/landing-page/superadmin-editor-landing-preview';
import { useToast } from '@/hooks/use-toast';
import { saveLandingConfig } from '@/actions/save-landing-config';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

// Fallback data in case the document doesn't exist yet.
const fallbackData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '<p>En <strong>PS-USER</strong>, combinamos innovación, estrategia y tecnología para impulsar la transformación digital de tu negocio. Desarrollamos soluciones inteligentes en software, automatización, inteligencia artificial y presencia digital que optimizan tus procesos y potencian tus resultados. Nuestro equipo experto te acompaña en cada paso, desde la planificación hasta la implementación, garantizando eficiencia, seguridad y crecimiento sostenible. Conviértete en una empresa más ágil, competitiva y conectada con el futuro. <strong>PS-USER</strong>, tu aliado tecnológico para alcanzar el éxito en la era digital.</p>',
    imageUrl: 'https://images.unsplash.com/photo-1588656909074-a9ff6d608eb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxuYXR1cmUlMjB3ZWxsbmVzc3xlbnwwfHx8fDE3NjIyMjAxMzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    ctaButtonText: 'Contáctanos',
    ctaButtonUrl: '#contact',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
  },
  navigation: {
    enabled: true,
    logoUrl: '',
    logoAlt: 'Logo de Mi Negocio',
    logoWidth: 120,
    logoAlignment: 'left',
    businessName: 'Mi Negocio',
    links: [
      { id: 'nav-link-1', text: 'Inicio', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-2', text: 'Servicios', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-3', text: 'Contacto', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-4', text: 'Catálogo', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-5', text: 'Blog', url: '#', openInNewTab: false, enabled: true },
    ],
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    hoverColor: '#4CAF50',
    fontSize: 16,
    spacing: 4,
    useShadow: true,
  },
  sections: [],
  testimonials: [],
  seo: {
    title: 'Mi Negocio | Soluciones Innovadoras',
    description: 'Ofrecemos soluciones innovadoras para impulsar tu negocio al siguiente nivel.',
    keywords: ['innovación', 'tecnología', 'negocio'],
  },
  form: {
    fields: [
        { id: 'form-field-1', label: 'Nombre Completo', type: 'text', placeholder: 'ej. Juan Pérez', required: true },
        { id: 'form-field-2', label: 'Correo Electrónico', type: 'email', placeholder: 'ej. juan.perez@correo.com', required: true },
        { id: 'form-field-3', label: 'WhatsApp', type: 'tel', placeholder: 'ej. 3001234567', required: false },
        { id: 'form-field-4', label: 'Mensaje', type: 'textarea', placeholder: 'Escribe tu consulta aquí...', required: true },
    ],
    destinationEmail: '',
  },
  header: {
    banner: {
      mediaUrl: null,
      mediaType: null,
    },
    businessInfo: {
      name: 'Tu Negocio',
      address: 'Calle Falsa 123',
      phone: '+57 300 123 4567',
      email: 'info@tunegocio.com',
    },
    socialLinks: {
      tiktok: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      twitter: '',
    },
    carouselItems: [
      { id: 'carousel-item-1', mediaUrl: null, mediaType: null, slogan: '' },
      { id: 'carousel-item-2', mediaUrl: null, mediaType: null, slogan: '' },
      { id: 'carousel-item-3', mediaUrl: null, mediaType: null, slogan: '' },
    ],
  },
  footer: {
    enabled: true,
    contactInfo: {
      address: 'Calle Falsa 123, Ciudad, País',
      phone: '+57 300 123 4567',
      email: 'contacto@empresa.com',
      hours: 'Lunes a Viernes, 9am - 6pm',
    },
    quickLinks: [
      { id: 'footer-link-1', text: 'Inicio', url: '#' },
      { id: 'footer-link-2', text: 'Sobre nosotros', url: '#' },
      { id: 'footer-link-3', text: 'Servicios', url: '#' },
      { id: 'footer-link-4', text: 'Blog', url: '#' },
      { id: 'footer-link-5', text: 'Contacto', url: '#' },
      { id: 'footer-link-6', text: 'FAQ', url: '#' },
    ],
    legalLinks: {
      privacyPolicyUrl: '#',
      termsAndConditionsUrl: '#',
      cookiesPolicyUrl: '#',
      legalNoticeUrl: '#',
    },
    socialLinks: {
      facebookUrl: '',
      instagramUrl: '',
      tiktokUrl: '',
      youtubeUrl: '',
      linkedinUrl: '',
      showIcons: true,
    },
    logo: {
      url: null,
      slogan: 'Tu slogan aquí',
    },
    certifications: [],
    copyright: {
      companyName: 'Tu Empresa',
      additionalText: 'Todos los derechos reservados.',
    },
    cta: {
      text: '¡Empieza Ahora!',
      url: '#',
      enabled: false,
    },
    visuals: {
      backgroundImageUrl: null,
      opacity: 80,
      backgroundColor: '#f8f9fa',
      textColor: '#6c757d',
      darkMode: false,
      showBackToTop: true,
    },
    adminExtras: {
      systemVersion: '1.0.0',
      supportLink: '#',
      documentationLink: '#',
    },
  },
};

function deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && key in target && typeof target[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
        Object.keys(target).forEach(key => {
            if (!(key in source)) {
                output[key] = target[key];
            }
        });
    }
    return output;
}

export default function SuperAdminPublicLandingPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // 1. Fetch data directly on the client with useDoc for real-time updates
    const docRef = useMemoFirebase(() => doc(firestore, 'landing_configs', 'main'), [firestore]);
    const { data: fetchedData, isLoading: isFetching } = useDoc<LandingPageData>(docRef);
    
    // 2. Local state for editing (the "Doble Sincronización")
    const [editorData, setEditorData] = useState<LandingPageData>(fallbackData);
    const [isSaving, setIsSaving] = useState(false);
    const isFirstLoad = useRef(true);

    // 3. Populate local state only on first load with fetched data
    useEffect(() => {
        if (fetchedData && isFirstLoad.current) {
            isFirstLoad.current = false;
            const mergedData = deepMerge(fallbackData, fetchedData);
            setEditorData(mergedData);
        }
    }, [fetchedData]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await saveLandingConfig(editorData); // Save local state
            if (result.success) {
                toast({ title: '¡Guardado con Éxito!', description: 'Los cambios se han publicado.' });
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
            }
        } catch (error: any) {
            console.error("Error al guardar:", error);
            toast({ variant: "destructive", title: "Error al Guardar", description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (isFetching && isFirstLoad.current) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="p-6 flex justify-between items-center bg-card shadow">
                <div>
                    <CardTitle className="text-2xl font-bold">Editor de Landing Page Pública</CardTitle>
                    <CardDescription>Modifica el contenido de la página de inicio principal de la aplicación.</CardDescription>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2"><EditorLandingForm data={editorData} setData={setEditorData} /></div>
                <div className="lg:col-span-1"><SuperAdminEditorLandingPreview data={editorData} /></div>
            </div>
        </div>
    );
}
