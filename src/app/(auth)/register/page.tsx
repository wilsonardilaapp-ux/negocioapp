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
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth, useUser, useFirestore, initiateEmailSignUp } from "@/firebase";
import { useEffect, useState } from "react";
import { doc, setDoc, writeBatch, getDoc, Timestamp, collection } from 'firebase/firestore';
import type { Business } from '@/models/business';
import type { User as AppUser } from "@/models/user";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";
import type { LandingPageData, NavLink } from "@/models/landing-page";
import type { PaymentSettings } from "@/models/payment-settings";
import type { Module } from "@/models/module";
import type { SystemService } from "@/models/system-service";
import type { KnowledgeDocument } from "@/models/chatbot-config";
import { isFirstUser } from '@/actions/user';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Subscription } from "@/models/subscription";
import { STRIPE_PRICE_IDS } from "@/lib/stripe";

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
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
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

const initialPaymentSettings: Omit<PaymentSettings, 'id' | 'userId'> = {
  nequi: { enabled: false, qrImageUrl: null, accountNumber: "", holderName: "" },
  bancolombia: { enabled: false, qrImageUrl: null, accountNumber: "", holderName: "" },
  daviplata: { enabled: false, qrImageUrl: null, accountNumber: "", holderName: "" },
  breB: { enabled: false, holderName: "", keyType: "Celular", keyValue: "", commerceCode: "", qrImageUrl: null },
  pagoContraEntrega: { enabled: false },
};

const slugify = (text: string) => 
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
    
const LoadingScreen = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
);

