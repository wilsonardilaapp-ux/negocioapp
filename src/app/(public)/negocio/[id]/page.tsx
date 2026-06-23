
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
import type { Business } from '@/models/business';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

async function getBusinessEntry(id: string) {
    try {
        const db = await getAdminFirestore();
        // Consultamos directamente por el ID del documento de Firestore
        const doc = await db.collection('businesses').doc(id).get();
        
        if (!doc.exists) return null;
        
        const data = doc.data() as Business;
        
        // El único campo obligatorio para visualización es que el negocio esté activo
        if (data.status !== 'active') {
            return null;
        }
        
        return { id: doc.id, ...data };
    } catch (error) {
        console.error("Error fetching entry:", error);
        return null;
    }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const entry = await getBusinessEntry(params.id);
    if (!entry) return { title: 'Negocio no encontrado' };

    return {
        title: `${entry.name} | Directorio Zentry`,
        description: entry.description?.substring(0, 160),
    };
}

export default async function BusinessProfilePage({ params }: { params: { id: string } }) {
    const entry = await getBusinessEntry(params.id);

    if (!entry) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <Header businessId={entry.id} navigation={null} />
            
            <main className="flex-grow">
                <div className="bg-white border-b">
                    <div className="container mx-auto px-4 py-12 md:py-20">
                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                            <div className="relative h-32 w-32 md:h-48 md:w-48 rounded-3xl overflow-hidden border shadow-xl shrink-0 bg-gray-50">
                                {entry.logoURL ? (
                                    <Image src={entry.logoURL} alt={entry.name} fill className="object-cover" />
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
                                    <Badge className="bg-blue-500 text-white gap-1 py-1 border-none shadow-sm">
                                        <CheckCircle2 className="h-3 w-3" /> Verificado
                                    </Badge>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-6 text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-bold text-gray-900">{(entry.rating || 5).toFixed(1)}</span>
                                        <span>({entry.reviewCount || 0} reseñas)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="secondary" className="font-bold">
                                            {entry.category || 'Servicios'}
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
                                        <Button asChild className="gap-2 font-bold shadow-lg shadow-green-100 bg-[#25D366] hover:bg-[#128C7E] text-white border-none">
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
                        <div className="lg:col-span-2 space-y-12">
                            <section className="space-y-4">
                                <h2 className="text-2xl font-black text-gray-900">Sobre nosotros</h2>
                                <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">
                                    {entry.description}
                                </div>
                            </section>

                            {entry.tags && entry.tags.length > 0 && (
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
                            )}
                        </div>

                        <aside className="space-y-6">
                            <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                                <h3 className="font-bold text-xl">Información de contacto</h3>
                                <div className="space-y-4">
                                    {entry.ownerEmail && (
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</p>
                                                <span className="truncate block">{entry.ownerEmail}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {entry.socialLinks && (
                                    <div className="pt-6 border-t space-y-4">
                                        <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400">Redes sociales</h4>
                                        <div className="flex gap-4">
                                            {entry.socialLinks.instagram && (
                                                <a href={entry.socialLinks.instagram} className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                    <Instagram className="h-6 w-6" />
                                                </a>
                                            )}
                                            {entry.socialLinks.facebook && (
                                                <a href={entry.socialLinks.facebook} className="h-12 w-12 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                    <Facebook className="h-6 w-6" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <Button asChild size="lg" className="w-full rounded-[2rem] h-16 text-lg font-black group text-white bg-primary">
                                <Link href={`/catalog/${entry.id}`}>
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
