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

export default async function BillingPolicyPage() {
    const { businessId, navigation } = await getHeaderData();

    return (
        <div className="w-full bg-background">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16 md:py-24">
                <Card className="max-w-4xl mx-auto shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl md:text-4xl font-bold text-primary">Política de Cobro y Comisiones</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-lg max-w-none text-justify">
                        <p>Esta política detalla cómo <strong>Zentry</strong> procesa los pagos de suscripción y gestiona las comisiones por uso de servicio según el modelo de negocio contratado.</p>

                        <h2>1. Modelos de Facturación</h2>
                        <p>Zentry ofrece dos modalidades principales de cobro:</p>
                        <ul>
                            <li><strong>Planes Estándar:</strong> Cobro de una suscripción mensual fija por el uso de los módulos incluidos.</li>
                            <li><strong>Planes Híbridos (Zentry):</strong> Cobro de una tarifa base reducida más una comisión por cada pedido/transacción realizada a través de la plataforma.</li>
                        </ul>

                        <h2>2. Cálculo de Comisiones (Planes Híbridos)</h2>
                        <p>Para los clientes en modelos híbridos, la comisión se calcula mensualmente basada en el volumen de pedidos registrados en el sistema. El incumplimiento en el reporte de ventas reales o la manipulación del sistema de pedidos para evadir comisiones se considera una falta grave a los términos de servicio.</p>

                        <h2>3. Ciclo de Facturación y Suspensión</h2>
                        <p>Las facturas se generan al inicio de cada ciclo mensual. En caso de mora superior a 5 días calendario en el pago de suscripciones o comisiones acumuladas, <strong>Zentry se reserva el derecho de suspender automáticamente el acceso</strong> al panel administrativo y la visibilidad de las páginas públicas del negocio hasta que se normalice la deuda.</p>

                        <h2>4. Métodos de Pago</h2>
                        <p>Aceptamos tarjetas de crédito a través de Stripe, pagos vía Hotmart y transferencias manuales (Nequi/Bancolombia) según la región y configuración de la cuenta.</p>

                        <p className="text-sm text-muted-foreground pt-4">Última actualización: Zentry Billing Department</p>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
