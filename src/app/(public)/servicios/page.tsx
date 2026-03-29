
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import type { LandingPageData } from "@/models/landing-page";
import { Users, DollarSign, FileClock, Bot, BarChart, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

// Initialize Firebase for server-side fetching
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Data fetching function for header
async function getHeaderData(): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    try {
        const configSnap = await getDoc(doc(db, "globalConfig", "system"));
        const mainBusinessId = configSnap.exists() ? configSnap.data().mainBusinessId : null;

        if (!mainBusinessId) {
            return { businessId: null, navigation: null };
        }

        const landingSnap = await getDoc(doc(db, "businesses", mainBusinessId, "landingPages", "main"));
        const navigation = landingSnap.exists() ? (landingSnap.data() as LandingPageData).navigation : null;
        
        return { businessId: mainBusinessId, navigation };
    } catch (error) {
        console.error("Error fetching header data:", error);
        return { businessId: null, navigation: null };
    }
}

const services = [
    {
        icon: Users,
        title: "Gestión Inteligente de Clientes (CRM)",
        description: "Centraliza toda la información de tus clientes en un solo lugar. Entiende su comportamiento, anticipa sus necesidades y construye relaciones duraderas.",
        benefits: ["Visión 360° del cliente", "Segmentación para marketing preciso", "Seguimiento de interacciones", "Aumento de la retención"]
    },
    {
        icon: DollarSign,
        title: "Control Total de Ventas (POS)",
        description: "Un punto de venta rápido, intuitivo y conectado a tu inventario. Gestiona ventas en tienda física o en línea sin complicaciones y en tiempo real.",
        benefits: ["Proceso de cobro ágil", "Sincronización de stock automática", "Múltiples métodos de pago", "Historial de ventas detallado"]
    },
    {
        icon: FileClock,
        title: "Facturación Automatizada",
        description: "Genera y envía facturas profesionales en segundos. Olvídate de los procesos manuales, cumple con la normativa y dale a tu negocio una imagen impecable.",
        benefits: ["Ahorra horas de trabajo administrativo", "Facturas personalizadas con tu logo", "Cumplimiento normativo fácil", "Recordatorios de pago automáticos"]
    },
    {
        icon: Bot,
        title: "Automatización de Tareas",
        description: "Deja que Zentry trabaje por ti. Automatiza desde el seguimiento de prospectos hasta la gestión de inventario, liberando tu tiempo para hacer crecer tu negocio.",
        benefits: ["Reduce errores humanos", "Optimiza flujos de trabajo", "Mejora la eficiencia operativa", "Escala sin aumentar tu carga de trabajo"]
    },
    {
        icon: BarChart,
        title: "Reportes y Analítica Avanzada",
        description: "Toma decisiones basadas en datos, no en intuición. Zentry transforma tus operaciones en gráficos y reportes fáciles de entender para que veas lo que realmente importa.",
        benefits: ["Visualiza tus KPIs en tiempo real", "Identifica tendencias y oportunidades", "Entiende la rentabilidad de tus productos", "Optimiza tus estrategias de venta"]
    },
    {
        icon: LinkIcon,
        title: "Integraciones Sin Límites",
        description: "Conecta Zentry con las herramientas que ya amas. Desde pasarelas de pago hasta plataformas de marketing, nuestra arquitectura te permite crear un ecosistema unificado.",
        benefits: ["Centraliza tu operación", "Evita la duplicación de datos", "Flujo de información sin fricciones", "Amplía la funcionalidad a tu medida"]
    }
];

export default async function ServicesPage() {
    const { businessId, navigation } = await getHeaderData();
    
    return (
        <div className="w-full bg-gray-50 text-gray-800">
            <Header businessId={businessId} navigation={navigation} />

            {/* Hero Section */}
            <section className="bg-white text-center py-20 md:py-28">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">Tu negocio, más simple. Tu crecimiento, imparable.</h1>
                    <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                        Zentry es la plataforma todo-en-uno que centraliza, automatiza y potencia cada aspecto de tu operación. Menos caos, más control.
                    </p>
                    <div className="mt-8">
                        <Button size="lg" asChild>
                            <Link href="/register">Empieza Gratis</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Una plataforma, todas las herramientas</h2>
                        <p className="mt-4 text-lg text-gray-600">Desde la primera venta hasta la expansión global, Zentry te acompaña con funcionalidades diseñadas para escalar.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service, index) => (
                            <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
                                <CardHeader>
                                    <div className="bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
                                        <service.icon className="h-6 w-6" />
                                    </div>
                                    <CardTitle>{service.title}</CardTitle>
                                    <CardDescription>{service.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2 text-sm">
                                        {service.benefits.map((benefit, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check className="h-4 w-4 text-green-500 shrink-0 mt-1" />
                                                <span className="text-gray-600">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="bg-primary text-white">
                <div className="container mx-auto px-4 py-20 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Listo para simplificar tu éxito</h2>
                    <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                        Únete a miles de negocios que ya están creciendo de forma más inteligente con Zentry.
                    </p>
                    <Button size="lg" variant="secondary" asChild>
                        <Link href="/register">Empieza a Crecer Ahora</Link>
                    </Button>
                </div>
            </section>

            <Footer />
        </div>
    );
}
