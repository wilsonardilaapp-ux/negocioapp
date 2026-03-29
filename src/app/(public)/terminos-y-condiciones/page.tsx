'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { LandingPageData } from "@/models/landing-page";

// Fake data fetching hook to satisfy Header component props
const useHeaderData = () => {
    const firestore = useFirestore();
    const mainBusinessId = 'main'; // Placeholder
    
    const landingPageDocRef = useMemoFirebase(() => {
        if (!firestore || !mainBusinessId) return null;
        return doc(firestore, 'businesses', mainBusinessId, 'landingPages', 'main');
    }, [firestore, mainBusinessId]);

    const { data: landingData } = useDoc<LandingPageData>(landingPageDocRef);
    return { businessId: mainBusinessId, navigation: landingData?.navigation ?? null };
}

export default function TermsAndConditionsPage() {
    const { businessId, navigation } = useHeaderData();

    return (
        <div className="w-full bg-background">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16 md:py-24">
                <Card className="max-w-4xl mx-auto shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl md:text-4xl font-bold">Términos y Condiciones</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-lg max-w-none text-justify">
                        <h2>1. Introducción</h2>
                        <p>Bienvenido a Zentry. Estos términos y condiciones describen las reglas y regulaciones para el uso de nuestro software como servicio (SaaS). Al acceder a este servicio, asumimos que aceptas estos términos y condiciones. No continúes usando Zentry si no estás de acuerdo con todos los términos y condiciones establecidos en esta página.</p>

                        <h2>2. Definiciones</h2>
                        <ul>
                            <li><strong>"Servicio"</strong> se refiere a la plataforma SaaS Zentry.</li>
                            <li><strong>"Usuario"</strong>, <strong>"Tú"</strong> y <strong>"Tu"</strong> se refieren a ti, la persona que accede al servicio.</li>
                            <li><strong>"La Compañía"</strong>, <strong>"Nosotros"</strong> y <strong>"Nuestro"</strong> se refieren a Zentry.</li>
                        </ul>

                        <h2>3. Uso del Servicio</h2>
                        <p>Se te concede una licencia no exclusiva, no transferible y revocable para acceder y utilizar el Servicio estrictamente de acuerdo con estos términos. Como condición de tu uso, garantizas que no utilizarás el Servicio para ningún propósito que sea ilegal o prohibido por estos Términos.</p>

                        <h2>4. Registro y Cuentas</h2>
                        <p>Para acceder a la mayoría de las funciones del Servicio, debes registrarte para obtener una cuenta. Debes proporcionar información precisa, completa y actualizada durante el proceso de registro. Eres responsable de salvaguardar la contraseña que utilizas para acceder al Servicio y de cualquier actividad o acción bajo tu contraseña.</p>

                        <h2>5. Planes, Pagos y Suscripciones</h2>
                        <p>El Servicio se factura sobre una base de suscripción. Se te facturará por adelantado de forma recurrente y periódica ("Ciclo de Facturación"). Los ciclos de facturación se establecen mensualmente o anualmente. Al final de cada Ciclo de Facturación, tu Suscripción se renovará automáticamente bajo las mismas condiciones, a menos que la canceles o que La Compañía la cancele. Se requiere un método de pago válido para procesar el pago de tu Suscripción.</p>

                        <h2>6. Propiedad Intelectual</h2>
                        <p>El Servicio y su contenido original, características y funcionalidad son y seguirán siendo propiedad exclusiva de La Compañía y sus licenciantes. El Servicio está protegido por derechos de autor, marcas comerciales y otras leyes tanto de Colombia como de países extranjeros.</p>

                        <h2>7. Protección de Datos</h2>
                        <p>Nuestra Política de Privacidad, que también rige tu visita a nuestro Servicio, se puede encontrar en [Enlace a la Política de Privacidad]. Por favor, revísala para entender nuestras prácticas. Respetamos la privacidad de nuestros usuarios.</p>

                        <h2>8. Limitación de Responsabilidad</h2>
                        <p>En ningún caso La Compañía, ni sus directores, empleados, socios, agentes, proveedores o afiliados, serán responsables de daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo, sin limitación, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles, resultantes del uso o la imposibilidad de usar el Servicio.</p>

                        <h2>9. Suspensión o Terminación</h2>
                        <p>Podemos terminar o suspender tu cuenta y prohibir el acceso al Servicio de inmediato, sin previo aviso ni responsabilidad, bajo nuestra única discreción, por cualquier motivo y sin limitación, incluyendo, pero no limitado a, un incumplimiento de los Términos.</p>

                        <h2>10. Modificaciones</h2>
                        <p>Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es material, proporcionaremos un aviso de al menos 30 días antes de que los nuevos términos entren en vigor.</p>

                        <h2>11. Legislación Aplicable</h2>
                        <p>Estos Términos se regirán e interpretarán de acuerdo con las leyes de la República de Colombia, sin tener en cuenta sus disposiciones sobre conflicto de leyes.</p>

                        <h2>12. Contacto</h2>
                        <p>Si tienes alguna pregunta sobre estos Términos, por favor contáctanos a través de nuestro formulario de contacto en el sitio web.</p>

                        <p className="text-sm text-muted-foreground pt-4">Última actualización: 24 de julio de 2024</p>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
