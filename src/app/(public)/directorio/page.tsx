import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BusinessCard from '@/components/directory/BusinessCard';
import DirectoryAdSlot from '@/components/directory/DirectoryAdSlot';
import { DIRECTORY_CATEGORIES } from '@/models/business-directory';
import type { Business } from '@/models/business';
import { Button } from '@/components/ui/button';
import { Filter, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import SearchBar from './SearchBar';
import { getLandingData } from '@/lib/get-landing-data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Directorio de Negocios | Markix',
    description: 'Explora el directorio de negocios líderes. Encuentra profesionales verificados cerca de ti.',
};

/**
 * Obtiene las categorías configuradas dinámicamente en Firestore.
 */
async function getCategories(): Promise<string[]> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection('globalConfig').doc('directoryCategories').get();
        
        if (configSnap.exists) {
            const data = configSnap.data();
            if (data && Array.isArray(data.categories) && data.categories.length > 0) {
                return data.categories.map((cat: any) => 
                    typeof cat === 'string' ? cat : cat.name
                ).filter(Boolean);
            }
        }
    } catch (error) {
        console.error("Error fetching dynamic categories:", error);
    }
    return DIRECTORY_CATEGORIES;
}

async function getDirectoryBusinesses() {
    try {
        const db = await getAdminFirestore();
        const snapshot = await db.collection('businesses')
            .where('status', '==', 'active')
            .where('directoryEnabled', '==', true)
            .limit(500) // Aumentado a 500 registros para mayor alcance de búsqueda
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Business[];
    } catch (error) {
        console.error("Error fetching directory entries:", error);
        return [];
    }
}

async function getGlobalFavicon() {
    try {
        const db = await getAdminFirestore();
        const snap = await db.collection("globalConfig").doc("system").get();
        return snap.exists ? snap.data()?.faviconUrl : null;
    } catch {
        return null;
    }
}

export default async function DirectoryPage({ 
  searchParams 
}: { 
  searchParams: { q?: string; p?: string } 
}) {
    const query = searchParams.q?.toLowerCase().trim() || '';
    const currentPage = parseInt(searchParams.p || '1', 10);
    const itemsPerPage = 20;

    const [allBusinesses, dynamicCategories, landingData] = await Promise.all([
        getDirectoryBusinesses(),
        getCategories(),
        getLandingData()
    ]);

    // Filtrado de negocios por nombre o categoría (Operando sobre el total de 500 registros)
    const filteredBusinesses = query 
        ? allBusinesses.filter(b => 
            b.name.toLowerCase().includes(query) || 
            (b.category && b.category.toLowerCase().includes(query))
          )
        : allBusinesses;

    // Lógica de Paginación Visual
    const totalResults = filteredBusinesses.length;
    const totalPages = Math.ceil(totalResults / itemsPerPage);
    const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
    const startIndex = (safePage - 1) * itemsPerPage;
    const paginatedBusinesses = filteredBusinesses.slice(startIndex, startIndex + itemsPerPage);

    const getPageLink = (page: number) => {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        params.set('p', page.toString());
        return `/directorio?${params.toString()}`;
    };

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <Header businessId={null} navigation={landingData?.navigation || null} />
            
            <main className="flex-grow">
                <section className="bg-primary/5 border-b py-16 md:py-24">
                    <div className="container mx-auto px-4 text-center space-y-6">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900">
                            Directorio Markix
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                            Conecta con los mejores negocios y servicios locales en una sola plataforma.
                        </p>
                        
                        <SearchBar />
                    </div>
                </section>

                <section className="container mx-auto px-4 py-8">
                    <DirectoryAdSlot position="top" format="google_display" className="mb-10" />

                    <div className="flex flex-col lg:flex-row gap-8">
                        <aside className="lg:w-64 space-y-8">
                            {/* Versión Móvil: Acordeón colapsable */}
                            <div className="lg:hidden">
                                <Accordion type="single" collapsible className="w-full bg-white rounded-2xl border shadow-sm overflow-hidden">
                                    <AccordionItem value="categories" className="border-none">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <Filter className="h-4 w-4 text-primary" /> Categorías
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-4">
                                            <div className="space-y-1">
                                                {dynamicCategories.map(category => (
                                                    <Link 
                                                        key={category} 
                                                        href={`/directorio/${encodeURIComponent(category.toLowerCase())}`}
                                                        className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors"
                                                    >
                                                        {category}
                                                    </Link>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>

                            {/* Versión Desktop: Lista estática original */}
                            <div className="hidden lg:block">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4" /> Categorías
                                </h3>
                                <div className="space-y-1">
                                    {dynamicCategories.map(category => (
                                        <Link 
                                            key={category} 
                                            href={`/directorio/${encodeURIComponent(category.toLowerCase())}`}
                                            className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors"
                                        >
                                            {category}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            
                            <DirectoryAdSlot position="sidebar" format="meta_feed" />
                        </aside>

                        <div className="flex-1 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-5 w-5 text-primary" />
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {query ? `Resultados para "${query}"` : 'Explorar Negocios'}
                                    </h2>
                                </div>
                                <span className="text-sm text-gray-500 font-medium">
                                    {totalResults} resultados encontrados
                                </span>
                            </div>

                            {paginatedBusinesses.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {paginatedBusinesses.map((business, index) => (
                                            <React.Fragment key={business.id}>
                                                <BusinessCard entry={business} />
                                                {index === 5 && (
                                                    <div className="col-span-full">
                                                        <DirectoryAdSlot position="mid" format="google_display" />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Controles de Paginación */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-col items-center gap-4 mt-12 py-6 border-t">
                                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                                Página {safePage} de {totalPages}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    disabled={safePage === 1}
                                                    className="h-10 px-4 font-bold rounded-xl"
                                                >
                                                    {safePage > 1 ? (
                                                        <Link href={getPageLink(safePage - 1)}>
                                                            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                                                        </Link>
                                                    ) : (
                                                        <div className="flex items-center opacity-50 cursor-not-allowed">
                                                            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                                                        </div>
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    disabled={safePage >= totalPages}
                                                    className="h-10 px-4 font-bold rounded-xl"
                                                >
                                                    {safePage < totalPages ? (
                                                        <Link href={getPageLink(safePage + 1)}>
                                                            Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                                                        </Link>
                                                    ) : (
                                                        <div className="flex items-center opacity-50 cursor-not-allowed">
                                                            Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                                                        </div>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
                                    <p className="text-gray-400 font-medium">No se encontraron negocios que coincidan con tu búsqueda.</p>
                                    {query && (
                                      <Button variant="link" asChild className="mt-2 text-primary font-bold">
                                        <Link href="/directorio">Ver todos los negocios</Link>
                                      </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
