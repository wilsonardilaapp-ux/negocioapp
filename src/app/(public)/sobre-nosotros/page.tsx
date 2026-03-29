
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import type { LandingPageData } from "@/models/landing-page";
import { Users, Target, Zap, Shield, Handshake, TrendingUp } from "lucide-react";
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

export default async function AboutUsPage() {
    const { businessId, navigation } = await getHeaderData();

    const values = [
        {
          icon: Zap,
          title: "Simplicidad Radical",
          description: "Creamos herramientas intuitivas que resuelven problemas complejos sin crear nuevas complicaciones."
        },
        {
          icon: Handshake,
          title: "Confianza Absoluta",
          description: "La seguridad y la integridad de tus datos son el pilar sobre el que construimos cada función."
        },
        {
          icon: TrendingUp,
          title: "Innovación Práctica",
          description: "Nos enfocamos en la innovación que genera resultados reales y tangibles para tu negocio hoy."
        }
    ];

    return (
        <div className="w-full bg-gray-50">
            <Header businessId={businessId} navigation={navigation} />
            
            {/* Hero Section */}
            <section className="bg-white text-center py-20 md:py-32">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">Construyendo el futuro de la gestión empresarial</h1>
                    <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                        En Zentry, creemos que cada negocio, sin importar su tamaño, merece herramientas poderosas que sean increíblemente fáciles de usar. Nuestra pasión es transformar la complejidad en simplicidad.
                    </p>
                </div>
            </section>

            {/* Nuestra Historia */}
            <section className="py-16 md:py-24">
                <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Nuestra Historia</h2>
                        <div className="space-y-4 text-gray-600">
                           <p>Zentry nació de una frustración compartida. Como emprendedores y consultores, vimos a innumerables negocios talentosos ahogarse en un mar de hojas de cálculo, aplicaciones desconectadas y software costoso y complicado. La gestión se había convertido en un obstáculo para el crecimiento, no en un motor.</p>
                           <p>Nos preguntamos: ¿Y si existiera una forma mejor? ¿Una plataforma única, intuitiva y asequible que centralizara todo lo que un negocio necesita para operar y escalar? Con esa pregunta, comenzó nuestra misión. Dejamos nuestros trabajos y nos dedicamos a construir la solución que siempre quisimos tener.</p>
                        </div>
                    </div>
                     <div className="bg-white p-8 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Misión</h3>
                        <p className="text-gray-600 mb-6">Simplificar radicalmente la gestión empresarial para que los dueños de negocios puedan enfocarse en lo que realmente aman: crecer y servir a sus clientes.</p>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Visión</h3>
                        <p className="text-gray-600">Ser la plataforma operativa central para un millón de negocios en crecimiento en todo el mundo, impulsando su éxito a través de la tecnología y la simplicidad.</p>
                    </div>
                </div>
            </section>

            {/* Valores */}
            <section className="bg-white py-16 md:py-24">
                 <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold text-gray-800 mb-12">Nuestros Valores</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {values.map(value => (
                            <div key={value.title} className="flex flex-col items-center">
                                <div className="bg-primary/10 text-primary p-4 rounded-full mb-4">
                                    <value.icon className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-gray-900">{value.title}</h3>
                                <p className="text-gray-600">{value.description}</p>
                            </div>
                       ))}
                    </div>
                </div>
            </section>
            
            {/* CTA Section */}
            <section className="py-20 md:py-32 bg-gray-800 text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Únete a la revolución de la gestión simple</h2>
                    <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">Deja de luchar con las herramientas y empieza a construir el futuro de tu negocio.</p>
                    <Button size="lg" asChild>
                        <Link href="/register">Empieza ahora</Link>
                    </Button>
                </div>
            </section>

            <Footer />
        </div>
    );
}
