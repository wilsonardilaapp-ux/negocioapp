
import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BusinessCard from '@/components/directory/BusinessCard';
import type { Business } from '@/models/business';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Filter, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

/**
 * Normaliza un string para comparaciones seguras de URLs (remueve acentos y pasa a minúsculas)
 */
function normalizeString(text: string): string {
    return decodeURIComponent(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

async function getEntriesByCategory(categoryParam: string) {
    try {
        const db = await getAdminFirestore();
        
        // 1. Obtener las categorías dinámicas de Firestore
        const configSnap = await db.collection('globalConfig').doc('directoryCategories').get();
        let dynamicCategories: any[] = [];

        if (configSnap.exists) {
            const data = configSnap.data();
            if (data && Array.isArray(data.categories)) {
                dynamicCategories = data.categories;
            }
        }

        // 2. Buscar el objeto de categoría original comparando versiones normalizadas
        const normalizedTarget = normalizeString(categoryParam);
        const originalCategoryObj = dynamicCategories.find(
            c => normalizeString(typeof c === 'string' ? c : c.name) === normalizedTarget
        );

        if (!originalCategoryObj) return null;

        const originalCategoryName = typeof originalCategoryObj === 'string' ? originalCategoryObj : originalCategoryObj.name;
        const subcategories = typeof originalCategoryObj === 'string' ? [] : (originalCategoryObj.subcategories || []);

        // 3. Consultar negocios aprobados en esa categoría respetando los flags de visibilidad
        const snapshot = await db.collection('businesses')
            .where('status', '==', 'active')
            .where('directoryEnabled', '==', true)
            .where('category', '==', originalCategoryName)
            .get();

        return {
            category: originalCategoryName,
            subcategories: subcategories as string[],
            items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Business[]
        };
    } catch (error) {
        console.error("Error fetching category entries:", error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
    const data = await getEntriesByCategory(params.categoria);
    if (!data) return { title: 'Categoría no encontrada' };

    return {
        title: `Negocios de ${data.category} | Zentry`,
        description: `Encuentra los mejores negocios y servicios en la categoría de ${data.category.toLowerCase()}. Perfiles profesionales y verificados.`,
    };
}

export default async function CategoryPage({ params }: { params: { categoria: string } }) {
    const data = await getEntriesByCategory(params.categoria);

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
                    {data.subcategories.length > 0 && (
                        <aside className="lg:w-64 space-y-8">
                            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-primary" /> Subcategorías
                                </h3>
                                <div className="space-y-1">
                                    {data.subcategories.map(sub => (
                                        <Link 
                                            key={sub} 
                                            href={`/directorio/${params.categoria}?sub=${encodeURIComponent(sub)}`}
                                            className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors"
                                        >
                                            {sub}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Listado de Negocios */}
                    <div className="flex-1 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-gray-900">Resultados</h2>
                            </div>
                            <span className="text-sm text-gray-500">
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
                                <p className="text-gray-400 font-bold text-lg">Aún no hay negocios publicados en esta categoría.</p>
                                <Link href="/directorio">
                                    <Button variant="link" className="mt-2 text-primary">Ver todas las categorías</Button>
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