export default function RegisterPage() {
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

      const isFirst = await isFirstUser();
      const userRole = isFirst ? 'super_admin' : 'cliente_admin';

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

      // **INICIO DE LA CORRECCIÓN**
      // Asignar módulos por defecto a CUALQUIER usuario nuevo.
      const defaultModulesForNewUser = ['catalogo', 'blog'];
      defaultModulesForNewUser.forEach(moduleId => {
          const moduleRef = doc(firestore, `businesses/${newUser.uid}/modules`, moduleId);
          // Creamos el documento con status 'active' para que sea visible.
          batch.set(moduleRef, { status: 'active', id: moduleId, name: moduleId });
      });
      // **FIN DE LA CORRECCIÓN**
      
      // Solo el primer usuario inicializa las configuraciones globales.
      if (isFirst) {
        const defaultModules: Omit<Module, 'id'>[] = [
          { name: 'Catálogo', description: 'Módulo para gestionar el catálogo de productos.', status: 'inactive', createdAt: new Date().toISOString() },
          { name: 'Blog', description: 'Módulo para gestionar el blog', status: 'inactive', createdAt: new Date().toISOString() },
          { name: 'Chatbot Integrado con WhatsApp', description: 'Asistente IA para WhatsApp y Web', status: 'inactive', createdAt: new Date().toISOString() },
          { name: 'WHAPI (WhatsApp)', description: 'Integración con WHAPI para enviar mensajes de WhatsApp.', status: 'inactive', createdAt: new Date().toISOString() },
          { name: 'Motor de Sugerencias Inteligentes', description: 'Motor para sugerir productos', status: 'inactive', createdAt: new Date().toISOString() },
          { name: 'Google Analytics', description: 'Integración con Google Analytics', status: 'inactive', createdAt: new Date().toISOString() },
          { name: 'Cloudinary', description: 'Almacenamiento de medios en la nube', status: 'inactive', createdAt: new Date().toISOString() },
        ];
        
        defaultModules.forEach(mod => {
            let modId = slugify(mod.name);
            if (mod.name.toLowerCase().includes('catálogo')) {
                modId = 'catalogo';
            } else if (mod.name.includes('Blog')) {
              modId = 'blog';
            } else if (mod.name.includes('Chatbot')) {
              modId = 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas';
            } else if (mod.name.includes('Sugerencias')) {
              modId = 'motor-de-sugerencias-inteligentes';
            } else if (mod.name.includes('Google Analytics')) {
              modId = 'google-analytics';
            } else if (mod.name === 'Cloudinary') {
              modId = 'cloudinary';
            }
            const modRef = doc(firestore, 'modules', modId);
            batch.set(modRef, { ...mod, id: modId }, { merge: true });
        });
        
        const REQUIRED_INTEGRATIONS: Array<{ id: string; name: string }> = [
          { id: 'cloudinary', name: 'Cloudinary' },
          { id: 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas', name: 'Chatbot IA (Google/OpenAI/Groq)' },
          { id: 'whapi-whatsapp', name: 'WHAPI (WhatsApp)' },
        ];

        REQUIRED_INTEGRATIONS.forEach(int => {
            const intRef = doc(firestore, 'integrations', int.id);
            batch.set(intRef, {
                id: int.id,
                name: int.name,
                fields: '{}',
                status: 'inactive',
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        });

        const productLimitServiceRef = doc(firestore, 'systemServices', 'product_limit');
        const productLimitData: SystemService = { id: 'product_limit', name: 'Limite de Productos', status: 'active', limit: 10, lastUpdate: new Date().toISOString() };
        batch.set(productLimitServiceRef, productLimitData, { merge: true });
      }

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
      
      const coffeeOfferRef = doc(firestore, 'businesses', newUser.uid, 'chatbotConfig', 'main', 'knowledgeBase', 'oferta-cafe-arandanos');
      const coffeeOfferData: Omit<KnowledgeDocument, 'id'> = {
        fileName: "Oferta Especial: Café de Arándanos",
        fileType: "text/manual",
        status: "ready",
        createdAt: new Date().toISOString(),
        content: `
          ¡Descubre nuestro exclusivo Café de Arándanos! Una bebida única que combina lo mejor del café orgánico con el poder antioxidante de los arándanos.

          **Beneficios:**
          - Rico en antioxidantes que combaten el envejecimiento celular.
          - Ayuda a mejorar la memoria y la función cognitiva.
          - Contribuye a la salud del tracto urinario.
          - Aporta energía natural sin los nervios del café tradicional.

          **Preparación:**
          Disfrútalo caliente o frío. Simplemente mezcla una cucharada en agua o leche de tu preferencia.

          **Oferta por tiempo limitado:**
          Lleva un frasco por $35.000 o dos por $60.000.
        `,
        isManual: true,
        fileUrl: "https://res.cloudinary.com/dazt6g3o1/image/upload/v1717349882/w5j8ot00m5fg0f0r0t8z.jpg"
      };
      batch.set(coffeeOfferRef, coffeeOfferData);

      // Lógica de suscripción
      const planId = searchParams.get('plan') as 'free' | 'pro' | 'enterprise' | null;
      const subscriptionDocRef = doc(firestore, 'businesses', newUser.uid, 'subscription', 'current');
      
      if (planId && planId !== 'free') {
        const upperPlanId = planId.toUpperCase() as keyof typeof STRIPE_PRICE_IDS;
        const priceId = STRIPE_PRICE_IDS[upperPlanId];
        
        if (!priceId || priceId.includes('placeholder')) {
            toast({
                variant: "destructive",
                title: "Error de Configuración",
                description: `El plan '${planId}' no está configurado correctamente para pagos. Contacta al soporte.`,
            });
            throw new Error("Stripe Price ID no configurado.");
        }

        const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priceId, businessId: newUser.uid, userId: newUser.uid, email: newUser.email }),
        });
        const session = await response.json();
        if (session.url) {
            await batch.commit();
            window.location.href = session.url;
        } else {
            throw new Error('No se pudo crear la sesión de checkout.');
        }

      } else {
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
            description: `Se te ha asignado el rol de ${userRole.replace('_', ' ')}. Serás redirigido...`,
        });
      }
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log("Info: Registration attempt with an existing email.", values.email);
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

  // If Firebase is checking the auth state, show a loading screen.
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
