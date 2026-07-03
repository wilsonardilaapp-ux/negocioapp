import { getAdminFirestore } from "@/firebase/server-init";
import { redirect } from "next/navigation";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { LandingPageData } from "@/models/landing-page";
import { getLandingData } from "@/lib/get-landing-data";

export const dynamic = 'force-dynamic';

async function getInitialData() {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;

        if (!mainBusinessId) return { businessId: null };

        return { businessId: mainBusinessId };
    } catch (error) {
        return { businessId: null };
    }
}

export default async function BlogRootPage() {
    const [landingData, initialData] = await Promise.all([
        getLandingData(),
        getInitialData()
    ]);
    
    const { businessId } = initialData;

    // Si tenemos un negocio principal definido, redirigimos automáticamente a su blog
    if (businessId) {
        redirect(`/blog/${businessId}`);
    }

    // Si no hay negocio principal, mostramos una página informativa para evitar el 404
    return (
        <div className="w-full bg-background min-h-screen flex flex-col">
            <Header businessId={null} navigation={landingData?.navigation || null} />
            <main className="flex-1 container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Blog de la Plataforma</h1>
                <p className="text-gray-600 max-w-md mb-8">
                    Actualmente no hay un blog principal configurado. Explora los blogs de nuestros negocios asociados o regresa a la página de inicio.
                </p>
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/">Ir al Inicio</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/register">Crea tu propio Blog <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </div>
            </main>
            <Footer />
        </div>
    );
}
