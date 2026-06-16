'use client';

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/ui/form";
import { useToast } from "../../../hooks/use-toast";
import { ToastAction } from "../../../components/ui/toast";
import { useAuth, useUser, useFirestore, initiateEmailSignUp } from "../../../firebase";
import { useEffect, useState, Suspense } from "react";
import { doc, setDoc, writeBatch, getDoc, Timestamp, collection } from 'firebase/firestore';
import type { Business } from '../../../models/business';
import type { User as AppUser } from "../../../models/user";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import type { LandingPageData, NavLink } from "../../../models/landing-page";
import type { PaymentSettings } from "../../../models/payment-settings";
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Subscription } from "../../../models/subscription";
import { STRIPE_PRICE_IDS } from "../../../lib/stripe";
import type { HybridPlan } from "../../../models/hybrid-plan";

const registerSchema = z.object({
  name: z.string().min(1, { message: "Por favor, introduce tu nombre." }),
  email: z.string().email({ message: "Por favor, introduce un correo electrónico válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

const initialLandingPageData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '<p>En <strong>PS-USER</strong>, combinamos innovación, estrategia y tecnología para impulsar la transformación digital de tu negocio. Desarrollamos soluciones inteligentes en software, automatización, inteligencia artificial y presencia digital que optimizan tus procesos y potencian tus resultados. Nuestro equipo experto te acompaña en cada paso, desde la planificación hasta la implementación, garantizando eficiencia, seguridad y crecimiento sostenible. Conviértete en una empresa más ágil, competitiva y conectada con el futuro. <strong>PS-USER</strong>, tu aliado tecnológico para alcanzar el éxito en la era digital.</p>',
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
  seo: {
    title: 'Mi Negocio | Soluciones Innovadoras',
    description: 'Ofrecemos soluciones innovadoras para impulsar tu negocio al siguiente nivel.',
    keywords: ['innovación', 'tecnología', 'negocio'],
  },
  form: {
    fields: [
        { id: uuidv4(), label: 'Nombre Completo', type: 'text', placeholder: 'ej. Juan Pérez', required: true },
        { id: uuidv4(), label: 'Correo Electrónico', type: 'email', placeholder: 'ej. juan.perez@correo.com', required: true },
        { id: uuidv4(), label: 'WhatsApp', type: 'tel', placeholder: 'ej. 3001234567', required: false },
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
      email: 'contacto@empresa.com',
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
    },
  });

  async function onSubmit(values: z.infer<typeof registerSchema>) {
    if (!auth || !firestore) return;
    
    try {
      const userCredential = await initiateEmailSignUp(auth, values.email, values.password);
      const newUser = userCredential.user;
      
      const batch = writeBatch(firestore);

      // CRÍTICO: Todo usuario que se registra desde el formulario público es un cliente_admin
      const userRole: 'cliente_admin' = 'cliente_admin';

      const userDocRef = doc(firestore, 'users', newUser.uid);
      const userData: AppUser = {
        id: newUser.uid,
        name: values.name,
        email: values.email,
        role: userRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      batch.set(userDocRef, userData);
      
      const businessDocRef = doc(firestore, 'businesses', newUser.uid);
      const businessData: Business = {
        id: newUser.uid,
        name: `${values.name}'s Business`,
        ownerName: values.name,
        ownerEmail: values.email,
        status: 'active',
        logoURL: 'https://seeklogo.com/images/E/eco-friendly-logo-7087A22106-seeklogo.com.png',
        description: 'Bienvenido a mi negocio en Negocio V03.',
      };
      batch.set(businessDocRef, businessData);

      const configRef = doc(firestore, 'globalConfig', 'system');
      const configSnap = await getDoc(configRef);

      if (!configSnap.exists() || !configSnap.data().mainBusinessId) {
        batch.set(configRef, { mainBusinessId: newUser.uid }, { merge: true });
      }

      const defaultModulesForNewUser: { id: string, name: string, description: string }[] = [
        { id: 'catalogo', name: 'Catálogo', description: 'Módulo para gestionar el catálogo de productos.' },
        { id: 'blog', name: 'Blog', description: 'Módulo para gestionar el blog.' },
      ];
      
      defaultModulesForNewUser.forEach(mod => {
          const moduleRef = doc(firestore, `businesses/${newUser.uid}/modules`, mod.id);
          batch.set(moduleRef, { 
              id: mod.id, 
              name: mod.name,
              description: mod.description,
              status: 'active',
              createdAt: new Date().toISOString() 
          });
      });

      const landingPageDocRef = doc(firestore, 'businesses', newUser.uid, 'landingPages', 'main');
      
      const dynamicLinks: NavLink[] = [
        { id: uuidv4(), text: 'Inicio', url: `/landing/${newUser.uid}`, openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Servicios', url: `#servicios`, openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Contacto', url: '/contact', openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Catálogo', url: `/catalog/${newUser.uid}`, openInNewTab: false, enabled: true },
        { id: uuidv4(), text: 'Blog', url: '/blog', openInNewTab: false, enabled: true },
      ];

      batch.set(landingPageDocRef, {
        ...initialLandingPageData,
        navigation: { 
          ...initialLandingPageData.navigation, 
          businessName: businessData.name,
          links: dynamicLinks
        },
        header: { ...initialLandingPageData.header, businessInfo: { ...initialLandingPageData.header.businessInfo, name: businessData.name, email: newUser.email || 'info@tunegocio.com' }},
        form: { ...initialLandingPageData.form, destinationEmail: newUser.email || '' },
        footer: { ...initialLandingPageData.footer, contactInfo: { ...initialLandingPageData.footer.contactInfo, email: newUser.email || 'info@tunegocio.com' }, copyright: { ...initialLandingPageData.footer.copyright, companyName: businessData.name }},
      });

      const paymentSettingsDocRef = doc(firestore, 'paymentSettings', newUser.uid);
      const paymentSettingsData: PaymentSettings = { id: newUser.uid, userId: newUser.uid, ...initialPaymentSettings };
      batch.set(paymentSettingsDocRef, paymentSettingsData);
      
      const planParam = searchParams.get('plan');
      const subscriptionDocRef = doc(firestore, `businesses/${newUser.uid}/subscription`, 'current');
      
      if (planParam && planParam !== 'free') {
        const upperPlanId = planParam.toUpperCase() as keyof typeof STRIPE_PRICE_IDS;
        const stripePriceId = STRIPE_PRICE_IDS[upperPlanId];
        
        if (stripePriceId && !stripePriceId.includes('placeholder')) {
            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId: stripePriceId, businessId: newUser.uid, userId: newUser.uid, email: newUser.email }),
            });
            const session = await response.json();
            if (session.url) {
                await batch.commit();
                window.location.href = session.url;
                return;
            }
        }

        const hybridPlanSnap = await getDoc(doc(firestore, 'hybrid_plans', planParam));
        if (hybridPlanSnap.exists()) {
            const hybridPlanData = hybridPlanSnap.data() as HybridPlan;
            const now = Timestamp.now();
            const hybridSubscription: Subscription = {
                plan: planParam, // GUARDAR EL ID (SLUG) PARA QUE EL HOOK LO ENCUENTRE
                status: 'active',
                stripeCustomerId: null,
                stripeSubscriptionId: null,
                currentPeriodEnd: null,
                createdAt: now,
                updatedAt: now,
                paymentMethod: 'manual'
            };
            batch.set(subscriptionDocRef, hybridSubscription);
            batch.update(businessDocRef, { planName: hybridPlanData.name });
            
            await batch.commit();
            toast({
                title: "Cuenta Creada con Plan Híbrido",
                description: `Bienvenido. Se ha activado el plan ${hybridPlanData.name}.`,
            });
            return;
        }
      }

      const now = Timestamp.now();
      const freeSubscription: Subscription = {
        plan: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        createdAt: now,
        updatedAt: now,
      };
      batch.set(subscriptionDocRef, freeSubscription);
      await batch.commit();
      
      toast({
          title: "Cuenta Creada con Éxito",
          description: `Se te ha asignado el rol de Administrador.`,
      });
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({
          variant: "destructive",
          title: "Este correo electrónico ya está registrado.",
          description: "Por favor, intenta con otro correo o inicia sesión.",
          action: (
            <ToastAction asChild altText="Iniciar Sesión">
              <Link href="/login">Iniciar Sesión</Link>
            </ToastAction>
          ),
        });
      } else {
        console.error("An unexpected error occurred during registration:", error);
        toast({
          variant: "destructive",
          title: "Error al Registrarse",
          description: error.message || "No se pudo completar el registro. Inténtalo de nuevo.",
        });
      }
    }
  }

  if (isUserLoading) {
    return <LoadingScreen />;
  }

  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-headline">Crear una Cuenta</CardTitle>
        <CardDescription>
          Ingresa tus datos para crear el perfil de tu negocio.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu Nombre Completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="nombre@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-auto p-1 text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      </span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
             <div className="text-sm text-muted-foreground">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="underline text-primary hover:text-primary/80">
                Inicia sesión aquí
              </Link>
              .
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