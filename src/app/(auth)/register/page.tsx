'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore, initiateEmailSignUp } from "@/firebase";
import { SUPER_ADMIN_EMAILS } from "@/firebase/auth/use-user";
import { useEffect, useState, Suspense, useCallback } from "react";
import { doc, writeBatch, getDoc, Timestamp, collection, query, where, getDocs, limit, type Firestore } from 'firebase/firestore';
import type { Business } from '@/models/business';
import type { User as AppUser } from "@/models/user";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import type { LandingPageData, NavLink } from "@/models/landing-page";
import type { PaymentSettings } from "@/models/payment-settings";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Subscription } from "@/models/subscription";
import type { HybridPlan } from "@/models/hybrid-plan";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import { getClientIp } from "@/actions/get-client-ip";

const registerSchema = z.object({
  name: z.string().min(1, { message: "Por favor, introduce tu nombre." }),
  email: z.string().email({ message: "Por favor, introduce un correo electrónico válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Debes aceptar los términos y el compromiso de servicio.",
  }),
  acceptFees: z.boolean().refine(val => val === true, {
    message: "Debes autorizar el cobro de comisiones.",
  }),
});

const initialLandingPageData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '<p>En <strong>Markix</strong>, optimizamos tus procesos y potenciamos tus resultados.</p>',
    imageUrl: 'https://picsum.photos/seed/vintagecar/1200/800',
    ctaButtonText: 'Contáctanos',
    ctaButtonUrl: '#contact',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
  },
  navigation: {
    enabled: true,
    logoUrl: '',
    businessName: 'Mi Negocio',
    logoAlt: 'Logo de Mi Negocio',
    logoWidth: 120,
    logoAlignment: 'left',
    links: [],
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    hoverColor: '#4CAF50',
    fontSize: 16,
    spacing: 4,
    useShadow: true,
  },
  sections: [],
  testimonials: [],
  plans: [],
  seo: {
    title: 'Mi Negocio | Soluciones Innovadoras',
    description: 'Ofrecemos soluciones innovadoras.',
    keywords: ['innovación', 'tecnología', 'negocio'],
  },
  form: {
    fields: [],
    destinationEmail: '',
  },
  header: {
    banner: { mediaUrl: null, mediaType: null },
    businessInfo: { name: 'Tu Negocio', address: '', phone: '' },
    socialLinks: { tiktok: '', instagram: '', facebook: '', whatsapp: '', twitter: '', youtube: '' },
    carouselItems: [],
  },
  footer: {
    enabled: true,
    contactInfo: { address: '', phone: '', email: '', hours: '' },
    quickLinks: [],
    legalLinks: { privacyPolicyUrl: '#', termsAndConditionsUrl: '#', cookiesPolicyUrl: '#', legalNoticeUrl: '#' },
    socialLinks: { facebookUrl: '', instagramUrl: '', tiktokUrl: '', youtubeUrl: '', linkedinUrl: '', showIcons: true },
    logo: { url: null, slogan: '' },
    certifications: [],
    copyright: { companyName: 'Markix', additionalText: 'Todos los derechos reservados.' },
    cta: { text: '¡Empieza Ahora!', url: '#', enabled: false },
    visuals: { backgroundImageUrl: null, opacity: 80, backgroundColor: '#f8f9fa', textColor: '#6c757d', darkMode: false, showBackToTop: true },
    adminExtras: { systemVersion: '1.0.0', supportLink: '#', documentationLink: '#' },
  },
};

const initialPaymentSettings: Omit<PaymentSettings, 'id' | 'userId'> = {
  nequi: { enabled: false, qrImageUrl: null, accountNumber: "", holderName: "" },
  bancolombia: { enabled: false, qrImageUrl: null, accountNumber: "", holderName: "" },
  daviplata: { enabled: false, qrImageUrl: null, accountNumber: "", holderName: "" },
  breB: { enabled: false, holderName: "", keyType: "Celular", keyValue: "", commerceCode: "", qrImageUrl: null },
  pagoContraEntrega: { enabled: false },
};

