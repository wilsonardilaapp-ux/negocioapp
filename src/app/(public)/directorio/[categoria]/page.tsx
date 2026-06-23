
import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BusinessCard from '@/components/directory/BusinessCard';
import { DIRECTORY_CATEGORIES, type BusinessDirectoryEntry } from '@/models/business-directory';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getEntriesByCategory(category: string) {
    try {
        const db = await getAdminFirestore();
        
        // Normalizar categoría para la búsqueda
        const normalizedCategory = DIRECTORY_CATEGORIES.find(
            c => c.toLowerCase() === category.toLowerCase()
        );

        if (!normalizedCategory) return null;

        const snapshot = await db.collection('businessDirectory')
            .where('status', '==', 'published')
            .where('publicProfile', '==', true) // Filtro de seguridad obligatorio
            .where('category', '==', normalizedCategory)
            .orderBy('featured', 'desc')
            .get();

        return {
            category: normalizedCategory,
            items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BusinessDirectoryEntry[]
        };
    } catch (error) {
        console.error("Error fetching category entries:", error);
        return null;
    }
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

                {data.items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {data.items.map(entry => (
                            <BusinessCard key={entry.id} entry={entry} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold text-lg">Aún no hay negocios en esta categoría.</p>
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
