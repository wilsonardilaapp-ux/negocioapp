import React from 'react';
import { getAdminFirestore } from "@/firebase/server-init";
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BusinessCard from '@/components/directory/BusinessCard';
import type { Business } from '@/models/business';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Filter, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cn } from "@/lib/utils";
import FaviconInjector from '@/components/layout/FaviconInjector';
import { getLandingData } from '@/lib/get-landing-data';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const dynamic = 'force-dynamic';

/**
 * Normalización agresiva para asegurar que los Slugs coincidan 
 * sin importar emojis o caracteres especiales.
 */
function normalizeString(text: any): string {
    if (!text) return "";
    const str = Array.isArray(text) ? text[0] : String(text);
    try {
        const decoded = decodeURIComponent(str);
        return decoded
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[^a-z0-9]/g, "");    
    } catch (e) {
        return str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
    }
}

async function getEntriesByCategory(categoryParam: string, subcategoryParam?: string) {
    try {
        const db = await getAdminFirestore();
        
        // 1. Obtener la configuración maestra de categorías
        const configSnap = await db.collection('globalConfig').doc('directoryCategories').get();
        let dynamicCategories: any[] = [];

        if (configSnap.exists) {
            const data = configSnap.data();
            if (data && Array.isArray(data.categories)) {
                dynamicCategories = data.categories;
            }
        }

        // 2. Identificar la Categoría Maestra comparando Slugs Normalizados
        const normalizedTargetSlug = normalizeString(categoryParam);
        const categoryMatch = dynamicCategories.find(c => {
            const name = typeof c === 'string' ? c : c.name;
            return normalizeString(name) === normalizedTargetSlug;
        });

        if (!categoryMatch) {
            return null;
        }

        const categoryName = typeof categoryMatch === 'string' ? categoryMatch : categoryMatch.name;
        const subcategories = typeof categoryMatch === 'string' ? [] : (categoryMatch.subcategories || []);

        // 3. Obtener negocios activos
        const snapshot = await db.collection('businesses')
            .where('status', '==', 'active')
            .where('directoryEnabled', '==', true)
            .get();

        const allBusinesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));

        const normalizedSubcategoryParam = subcategoryParam ? normalizeString(subcategoryParam) : null;

        // 4. Filtrado en memoria
        const filteredItems = allBusinesses.filter(item => {
            const itemCategoryNormalized = normalizeString(item.category);
            const categoryMatches = itemCategoryNormalized === normalizedTargetSlug;

            if (!categoryMatches) return false;

            if (normalizedSubcategoryParam) {
                const itemSubcategoryNormalized = normalizeString((item as any).subcategory);
                return itemSubcategoryNormalized === normalizedSubcategoryParam;
            }

            return true;
        });

        return {
            category: categoryName,
            subcategories: subcategories as string[],
            items: filteredItems
        };
    } catch (error) {
        console.error("Error fetching category entries:", error);
        return null;
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

export async function generateMetadata({ params, searchParams }: { params: { categoria: string }, searchParams: { sub?: string } }): Promise<Metadata> {
    const data = await getEntriesByCategory(params.categoria, searchParams?.sub);
    if (!data) return { title: 'Categoría no encontrada' };

    const titleSuffix = searchParams?.sub ? ` - ${searchParams.sub}` : '';
    return {
        title: `${data.category}${titleSuffix} | Directorio Zentry`,
        description: `Explora negocios verificados en ${data.category}.`,
    };
}

export default async function CategoryPage({ params, searchParams }: { params: { categoria: string }, searchParams?: { sub?: string } }) {
    // Asegurar que searchParams no sea null
    const safeSearchParams = searchParams || {};
    
    const [data, faviconUrl, landingData] = await Promise.all([
        getEntriesByCategory(params.categoria, safeSearchParams.sub),
        getGlobalFavicon(),
        getLandingData()
    ]);

    if (!data) {
        notFound();
    }

    const pageTitle = safeSearchParams.sub ? `${data.category} - ${safeSearchParams.sub} | Zentry` : `${data.category} | Zentry`;

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <FaviconInjector faviconUrl={faviconUrl} title={pageTitle} />
            <Header businessId={null} navigation={landingData?.navigation || null} />
            
            <main className="flex-grow container mx-auto px-4 py-12">
                <div className="mb-10 space-y-4">
                    <Link href="/directorio">
                        <Button variant="ghost" size="sm" className="pl-0 text-gray-500 hover:text-primary transition-all gap-2">
                            <ChevronLeft className="h-4 w-4" /> Volver al directorio
                        </Button>
                    </Link>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            {data.category}
                        </h1>
                        <p className="text-gray-500">
                            Explora los mejores perfiles verificados en {data.category.toLowerCase()}.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar de Subcategorías */}
                    <aside className="lg:w-64 space-y-8">
                        {/* Versión Móvil: Acordeón colapsable */}
                        <div className="lg:hidden">
                            <Accordion 
                                type="single" 
                                collapsible 
                                className="w-full bg-white rounded-2xl border shadow-sm overflow-hidden"
                                defaultValue={safeSearchParams.sub ? "subcategories" : undefined}
                            >
                                <AccordionItem value="subcategories" className="border-none">
                                    <AccordionTrigger className="px-6 py-4 hover:no-underline font-bold text-gray-900">
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4 text-primary" /> Subcategorías
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-4">
                                        <div className="space-y-1">
                                            <Link 
                                                href={`/directorio/${params.categoria}`}
                                                className={cn(
                                                    "block px-3 py-2 rounded-lg text-sm transition-colors",
                                                    !safeSearchParams.sub ? "bg-primary text-white font-bold" : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                                                )}
                                            >
                                                Todas
                                            </Link>
                                            {data.subcategories.map(sub => {
                                                const isSelected = normalizeString(safeSearchParams.sub) === normalizeString(sub);
                                                return (
                                                    <Link 
                                                        key={sub} 
                                                        href={`/directorio/${params.categoria}?sub=${encodeURIComponent(sub)}`}
                                                        className={cn(
                                                            "block px-3 py-2 rounded-lg text-sm transition-colors",
                                                            isSelected ? "bg-primary text-white font-bold" : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                                                        )}
                                                    >
                                                        {sub}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>

                        {/* Versión Desktop: Lista estática original */}
                        <div className="hidden lg:block bg-white p-6 rounded-2xl border shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" /> Subcategorías
                            </h3>
                            <div className="space-y-1">
                                <Link 
                                    href={`/directorio/${params.categoria}`}
                                    className={cn(
                                        "block px-3 py-2 rounded-lg text-sm transition-colors",
                                        !safeSearchParams.sub ? "bg-primary text-white font-bold" : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                                    )}
                                >
                                    Todas
                                </Link>
                                {data.subcategories.map(sub => {
                                    const isSelected = normalizeString(safeSearchParams.sub) === normalizeString(sub);
                                    return (
                                        <Link 
                                            key={sub} 
                                            href={`/directorio/${params.categoria}?sub=${encodeURIComponent(sub)}`}
                                            className={cn(
                                                "block px-3 py-2 rounded-lg text-sm transition-colors",
                                                isSelected ? "bg-primary text-white font-bold" : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                                            )}
                                        >
                                            {sub}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* Resultados */}
                    <div className="flex-1 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-gray-900">
                                    {safeSearchParams.sub ? `Resultados para ${safeSearchParams.sub}` : 'Todos los resultados'}
                                </h2>
                            </div>
                            <span className="text-sm text-gray-500 font-medium">
                                {data.items.length} negocios encontrados
                            </span>
                        </div>

                        {data.items.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {data.items.map(entry => (
                                    <BusinessCard key={entry.id} entry={entry} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-400 font-bold text-lg">No hay negocios registrados para esta selección.</p>
                                <Link href={`/directorio/${params.categoria}`}>
                                    <Button variant="link" className="mt-2 text-primary">Ver todos los negocios de {data.category}</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
