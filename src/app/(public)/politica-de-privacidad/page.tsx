import { getAdminFirestore } from "@/firebase/server-init";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import type { LandingPageData } from "@/models/landing-page";


// Data fetching function for header
async function getHeaderData(): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;

        if (!mainBusinessId) {
            return { businessId: null, navigation: null };
        }

        const landingSnap = await db.collection("businesses").doc(mainBusinessId).collection("landingPages").doc("main").get();
        const navigation = landingSnap.exists ? (landingSnap.data() as LandingPageData).navigation : null;
        
        return { businessId: mainBusinessId, navigation };
    } catch (error) {
        console.error("Error fetching header data:", error);
        return { businessId: null, navigation: null };
    }
}

export default async function PrivacyPolicyPage() {
    const { businessId, navigation } = await getHeaderData();

    return (
        <div className="w-full bg-background">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16 md:py-24">
                <Card className="max-w-4xl mx-auto shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl md:text-4xl font-bold">Política de Privacidad</CardTitle>
                    </CardHeader>
                    <CardContent className="prose prose-lg max-w-none text-justify">
                        <h2>1. Introducción</h2>
                        <p>En Zentry, tu privacidad es de suma importancia para nosotros. Esta Política de Privacidad explica qué información recopilamos, cómo la usamos, la almacenamos y la protegemos. Esta política se aplica a todos los usuarios de nuestra plataforma SaaS.</p>

                        <h2>2. Información que Recopilamos</h2>
                        <ul>
                            <li><strong>Datos Personales:</strong> Recopilamos información que nos proporcionas directamente, como tu nombre, dirección de correo electrónico, número de teléfono y nombre de la empresa al registrarte.</li>
                            <li><strong>Datos de Uso:</strong> Registramos información sobre cómo interactúas con nuestro Servicio. Esto incluye las funciones que utilizas, las páginas que visitas, los clics que realizas y otras acciones dentro de la plataforma.</li>
                            <li><strong>Datos Técnicos y de Dispositivo:</strong> Recopilamos automáticamente información técnica, como tu dirección IP, tipo de navegador, sistema operativo, información del dispositivo y registros de errores.</li>
                        </ul>

                        <h2>3. Cómo Utilizamos tu Información</h2>
                        <p>Usamos la información que recopilamos para:</p>
                        <ul>
                            <li>Proveer, mantener y mejorar nuestro Servicio.</li>
                            <li>Personalizar tu experiencia, como mostrarte contenido relevante para tu negocio.</li>
                            <li>Comunicarnos contigo sobre tu cuenta, actualizaciones del servicio y ofertas promocionales.</li>
                            <li>Garantizar la seguridad de nuestra plataforma y prevenir fraudes.</li>
                            <li>Cumplir con nuestras obligaciones legales.</li>
                        </ul>

                        <h2>4. Compartición y Divulgación de Datos</h2>
                        <p>Tu confianza es fundamental. No vendemos tus datos personales a terceros.</p>
                        <p>Podemos compartir tu información con proveedores de servicios de confianza que nos ayudan a operar nuestra plataforma (por ejemplo, proveedores de hosting en la nube como Google Cloud, procesadores de pago como Stripe). Estos proveedores están obligados contractualmente a proteger tu información y solo pueden usarla para los fines específicos que hemos contratado.</p>
                        
                        <h2>5. Cookies y Tecnologías Similares</h2>
                        <p>Utilizamos cookies y tecnologías similares para operar y personalizar nuestro Servicio. Las cookies son pequeños archivos de texto que nos ayudan a recordar tus preferencias, asegurar tu cuenta y analizar el rendimiento de nuestra plataforma. Puedes gestionar tus preferencias de cookies a través de la configuración de tu navegador.</p>
                        
                        <h2>6. Seguridad de la Información</h2>
                        <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tu información contra el acceso no autorizado, la alteración, la divulgación o la destrucción. Estas medidas incluyen el cifrado de datos en tránsito y en reposo, controles de acceso estrictos y auditorías de seguridad periódicas.</p>
                        
                        <h2>7. Derechos del Usuario</h2>
                        <p>Tienes derecho a acceder, rectificar o eliminar tus datos personales. También puedes oponerte al procesamiento de tus datos o solicitar una copia de los mismos. Para ejercer estos derechos, por favor contáctanos a través de la información proporcionada al final de esta política.</p>

                        <h2>8. Retención de Datos</h2>
                        <p>Conservaremos tu información personal solo durante el tiempo que sea necesario para cumplir con los fines para los que fue recopilada, incluyendo el cumplimiento de cualquier requisito legal, contable o de informes. Cuando ya no necesitemos tus datos, los eliminaremos o anonimizaremos de forma segura.</p>

                        <h2>9. Transferencias Internacionales</h2>
                        <p>Tu información puede ser transferida y mantenida en computadoras ubicadas fuera de tu estado, provincia, país u otra jurisdicción gubernamental donde las leyes de protección de datos pueden diferir de las de tu jurisdicción. Al utilizar nuestro servicio, consientes dicha transferencia.</p>

                        <h2>10. Cambios en esta Política</h2>
                        <p>Nos reservamos el derecho de actualizar esta política de privacidad en cualquier momento. Te notificaremos sobre cualquier cambio material publicando la nueva política en esta página y, si es apropiado, a través de una notificación por correo electrónico.</p>

                        <h2>11. Información de Contacto</h2>
                        <p>Si tienes alguna pregunta o inquietud sobre esta Política de Privacidad o nuestras prácticas de datos, por favor, no dudes en contactarnos en nuestro correo de soporte: [tu-email-de-soporte@zentry.com].</p>

                        <p className="text-sm text-muted-foreground pt-4">Última actualización: 24 de julio de 2024</p>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
}
