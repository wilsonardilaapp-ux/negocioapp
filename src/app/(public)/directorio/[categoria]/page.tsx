
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

export const dynamic = 'force-dynamic';

/**
 * Normaliza un string para comparaciones robustas.
 * Maneja decodificación de URL, quita acentos, emojis y caracteres especiales.
 */
function normalizeString(text: string | null | undefined): string {
    if (!text) return "";
    try {
        const decoded = decodeURIComponent(text);
        return decoded
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[^a-z0-9]/g, "");    // Quitar TODO lo demás (espacios, emojis, guiones)
    } catch (e) {
        return String(text)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
    }
}

async function getEntriesByCategory(categoryParam: string, subcategoryParam?: string) {
    try {
        const db = await getAdminFirestore();
        
        // 1. Obtener las categorías dinámicas de la configuración global
        const configSnap = await db.collection('globalConfig').doc('directoryCategories').get();
        let dynamicCategories: any[] = [];

        if (configSnap.exists) {
            const data = configSnap.data();
            if (data && Array.isArray(data.categories)) {
                dynamicCategories = data.categories;
            }
        }

        // 2. Identificar la categoría actual basándose en la normalización del slug de la URL
        const normalizedTargetCategory = normalizeString(categoryParam);
        const originalCategoryObj = dynamicCategories.find(
            c => normalizeString(typeof c === 'string' ? c : c.name) === normalizedTargetCategory
        );

        if (!originalCategoryObj) return null;

        const categoryName = typeof originalCategoryObj === 'string' ? originalCategoryObj : originalCategoryObj.name;
        const subcategories = typeof originalCategoryObj === 'string' ? [] : (originalCategoryObj.subcategories || []);

        // 3. Obtener negocios aprobados (Filtrado en memoria para máxima robustez ante variaciones de texto)
        const snapshot = await db.collection('businesses')
            .where('status', '==', 'active')
            .where('directoryEnabled', '==', true)
            .get();

        const allBusinesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));

        const normalizedTargetSubcategory = subcategoryParam ? normalizeString(subcategoryParam) : null;

        // 4. Filtrar resultados comparando valores normalizados
        const filteredItems = allBusinesses.filter(item => {
            const itemCategoryNormalized = normalizeString(item.category);
            const categoryMatches = itemCategoryNormalized === normalizedTargetCategory;

            if (!categoryMatches) return false;

            // Si hay filtro de subcategoría, normalizar y comparar
            if (normalizedTargetSubcategory) {
                const itemSubcategoryNormalized = normalizeString((item as any).subcategory);
                return itemSubcategoryNormalized === normalizedTargetSubcategory;
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

export async function generateMetadata({ params, searchParams }: { params: { categoria: string }, searchParams: { sub?: string } }): Promise<Metadata> {
    const data = await getEntriesByCategory(params.categoria, searchParams.sub);
    if (!data) return { title: 'Categoría no encontrada' };

    const titleSuffix = searchParams.sub ? ` - ${searchParams.sub}` : '';
    return {
        title: `Negocios de ${data.category}${titleSuffix} | Zentry`,
        description: `Encuentra los mejores negocios y servicios en la categoría de ${data.category.toLowerCase()}. Perfiles profesionales y verificados.`,
    };
}

export default async function CategoryPage({ params, searchParams }: { params: { categoria: string }, searchParams: { sub?: string } }) {
    const data = await getEntriesByCategory(params.categoria, searchParams.sub);

    if (!data) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <Header businessId={null} navigation={null} />
            
            <main className="flex-grow container mx-auto px-4 py-12">
                <div className="mb-10 space-y-4">
                    <Link href="/directorio">
                        <Button variant="ghost" size="sm" className="pl-0 text-gray-500 hover:text-primary transition-all gap-2">
                            <ChevronLeft className="h-4 w-4" /> Volver al directorio
                        </Button>
                    </Link>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            Negocios de {data.category}
                        </h1>
                        <p className="text-gray-500">
                            Explora los mejores perfiles en el sector de {data.category.toLowerCase()}.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar de Subcategorías */}
                    <aside className="lg:w-64 space-y-8">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" /> Filtrar Subcategoría
                            </h3>
                            <div className="space-y-1">
                                <Link 
                                    href={`/directorio/${params.categoria}`}
                                    className={cn(
                                        "block px-3 py-2 rounded-lg text-sm transition-colors",
                                        !searchParams.sub ? "bg-primary text-white font-bold" : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                                    )}
                                >
                                    Todas
                                </Link>
                                {data.subcategories.map(sub => {
                                    const isSelected = normalizeString(searchParams.sub) === normalizeString(sub);
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

                    {/* Listado de Negocios */}
                    <div className="flex-1 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-gray-900">
                                    {searchParams.sub ? `Resultados para ${searchParams.sub}` : 'Resultados'}
                                </h2>
                            </div>
                            <span className="text-sm text-gray-500 font-medium">
                                {data.items.length} resultados encontrados
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
                                <p className="text-gray-400 font-bold text-lg">No se encontraron negocios en esta selección.</p>
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

const Badge = ({ children, variant, className }: any) => {
    const variants: any = {
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-input bg-background"
    };
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
            {children}
        </span>
    );
};
