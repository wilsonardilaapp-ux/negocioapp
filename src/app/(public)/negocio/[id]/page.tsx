
import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    Star, 
    MapPin, 
    Globe, 
    Phone, 
    Mail, 
    CheckCircle2, 
    Instagram, 
    Facebook,
    ArrowRight
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { BusinessDirectoryEntry } from '@/models/business-directory';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

async function getEntry(id: string) {
    try {
        const db = await getAdminFirestore();
        const doc = await db.collection('businessDirectory').doc(id).get();
        
        if (!doc.exists) return null;
        
        const data = doc.data() as BusinessDirectoryEntry;
        
        // Verificación estricta de visibilidad
        if (data.status !== 'published' || data.publicProfile !== true) {
            return null;
        }
        
        return { id: doc.id, ...data };
    } catch (error) {
        console.error("Error fetching entry:", error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const entry = await getEntry(params.id);
    if (!entry) return { title: 'Negocio no encontrado' };

    return {
        title: `${entry.name} | Directorio Zentry`,
        description: entry.description.substring(0, 160),
        openGraph: {
            title: entry.name,
            description: entry.description.substring(0, 160),
            images: entry.logoUrl ? [{ url: entry.logoUrl }] : [],
            type: 'profile',
        },
    };
}

export default async function BusinessProfilePage({ params }: { params: { id: string } }) {
    const entry = await getEntry(params.id);

    if (!entry) {
        notFound();
    }

    // Datos estructurados para Google (SEO Local)
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: entry.name,
        description: entry.description,
        image: entry.logoUrl,
        address: {
            '@type': 'PostalAddress',
            streetAddress: entry.address || '',
        },
        telephone: entry.phone || '',
        url: entry.website || '',
        aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: entry.rating || 5,
            reviewCount: entry.reviewCount || 1,
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header businessId={entry.businessId} navigation={null} />
            
            <main className="flex-grow">
                {/* Hero Profile */}
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-12 md:py-20">
                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                            <div className="relative h-32 w-32 md:h-48 md:w-48 rounded-3xl overflow-hidden border shadow-xl shrink-0 bg-gray-50">
                                {entry.logoUrl ? (
                                    <Image src={entry.logoUrl} alt={entry.name} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-primary/10">
                                        {entry.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-4 flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">
                                        {entry.name}
                                    </h1>
                                    {entry.isVerified && (
                                        <Badge className="bg-blue-500 text-white gap-1 py-1 border-none shadow-sm">
                                            <CheckCircle2 className="h-3 w-3" /> Verificado
                                        </Badge>
                                    )}
                                    {entry.featured && (
                                        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
                                            Recomendado
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-6 text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-bold text-gray-900">{entry.rating.toFixed(1)}</span>
                                        <span>({entry.reviewCount} reseñas)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="secondary" className="font-bold">
                                            {entry.category}
                                        </Badge>
                                    </div>
                                    {entry.address && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-5 w-5 text-primary" />
                                            <span>{entry.address}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3 pt-4">
                                    {entry.phone && (
                                        <Button asChild className="gap-2 font-bold shadow-lg shadow-green-100 bg-[#25D366] hover:bg-[#128C7E] text-white">
                                            <a href={`https://wa.me/${entry.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                <WhatsAppIcon className="h-5 w-5" /> Contactar por WhatsApp
                                            </a>
                                        </Button>
                                    )}
                                    {entry.website && (
                                        <Button asChild variant="outline" className="gap-2 font-bold">
                                            <a href={entry.website} target="_blank" rel="noopener noreferrer">
                                                <Globe className="h-5 w-5 text-primary" /> Sitio Web
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Main Info */}
                        <div className="lg:col-span-2 space-y-12">
                            <section className="space-y-4">
                                <h2 className="text-2xl font-black text-gray-900">Sobre nosotros</h2>
                                <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">
                                    {entry.description}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-2xl font-black text-gray-900">Especialidades</h2>
                                <div className="flex flex-wrap gap-2">
                                    {entry.tags.map(tag => (
                                        <Badge key={tag} variant="outline" className="px-4 py-2 text-sm bg-white">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar Info */}
                        <aside className="space-y-6">
                            <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                                <h3 className="font-bold text-xl">Información de contacto</h3>
                                
                                <div className="space-y-4">
                                    {entry.email && (
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</p>
                                                <a href={`mailto:${entry.email}`} className="hover:text-primary transition-colors truncate">{entry.email}</a>
                                            </div>
                                        </div>
                                    )}
                                    {entry.phone && (
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono</p>
                                                <span>{entry.phone}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t space-y-4">
                                    <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400">Redes sociales</h4>
                                    <div className="flex gap-4">
                                        {entry.socialLinks?.instagram && (
                                            <a href={entry.socialLinks.instagram} className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <Instagram className="h-6 w-6" />
                                            </a>
                                        )}
                                        {entry.socialLinks?.facebook && (
                                            <a href={entry.socialLinks.facebook} className="h-12 w-12 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <Facebook className="h-6 w-6" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <Button asChild size="lg" className="w-full rounded-[2rem] h-16 text-lg font-black group text-white">
                                <Link href={`/catalog/${entry.businessId}`}>
                                    Ver Catálogo de Productos <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" />
                                </Link>
                            </Button>
                        </aside>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
