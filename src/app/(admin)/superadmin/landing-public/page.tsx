
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import EditorLandingForm from '@/components/landing-page/editor-landing-form';
import SuperAdminEditorLandingPreview from '@/components/landing-page/superadmin-editor-landing-preview';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDocFromServer, getDocFromCache } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { saveLandingConfig } from '@/actions/save-landing-config';

// Define the initial structure of the landing page data
const initialLandingData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '',
    imageUrl: 'https://picsum.photos/seed/vintagecar/1200/800', 
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
    ctaButtonText: 'Contáctanos',
    ctaButtonUrl: '#contact'
  },
  navigation: { enabled: true, logoUrl: '', businessName: 'Mi Negocio', logoAlt: 'Logo', logoWidth: 120, logoAlignment: 'left', links: [], backgroundColor: '#FFFFFF', textColor: '#000000', hoverColor: '#4CAF50', fontSize: 16, spacing: 4, useShadow: true },
  sections: [], 
  testimonials: [], 
  seo: { title: 'Mi Negocio', description: '', keywords: [] }, 
  form: { fields: [], destinationEmail: '' }, 
  header: { 
    banner: { mediaUrl: null, mediaType: null }, 
    businessInfo: { name: '', address: '', phone: '', email: '' }, 
    socialLinks: { tiktok: '', instagram: '', facebook: '', whatsapp: '', twitter: '' }, 
    carouselItems: [
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
    ]
  },
  footer: { enabled: true, contactInfo: { address: '', phone: '', email: '', hours: '' }, quickLinks: [], legalLinks: { privacyPolicyUrl: '', termsAndConditionsUrl: '', cookiesPolicyUrl: '', legalNoticeUrl: '' }, socialLinks: { facebookUrl: '', instagramUrl: '', tiktokUrl: '', youtubeUrl: '', linkedinUrl: '', showIcons: true }, logo: { url: null, slogan: '' }, certifications: [], copyright: { companyName: '', additionalText: '' }, cta: { text: '', url: '', enabled: false }, visuals: { backgroundImageUrl: null, opacity: 80, backgroundColor: '#FFFFFF', textColor: '#000000', darkMode: false, showBackToTop: true }, adminExtras: { systemVersion: '1.0.0', supportLink: '', documentationLink: '' } },
};

// Helper function to deeply merge saved data with the initial structure
function deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && key in target && typeof target[key] === 'object') {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
        // Ensure all keys from target are in output, even if not in source
        Object.keys(target).forEach(key => {
            if (!(key in source)) {
                output[key] = target[key];
            }
        });
    }
    return output;
}

export default function SuperAdminPublicLandingPage() {
  const [data, setData] = useState<LandingPageData>(initialLandingData);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const firestore = useFirestore();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => firestore ? doc(firestore, 'landing_configs', 'main') : null, [firestore]);

  useEffect(() => {
    if (!docRef) {
      setIsFetching(false);
      return;
    }

    const fetchData = async () => {
      setIsFetching(true);
      let docSnap;
      try {
        docSnap = await getDocFromServer(docRef);
      } catch (serverError: any) {
        console.warn('Could not fetch from server, trying cache...', serverError.code);
        try {
          docSnap = await getDocFromCache(docRef);
        } catch (cacheError: any) {
          console.error('Cache fetch also failed. Displaying initial data as fallback.', cacheError);
          docSnap = null; // Important: set to null if both fail
        }
      }

      if (docSnap && docSnap.exists()) {
        const savedData = docSnap.data() as LandingPageData;
        const mergedData = deepMerge(initialLandingData, savedData);
        setData(mergedData);
      }
      // If docSnap is null or doesn't exist, the state will remain as 'initialLandingData', preventing resets.
      
      setIsFetching(false);
    };

    fetchData();
  }, [docRef]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveLandingConfig(data);

      if (result.success) {
        toast({
          title: '¡Guardado con Éxito!',
          description: 'Los cambios se han guardado correctamente en la base de datos.',
        });
      } else {
        throw new Error(result.error || 'Ocurrió un error desconocido en el servidor.');
      }
    } catch (error: any) {
      console.error("Error al llamar saveLandingConfig:", error);
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: `No se pudieron guardar los cambios. Error: ${error.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
            <div className="lg:col-span-2"><EditorLandingForm data={data} setData={setData} /></div>
            <div className="lg:col-span-1"><SuperAdminEditorLandingPreview data={data} /></div>
        </div>
    </div>
  );
}
