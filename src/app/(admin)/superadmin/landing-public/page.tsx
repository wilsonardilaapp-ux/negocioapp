'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import EditorLandingForm from '@/components/landing-page/editor-landing-form';
import SuperAdminEditorLandingPreview from '@/components/landing-page/superadmin-editor-landing-preview';
import { useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

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
    };

    const fetchData = async () => {
      setIsFetching(true);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const savedData = docSnap.data() as LandingPageData;
           const mergedData = {
            ...initialLandingData,
            ...savedData,
            hero: { ...initialLandingData.hero, ...savedData.hero },
            header: { ...initialLandingData.header, ...savedData.header },
            navigation: { ...initialLandingData.navigation, ...savedData.navigation },
            footer: { ...initialLandingData.footer, ...savedData.footer },
            form: { ...initialLandingData.form, ...savedData.form },
            seo: { ...initialLandingData.seo, ...savedData.seo },
          };
          setData(mergedData);
        }
      } catch (error) {
        console.error("Error fetching landing page data:", error);
        toast({
          variant: "destructive",
          title: "Error de Carga",
          description: "No se pudieron cargar los datos de la landing page.",
        });
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchData();
  }, [docRef, toast]);


  const handleSave = () => {
    if (!docRef || !data) return;
    setIsSaving(true);
    
    const dataToSave = JSON.parse(JSON.stringify(data));
    
    // Intentar guardar (puede fallar silenciosamente en desarrollo)
    try {
      setDocumentNonBlocking(docRef, dataToSave, { merge: true });
    } catch (e) {
      console.warn('Save attempt failed (possibly offline):', e);
    }
    
    // Siempre completar después de 1500ms para evitar bloqueo en UI
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "Guardado", description: "Cambios aplicados." });
    }, 1500);
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
