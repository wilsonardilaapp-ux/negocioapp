import { getAdminFirestore } from "@/firebase/server-init";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import type { LandingPageData } from "@/models/landing-page";

async function getHeaderData(): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;

        if (!mainBusinessId) return { businessId: null, navigation: null };

        const landingSnap = await db.collection("businesses").doc(mainBusinessId).collection("landingPages").doc("main").get();
        const navigation = landingSnap.exists ? (landingSnap.data() as LandingPageData).navigation : null;
        
        return { businessId: mainBusinessId, navigation };
    } catch (error) {
        return { businessId: null, navigation: null };
    }
}

export default async function ServiceCommitmentPage() {
    const { businessId, navigation } = await getHeaderData();

    return (
        <div className="w-full bg-background">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16 md:py-24">
                <Card className="max-w-4xl mx-auto shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl md:text-4xl font-bold text-primary">Compromiso de Servicio Markix</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-lg max-w-none text-justify">
                        <p className="lead">En <strong>Markix</strong>, nuestra misión es empoderar a los negocios mediante tecnología de vanguardia y una operatividad simplificada. Este documento establece los niveles de servicio y el compromiso que adquirimos con cada uno de nuestros clientes.</p>

                        <h2>1. Disponibilidad de la Plataforma (Uptime)</h2>
                        <p>Nos comprometemos a mantener una disponibilidad del 99.9% en nuestra infraestructura central. Esto incluye el acceso a tu dashboard administrativo y la visualización de tus landing pages públicas y catálogos.</p>

                        <h2>2. Soporte Técnico</h2>
                        <p>Ofrecemos diferentes niveles de soporte según tu plan contratado:</p>
                        <ul>
                            <li><strong>Planes Gratuitos:</strong> Soporte vía documentación y centro de ayuda.</li>
                            <li><strong>Planes Pro:</strong> Soporte prioritario vía ticket con respuesta en menos de 24 horas hábiles.</li>
                            <li><strong>Planes Enterprise:</strong> Soporte dedicado con canal directo de comunicación.</li>
                        </ul>

                        <h2>3. Seguridad y Respaldo de Datos</h2>
                        <p>Tus datos son tu activo más valioso. Markix implementa respaldos diarios automáticos y utiliza cifrado de grado bancario para proteger la información de tus clientes y transacciones.</p>

                        <h2>4. Actualizaciones y Mejoras</h2>
                        <p>Markix es una plataforma viva. Como parte de nuestro compromiso, recibirás actualizaciones constantes de seguridad y nuevas funcionalidades sin costo adicional, asegurando que tu negocio siempre esté a la vanguardia tecnológica.</p>

                        <p className="text-sm text-muted-foreground pt-4">Versión 1.0 - Markix Service Level Agreement</p>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