const LoadingScreen = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
);

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      acceptTerms: false,
      acceptFees: false,
    },
  });

  const generateUniqueReferralCode = useCallback(async (db: Firestore): Promise<string> => {
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = uuidv4().slice(0, 8).toUpperCase();
      const q = query(collection(db, 'businesses'), where('referralCode', '==', code), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) isUnique = true;
    }
    return code;
  } , []);

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    if (!auth || !firestore) return;
    
    const normalizedEmail = values.email.toLowerCase().trim();

    try {
      const clientIp = await getClientIp();
      const planParam = searchParams.get('plan');
      const refCode = searchParams.get('ref');

      let planDetails: SubscriptionPlan | HybridPlan | null = null;

      if (planParam) {
          const standardPlanSnap = await getDoc(doc(firestore, 'plans', planParam));
          if (standardPlanSnap.exists()) {
              planDetails = { ...standardPlanSnap.data(), id: standardPlanSnap.id } as SubscriptionPlan;
          } else {
              const hybridPlanSnap = await getDoc(doc(firestore, 'hybrid_plans', planParam));
              if (hybridPlanSnap.exists()) {
                  planDetails = { ...hybridPlanSnap.data(), id: hybridPlanSnap.id } as HybridPlan;
              }
          }
      }

      // Logic to find referredByBusinessId if ref code is provided
      let referredByBusinessId: string | null = null;
      if (refCode) {
        const refQuery = query(collection(firestore, 'businesses'), where('referralCode', '==', refCode.toUpperCase()), limit(1));
        const refSnap = await getDocs(refQuery);
        if (!refSnap.empty) {
          referredByBusinessId = refSnap.docs[0].id;
        }
      }

      const userCredential = await initiateEmailSignUp(auth, normalizedEmail, values.password);
      const newUser = userCredential.user;
      
      const batch = writeBatch(firestore);
      const nowISO = new Date().toISOString();
      const nowTimestamp = Timestamp.now();

      const isAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);
      const generatedReferralCode = await generateUniqueReferralCode(firestore);

      const userDocRef = doc(firestore, 'users', newUser.uid);
      const userData: AppUser = {
        id: newUser.uid,
        name: values.name,
        email: normalizedEmail,
        role: isAdmin ? 'super_admin' : 'cliente_admin',
        status: 'active',
        createdAt: nowISO,
        lastLogin: nowISO,
      };
      batch.set(userDocRef, userData);
      
      const businessDocRef = doc(firestore, 'businesses', newUser.uid);
      const businessData: Business = {
        id: newUser.uid,
        name: `${values.name}'s Business`,
        ownerName: values.name,
        ownerEmail: normalizedEmail,
        status: 'active',
        logoURL: 'https://seeklogo.com/images/E/eco-friendly-logo-7087A22106-seeklogo.com.png',
        description: 'Bienvenido a mi negocio en Markix.',
        planName: planDetails?.name || 'Plan Crecimiento',
        // --- Referral System ---
        referralCode: generatedReferralCode,
        referredByBusinessId,
        // --- DIRECTORIO AUTOMÁTICO ---
        directoryEnabled: true,
        directoryStatus: 'approved',
        category: 'Otro',
        rating: 5,
        reviewCount: 1,
      };
      batch.set(businessDocRef, businessData);

      // --- LOG DE REFERIDO (FASE 2) ---
      if (referredByBusinessId && refCode) {
        const referralDocRef = doc(collection(firestore, 'referrals'));
        batch.set(referralDocRef, {
          referentBusinessId: referredByBusinessId,
          referreeBusinessId: newUser.uid,
          referralCode: refCode.toUpperCase(),
          createdAt: nowTimestamp,
          status: 'pending_payment',
          paidConfirmedAt: null,
          referentRewardGranted: false,
          referreeRewardGranted: false,
          paymentRail: null,
          origin: 'automatico',
          adminResponsibleId: null,
          manualNote: null
        });
      }

      const landingPageDocRef = doc(firestore, 'businesses', newUser.uid, 'landingPages', 'main');
      const dynamicLinks: NavLink[] = [
        { id: uuidv4(), text: 'Inicio', url: `/landing/${newUser.uid}`, openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Catálogo', url: `/catalog/${newUser.uid}`, openInNewTab: false, enabled: true },
      ];

      batch.set(landingPageDocRef, {
        ...initialLandingPageData,
        navigation: { 
          ...initialLandingPageData.navigation, 
          businessName: businessData.name,
          links: dynamicLinks
        },
        header: { ...initialLandingPageData.header, businessInfo: { ...initialLandingPageData.header.businessInfo, name: businessData.name, email: normalizedEmail }},
        form: { ...initialLandingPageData.form, destinationEmail: normalizedEmail },
        footer: { ...initialLandingPageData.footer, contactInfo: { ...initialLandingPageData.footer.contactInfo, email: normalizedEmail }, copyright: { ...initialLandingPageData.footer.copyright, companyName: businessData.name }},
      });

      const paymentSettingsDocRef = doc(firestore, 'paymentSettings', newUser.uid);
      batch.set(paymentSettingsDocRef, { id: newUser.uid, userId: newUser.uid, ...initialPaymentSettings });
      
      const subscriptionDocRef = doc(firestore, `businesses/${newUser.uid}/subscription`, 'current');
      const subscriptionData: Subscription = {
        plan: planParam || 'plan-crecimiento',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };
      batch.set(subscriptionDocRef, subscriptionData);

      await batch.commit();

      toast({ title: "Cuenta Creada", description: "Tu negocio ha sido aprobado automáticamente para el directorio." });
      router.push(`/dashboard/subscription${planParam ? `?plan=${planParam}` : ''}`);
      
    } catch (error: any) {
      console.error("Registration Error:", error);
      toast({ variant: "destructive", title: "Error al Registrarse", description: error.message });
    }
  }

  return (
    <Card className="shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline font-bold text-primary">Crea tu Cuenta</CardTitle>
        <CardDescription>Únete a Markix y escala tu negocio hoy mismo.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl><Input placeholder="Tu Nombre" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl><Input placeholder="nombre@ejemplo.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                    <FormControl><Input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" {...field} /></FormControl>
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-auto p-1" onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
            )} />
            <div className="space-y-4 pt-4 border-t">
              <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">Acepto términos y condiciones.</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="acceptFees" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">Autorizo el cobro de comisiones.</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full h-12 text-lg font-bold" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Preparando..." : "Crear Cuenta Markix"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <RegisterForm />
        </Suspense>
    );
}