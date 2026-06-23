
import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BusinessCard from '@/components/directory/BusinessCard';
import { DIRECTORY_CATEGORIES, type BusinessDirectoryEntry } from '@/models/business-directory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Directorio de Negocios | Zentry',
    description: 'Explora el directorio de negocios líderes en salud, bienestar y servicios. Encuentra profesionales verificados cerca de ti.',
    openGraph: {
        title: 'Directorio de Negocios | Zentry',
        description: 'Conecta con los mejores negocios de salud y bienestar.',
        type: 'website',
    },
};

async function getDirectoryEntries() {
    try {
        const db = await getAdminFirestore();
        const snapshot = await db.collection('businessDirectory')
            .where('status', '==', 'published')
            .where('publicProfile', '==', true)
            .orderBy('featured', 'desc')
            .orderBy('rating', 'desc')
            .limit(24)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as BusinessDirectoryEntry[];
    } catch (error) {
        console.error("Error fetching directory entries:", error);
        return [];
    }
}

export default async function DirectoryPage() {
    const entries = await getDirectoryEntries();

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <Header businessId={null} navigation={null} />
            
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="bg-primary/5 border-b py-16 md:py-24">
                    <div className="container mx-auto px-4 text-center space-y-6">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900">
                            Directorio de Negocios
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                            Encuentra y conecta con los mejores profesionales de salud, bienestar y servicios locales.
                        </p>
                        
                        <div className="max-w-2xl mx-auto flex gap-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input 
                                    placeholder="¿Qué estás buscando? (ej. Yoga, Dentista...)" 
                                    className="border-none shadow-none h-12 pl-10 focus-visible:ring-0 text-lg"
                                />
                            </div>
                            <Button size="lg" className="px-8 font-bold rounded-xl text-white">
                                Buscar
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="container mx-auto px-4 py-12">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar Filters */}
                        <aside className="lg:w-64 space-y-8">
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Filter className="h-4 w-4" /> Categorías
                                </h3>
                                <div className="space-y-1">
                                    {DIRECTORY_CATEGORIES.map(category => (
                                        <Link 
                                            key={category} 
                                            href={`/directorio/${category.toLowerCase()}`}
                                            className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-primary/5 hover:text-primary transition-colors"
                                        >
                                            {category}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* Results Grid */}
                        <div className="flex-1 space-y-8">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <LayoutGrid className="h-5 w-5 text-primary" />
                                    Explorar Negocios
                                </h2>
                                <span className="text-sm text-gray-500">
                                    Mostrando {entries.length} resultados
                                </span>
                            </div>

                            {entries.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {entries.map(entry => (
                                        <BusinessCard key={entry.id} entry={entry} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
                                    <p className="text-gray-400 font-medium">No se encontraron negocios publicados en este momento.</p>
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
