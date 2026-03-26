'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Loader2 } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import EditorLandingForm from '@/components/landing-page/editor-landing-form';
import EditorLandingPreview from '@/components/landing-page/editor-landing-preview';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const initialLandingData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '',
    imageUrl: '', 
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

export default function LandingPageBuilder() {
  const [data, setData] = useState<LandingPageData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const docRef = useMemoFirebase(() => user ? doc(firestore!, 'businesses', user.uid, 'landingPages', 'main') : null, [firestore, user]);
  const { data: savedData, isLoading } = useDoc<LandingPageData>(docRef);

  useEffect(() => {
    if (savedData) {
      const mergedData = {
        ...initialLandingData,
        ...savedData,
        hero: { ...initialLandingData.hero, ...savedData.hero },
        header: { ...initialLandingData.header, ...savedData.header },
        navigation: { ...initialLandingData.navigation, ...savedData.navigation },
        footer: { ...initialLandingData.footer, ...savedData.footer },
      };
      setData(mergedData);
    } else if (!isLoading) {
      setData(initialLandingData);
    }
  }, [savedData, isLoading]);

  const handleSave = () => {
    if (!docRef || !data) return;
    setIsSaving(true);
    
    const dataToSave = JSON.parse(JSON.stringify(data));

    if (!dataToSave.hero.imageUrl || dataToSave.hero.imageUrl.trim() === '') {
      delete dataToSave.hero.imageUrl;
    }
    
    console.log('[handleSave] Datos a guardar en Firestore:', dataToSave);

    setDocumentNonBlocking(docRef, dataToSave, { merge: true });
    
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "Guardado", description: "Cambios aplicados." });
    }, 1000);
  };
  
  if (isLoading || !data) return (
    <div className="flex justify-center items-center h-full">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
        <Card className="p-6 flex justify-between items-center bg-white shadow-sm border-none">
            <div>
                <CardTitle className="text-2xl font-bold">Constructor de Landing Page</CardTitle>
                <CardDescription>Sincronización estabilizada y base de datos limpia.</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary text-white font-bold px-8 shadow-md">
                <Save className="mr-2 h-4 w-4" /> Guardar Todo
            </Button>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><EditorLandingForm data={data} setData={setData as any} /></div>
            <div className="lg:col-span-1"><EditorLandingPreview data={data} /></div>
        </div>
    </div>
  );
}
