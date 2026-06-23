
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
import { ToastAction } from "@/components/ui/toast";
import { useAuth, useUser, useFirestore, initiateEmailSignUp } from "@/firebase";
import { SUPER_ADMIN_EMAILS } from "@/firebase/auth/use-user";
import { useEffect, useState, Suspense } from "react";
import { doc, setDoc, writeBatch, getDoc, Timestamp, collection } from 'firebase/firestore';
import type { Business } from '@/models/business';
import type { User as AppUser } from "@/models/user";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import type { LandingPageData, NavLink } from "@/models/landing-page";
import type { PaymentSettings } from "@/models/payment-settings";
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
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
    additionalContent: '<p>En <strong>Zentry</strong>, combinamos innovación, estrategia y tecnología para impulsar la transformación digital de tu negocio. Desarrollamos soluciones inteligentes en software, automatización, inteligencia artificial y presencia digital que optimizan tus procesos y potencian tus resultados. Nuestro equipo experto te acompaña en cada paso, desde la planificación hasta la implementación, garantizando eficiencia, seguridad y crecimiento sostenible. Conviértete en una empresa más ágil, competitiva y conectada con el futuro. <strong>Zentry</strong>, tu aliado tecnológico para alcanzar el éxito en la era digital.</p>',
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
    links: [
      { id: uuidv4(), text: 'Inicio', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Servicios', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Contacto', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Catálogo', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Blog', url: '#', openInNewTab: false, enabled: true },
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
  plans: [],
  seo: {
    title: 'Mi Negocio | Soluciones Innovadoras',
    description: 'Ofrecemos soluciones innovadoras para impulsar tu negocio al siguiente nivel.',
    keywords: ['innovación', 'tecnología', 'negocio'],
  },
  form: {
    fields: [
        { id: uuidv4(), label: 'Nombre Completo', type: 'text', placeholder: 'ej. Juan Pérez', required: true },
        { id: uuidv4(), label: 'Correo Electrónico', type: 'email', placeholder: 'ej. juan.perez@correo.com', required: true },
        { id: uuidv4(), label: 'WhatsApp', type: 'tel', placeholder: 'ej. 300 123 4567', required: false },
        { id: uuidv4(), label: 'Mensaje', type: 'textarea', placeholder: 'Escribe tu consulta aquí...', required: true },
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
      phone: '3228831634',
      email: 'info@tunegocio.com',
    },
    socialLinks: {
      tiktok: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      twitter: '',
      youtube: '',
    },
    carouselItems: [
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
    ],
  },
  footer: {
    enabled: true,
    contactInfo: {
      address: 'Calle Falsa 123, Ciudad, País',
      phone: '3228831634',
      email: 'CONTACTO@PENDIENTE-DEFINIR.com',
      hours: 'Lunes a Viernes, 9am - 6pm',
    },
    quickLinks: [
      { id: uuidv4(), text: 'Inicio', url: '#' },
      { id: uuidv4(), text: 'Sobre nosotros', url: '#' },
      { id: uuidv4(), text: 'Servicios', url: '#' },
      { id: uuidv4(), text: 'Blog', url: '#' },
      { id: uuidv4(), text: 'Contacto', url: '#' },
      { id: uuidv4(), text: 'FAQ', url: '#' },
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
      companyName: 'Zentry',
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
  const { user, isUserLoading } = useUser();
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

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    if (!auth || !firestore) return;
    
    // Normalización estricta del correo
    const normalizedEmail = values.email.toLowerCase().trim();

    try {
      const clientIp = await getClientIp();
      const planParam = searchParams.get('plan');
      let planDetails: SubscriptionPlan | HybridPlan | null = null;
      let modulesToActivate: string[] = ['catalogo', 'blog']; 

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

          if (planDetails && planDetails.includedModuleKeys) {
              modulesToActivate = [...new Set([...modulesToActivate, ...planDetails.includedModuleKeys])];
          }
      }

      // Registro en Firebase Auth con correo normalizado
      const userCredential = await initiateEmailSignUp(auth, normalizedEmail, values.password);
      const newUser = userCredential.user;
      
      const batch = writeBatch(firestore);
      const nowISO = new Date().toISOString();
      const nowTimestamp = Timestamp.now();

      // Determinar rol administrativo basándose en la lista blanca
      const isAdmin = SUPER_ADMIN_EMAILS.includes(normalizedEmail);

      const userDocRef = doc(firestore, 'users', newUser.uid);
      const userData: AppUser = {
        id: newUser.uid,
        name: values.name,
        email: normalizedEmail,
        role: isAdmin ? 'super_admin' : 'cliente_admin',
        status: 'active',
        createdAt: nowISO,
        lastLogin: nowISO,
        // Metadatos legales
        // @ts-ignore
        legalAcceptance: {
          termsAccepted: true,
          feesAuthorized: true,
          acceptedAt: nowISO,
          ip: clientIp,
          version: '1.0'
        }
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
        description: 'Bienvenido a mi negocio en Zentry.',
        planName: planDetails?.name || 'Plan Gratuito',
      };
      batch.set(businessDocRef, businessData);

      modulesToActivate.forEach(modId => {
          const moduleRef = doc(firestore, `businesses/${newUser.uid}/modules`, modId);
          batch.set(moduleRef, { 
              id: modId, 
              status: 'active',
              createdAt: nowISO 
          });
      });

      const landingPageDocRef = doc(firestore, 'businesses', newUser.uid, 'landingPages', 'main');
      const dynamicLinks: NavLink[] = [
        { id: uuidv4(), text: 'Inicio', url: `/landing/${newUser.uid}`, openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Catálogo', url: `/catalog/${newUser.uid}`, openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Blog', url: `/blog/${newUser.uid}`, openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Contacto', url: `/contacto-cliente/${newUser.uid}`, openInNewTab: false, enabled: true },
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
        plans: [],
      });

      const paymentSettingsDocRef = doc(firestore, 'paymentSettings', newUser.uid);
      batch.set(paymentSettingsDocRef, { id: newUser.uid, userId: newUser.uid, ...initialPaymentSettings });
      
      const subscriptionDocRef = doc(firestore, `businesses/${newUser.uid}/subscription`, 'current');
      const subscriptionData: Subscription = {
        plan: planParam || 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      };
      batch.set(subscriptionDocRef, subscriptionData);

      await batch.commit();

      toast({
          title: "Cuenta Creada con Éxito",
          description: `Bienvenido a Zentry. Tu entorno ha sido configurado.`,
      });
      
      // La redirección a /superadmin o /dashboard se manejará automáticamente por useUser tras el commit exitoso
      
    } catch (error: any) {
      console.error("Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: "destructive",
          title: "Email ya registrado",
          description: "Por favor, inicia sesión.",
          action: <ToastAction asChild altText="Login"><Link href="/login">Iniciar Sesión</Link></ToastAction>,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error al Registrarse",
          description: error.message || "No se pudo completar el registro.",
        });
      }
    }
  }

  if (isUserLoading) return <LoadingScreen />;

  return (
    <Card className="shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-headline font-bold text-primary">Crea tu Cuenta</CardTitle>
        <CardDescription>Únete a Zentry y escala tu negocio hoy mismo.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl><Input placeholder="Tu Nombre Completo" {...field} /></FormControl>
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
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-auto p-1 text-muted-foreground" onClick={() => setShowPassword((prev) => !prev)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
            )} />

            <div className="space-y-4 pt-4 border-t">
              <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      He leído y acepto los <Link href="/terminos-y-condiciones" className="text-primary hover:underline font-bold">Términos y Condiciones</Link> y el <Link href="/compromiso-servicio" className="text-primary hover:underline font-bold">Compromiso de Servicio</Link>.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )} />

              <FormField control={form.control} name="acceptFees" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Autorizo a <strong>Zentry</strong> a cobrar la comisión según el plan contratado y a suspender el servicio en caso de incumplimiento de pago. <Link href="/politica-cobro" className="text-primary hover:underline text-xs">(Ver política)</Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full h-12 text-lg font-bold" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 animate-spin"/> Preparando entorno...</> : "Crear Cuenta Zentry"}
            </Button>
             <div className="text-sm text-muted-foreground text-center">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="underline text-primary font-bold hover:text-primary/80">Inicia sesión aquí</Link>.
            </div>
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
