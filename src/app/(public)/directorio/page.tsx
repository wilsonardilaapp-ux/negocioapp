
import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BusinessCard from '@/components/directory/BusinessCard';
import DirectoryAdSlot from '@/components/directory/DirectoryAdSlot';
import { DIRECTORY_CATEGORIES } from '@/models/business-directory';
import type { Business } from '@/models/business';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import FaviconInjector from '@/components/layout/FaviconInjector';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Directorio de Negocios | Zentry',
    description: 'Explora el directorio de negocios líderes. Encuentra profesionales verificados cerca de ti.',
};

/**
 * Obtiene las categorías configuradas dinámicamente en Firestore.
 * Mapea los objetos de categoría para obtener solo los nombres como strings.
 */
async function getCategories(): Promise<string[]> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection('globalConfig').doc('directoryCategories').get();
        
        if (configSnap.exists) {
            const data = configSnap.data();
            if (data && Array.isArray(data.categories) && data.categories.length > 0) {
                // Extraer el nombre independientemente de si es un string o un objeto {name, subcategories}
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
            .limit(48)
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

export default async function DirectoryPage() {
    const [businesses, dynamicCategories, faviconUrl] = await Promise.all([
        getDirectoryBusinesses(),
        getCategories(),
        getGlobalFavicon()
    ]);

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <FaviconInjector faviconUrl={faviconUrl} title="Directorio de Negocios | Zentry" />
            <Header businessId={null} navigation={null} />
            
            <main className="flex-grow">
                <section className="bg-primary/5 border-b py-16 md:py-24">
                    <div className="container mx-auto px-4 text-center space-y-6">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900">
                            Directorio Zentry
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                            Conecta con los mejores negocios y servicios locales en una sola plataforma.
                        </p>
                        
                        <div className="max-w-2xl mx-auto flex gap-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input 
                                    placeholder="¿Qué estás buscando? (ej. Salud, Yoga...)" 
                                    className="border-none shadow-none h-12 pl-10 focus-visible:ring-0 text-lg"
                                />
                            </div>
                            <Button size="lg" className="px-8 font-bold rounded-xl text-white bg-primary">
                                Buscar
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="container mx-auto px-4 py-8">
                    <DirectoryAdSlot position="top" format="google_display" className="mb-10" />

                    <div className="flex flex-col lg:flex-row gap-8">
                        <aside className="lg:w-64 space-y-8">
                            <div>
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
                                    <h2 className="text-xl font-bold text-gray-900">Explorar Negocios</h2>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {businesses.length} resultados encontrados
                                </span>
                            </div>

                            {businesses.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {businesses.map((business, index) => (
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
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
                                    <p className="text-gray-400 font-medium">Aún no hay negocios publicados en esta sección.</p>
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
