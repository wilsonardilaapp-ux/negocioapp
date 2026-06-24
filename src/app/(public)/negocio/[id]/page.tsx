
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
    ArrowRight,
    Youtube,
    Twitter
} from 'lucide-react';
import { WhatsAppIcon, TikTokIcon, XIcon } from '@/components/icons';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Business } from '@/models/business';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Definimos un tipo extendido localmente para incluir las propiedades de redes sociales directas
type BusinessWithSocial = Business & {
    socialTiktok?: string;
    socialInstagram?: string;
    socialFacebook?: string;
    socialWhatsapp?: string;
    socialTwitter?: string;
    socialYoutube?: string;
};

async function getBusinessEntry(id: string) {
    try {
        const db = await getAdminFirestore();
        // 1. Consultamos el documento raíz para datos básicos y estatus
        const businessDoc = await db.collection('businesses').doc(id).get();
        
        if (!businessDoc.exists) return null;
        
        const data = businessDoc.data() as BusinessWithSocial;
        
        // El único campo obligatorio para visualización es que el negocio esté activo
        if (data.status !== 'active') {
            return null;
        }

        // 2. Obtener redes sociales desde la subcolección denormalizada (Donde vive la configuración real)
        const catalogSnap = await db.collection("businesses").doc(id).collection("publicData").doc("catalog").get();
        let socialData: Partial<BusinessWithSocial> = {};
        
        if (catalogSnap.exists) {
            const catalog = catalogSnap.data();
            const socialLinks = catalog?.headerConfig?.socialLinks;
            
            if (socialLinks) {
                // Función para limpiar URLs y convertirlas en undefined si están vacías
                const cleanUrl = (url: any) => {
                    if (typeof url !== 'string') return undefined;
                    const trimmed = url.trim();
                    return trimmed.length > 0 ? trimmed : undefined;
                };

                socialData = {
                    socialInstagram: cleanUrl(socialLinks.instagram),
                    socialFacebook: cleanUrl(socialLinks.facebook),
                    socialTiktok: cleanUrl(socialLinks.tiktok),
                    socialTwitter: cleanUrl(socialLinks.twitter),
                    socialYoutube: cleanUrl(socialLinks.youtube),
                    socialWhatsapp: cleanUrl(socialLinks.whatsapp),
                };
            }
        }
        
        // 3. Fusionar datos (la subcolección sobreescribe o complementa al raíz)
        return { 
            id: businessDoc.id, 
            ...data,
            ...socialData 
        };
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
                                    {entry.phone && (
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                <Phone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teléfono</p>
                                                <span className="block font-medium">{entry.phone}</span>
                                            </div>
                                        </div>
                                    )}
                                    {entry.address && (
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                <MapPin className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dirección</p>
                                                <span className="block font-medium">{entry.address}</span>
                                            </div>
                                        </div>
                                    )}
                                    {(entry.contactEmail || entry.ownerEmail) && (
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email</p>
                                                <span className="truncate block font-medium">{entry.contactEmail || entry.ownerEmail}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t space-y-4">
                                    <h4 className="font-bold text-sm uppercase tracking-widest text-gray-400">Redes sociales</h4>
                                    <div className="flex flex-wrap gap-4">
                                        {entry.socialInstagram && (
                                            <a href={entry.socialInstagram} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <Instagram className="h-6 w-6" />
                                            </a>
                                        )}
                                        {entry.socialFacebook && (
                                            <a href={entry.socialFacebook} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <Facebook className="h-6 w-6" />
                                            </a>
                                        )}
                                        {entry.socialTiktok && (
                                            <a href={entry.socialTiktok} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <TikTokIcon className="h-6 w-6" />
                                            </a>
                                        )}
                                        {(entry.socialWhatsapp || entry.phone) && (
                                            <a href={`https://wa.me/${(entry.socialWhatsapp || entry.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <WhatsAppIcon className="h-6 w-6" />
                                            </a>
                                        )}
                                        {entry.socialTwitter && (
                                            <a href={entry.socialTwitter} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-full bg-black flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <Twitter className="h-5 w-5" />
                                            </a>
                                        )}
                                        {entry.socialYoutube && (
                                            <a href={entry.socialYoutube} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-full bg-[#FF0000] flex items-center justify-center text-white hover:scale-110 transition-transform">
                                                <Youtube className="h-6 w-6" />
                                            </a>
                                        )}
                                    </div>
                                </div>
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
