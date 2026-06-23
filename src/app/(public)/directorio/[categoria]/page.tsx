
import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BusinessCard from '@/components/directory/BusinessCard';
import { DIRECTORY_CATEGORIES } from '@/models/business-directory';
import type { Business } from '@/models/business';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
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
        
        // Buscamos la categoría original comparando versiones normalizadas (sin acentos)
        const normalizedTarget = normalizeString(categoryParam);
        const normalizedCategory = DIRECTORY_CATEGORIES.find(
            c => normalizeString(c) === normalizedTarget
        );

        if (!normalizedCategory) return null;

        // Consultamos la colección 'businesses' directamente con el nombre exacto guardado
        const snapshot = await db.collection('businesses')
            .where('directoryStatus', '==', 'approved')
            .where('category', '==', normalizedCategory)
            .get();

        return {
            category: normalizedCategory,
            items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Business[]
        };
    } catch (error) {
        console.error("Error fetching category entries:", error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: { categoria: string } }): Promise<Metadata> {
    const normalizedTarget = normalizeString(params.categoria);
    const category = DIRECTORY_CATEGORIES.find(
        c => normalizeString(c) === normalizedTarget
    );

    if (!category) return { title: 'Categoría no encontrada' };

    return {
        title: `Negocios de ${category} | Zentry`,
        description: `Encuentra los mejores negocios y servicios en la categoría de ${category.toLowerCase()}. Perfiles profesionales y verificados.`,
    };
}

export default async function CategoryPage({ params }: { params: { categoria: string } }) {
    const data = await getEntriesByCategory(params.categoria);

    if (!data) {
        notFound();
    }

    const visibleItems = data.items.filter(item => item.directoryEnabled !== false);

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <Header businessId={null} navigation={null} />
            
            <main className="flex-grow container mx-auto px-4 py-12">
                <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Link href="/directorio">
                            <Button variant="ghost" size="sm" className="pl-0 text-gray-500 hover:text-primary transition-all gap-2">
                                <ChevronLeft className="h-4 w-4" /> Volver al directorio
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            Negocios de {data.category}
                        </h1>
                        <p className="text-gray-500">
                            Explora los mejores perfiles en el sector de {data.category.toLowerCase()}.
                        </p>
                    </div>
                </div>

                {visibleItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {visibleItems.map(entry => (
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
            </main>

            <Footer />
        </div>
    );
}
