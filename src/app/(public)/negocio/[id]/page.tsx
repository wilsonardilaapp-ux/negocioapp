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
    Twitter,
    MessageSquareQuote
} from 'lucide-react';
import { WhatsAppIcon, TikTokIcon, XIcon, FacebookIcon, InstagramIcon } from '@/components/icons';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Business } from '@/models/business';
import type { Metadata } from 'next';
import FaviconInjector from '@/components/layout/FaviconInjector';
import { BusinessRatingForm } from '@/components/directory/BusinessRatingForm';
import type { DirectoryRating } from '@/models/directory-rating';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import BusinessCatalogQR from '@/components/directory/BusinessCatalogQR';

export const dynamic = 'force-dynamic';

type BusinessWithSocial = Business & {
    socialTiktok?: string;
    socialInstagram?: string;
    socialFacebook?: string;
    socialWhatsapp?: string;
    socialTwitter?: string;
    socialYoutube?: string;
    shortDescription?: string;
    subcategory?: string;
};

async function getBusinessEntry(id: string) {
    try {
        const db = await getAdminFirestore();
        const businessDoc = await db.collection('businesses').doc(id).get();
        if (!businessDoc.exists) return null;
        
        const data = businessDoc.data() as BusinessWithSocial;
        if (data.status !== 'active') return null;

        const catalogSnap = await db.collection("businesses").doc(id).collection("publicData").doc("catalog").get();
        let additionalData: Partial<BusinessWithSocial> = {};
        
        if (catalogSnap.exists) {
            const catalog = catalogSnap.data();
            const socialLinks = catalog?.headerConfig?.socialLinks;
            const businessInfo = catalog?.headerConfig?.businessInfo;
            
            if (socialLinks) {
                const cleanValue = (val: any) => (typeof val === 'string' && val.trim().length > 0) ? val.trim() : undefined;
                additionalData = {
                    socialInstagram: cleanValue(socialLinks.instagram),
                    socialFacebook: cleanValue(socialLinks.facebook),
                    socialTiktok: cleanValue(socialLinks.tiktok),
                    socialTwitter: cleanValue(socialLinks.twitter),
                    socialYoutube: cleanValue(socialLinks.youtube),
                    socialWhatsapp: cleanValue(socialLinks.whatsapp),
                    shortDescription: cleanValue(businessInfo?.shortDescription),
                    category: data.category || cleanValue(businessInfo?.category),
                    subcategory: data.subcategory || cleanValue(businessInfo?.subcategory)
                };
            }
        }
        
        return { ...data, ...additionalData, id: businessDoc.id };
    } catch (error) {
        console.error("Error fetching entry:", error);
        return null;
    }
}

async function getPublishedRatings(businessId: string) {
    try {
        const db = await getAdminFirestore();
        const snapshot = await db.collection('directoryRatings')
            .where('businessId', '==', businessId)
            .where('status', '==', 'published')
            .limit(20)
            .get();

        if (snapshot.empty) return [];

        const ratings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectoryRating));
        
        return ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error("Error fetching ratings:", error);
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

export async function generateMetadata({ params }: { params: { id: string } }) {
    const entry = await getBusinessEntry(params.id);
    if (!entry) return { title: 'Negocio no encontrado' };
    return {
        title: `${entry.name} | Directorio Markix`,
        description: entry.description?.substring(0, 160),
    };
}

export default async function BusinessProfilePage({ params }: { params: { id: string } }) {
    const [entry, ratings, globalFavicon] = await Promise.all([
        getBusinessEntry(params.id),
        getPublishedRatings(params.id),
        getGlobalFavicon()
    ]);

    if (!entry) notFound();

    // FIX: Prioridad corregida. Negocio primero, plataforma como fallback.
    const faviconUrl = entry.faviconUrl || entry.logoURL || globalFavicon || null;

    const navigation = {
        enabled: true,
        links: [
            { id: '1', text: 'Sobre nosotros', url: '#', enabled: true, openInNewTab: false },
            { id: '2', text: 'Catálogo', url: '#', enabled: true, openInNewTab: false },
            { id: '3', text: 'Opiniones', url: '#ratings-section', enabled: true, openInNewTab: false },
            { id: '4', text: 'Contacto', url: '#', enabled: true, openInNewTab: false },
        ],
        logoUrl: entry.logoURL,
        businessName: entry.name,
        logoAlt: entry.name,
        logoWidth: 120,
        logoAlignment: 'left' as const,
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        hoverColor: '#4CAF50',
        fontSize: 16,
        spacing: 4,
        useShadow: true,
    };

    return (
        <div className="min-h-screen bg-gray-50/30 flex flex-col">
            <FaviconInjector faviconUrl={faviconUrl} title={`${entry.name} | Directorio Markix`} />
            <Header businessId={entry.id} navigation={navigation} />
            
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
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight">{entry.name}</h1>
                                        {(entry.directoryStatus === 'approved') && (
                                            <Badge className="bg-blue-500 text-white gap-1 py-1 border-none shadow-sm">
                                                <CheckCircle2 className="h-3 w-3" /> Verificado
                                            </Badge>
                                        )}
                                    </div>
                                    {entry.shortDescription && (
                                        <p className="text-lg md:text-xl text-gray-600 font-medium">{entry.shortDescription}</p>
                                    )}
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-6 text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                        <span className="font-bold text-gray-900">{(entry.rating || 5).toFixed(1)}</span>
                                        <span>({entry.reviewCount || 0} reseñas)</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary" className="font-bold">{entry.category || 'Servicios'}</Badge>
                                        {entry.subcategory && <Badge variant="outline" className="font-bold border-muted">{entry.subcategory}</Badge>}
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
                                                <WhatsAppIcon className="h-5 w-5" /> WhatsApp
                                            </a>
                                        </Button>
                                    )}
                                    <Button asChild variant="outline" className="gap-2 font-bold">
                                        <a href="#ratings-section">
                                            <Star className="h-5 w-5 text-primary" /> Calificar Negocio
                                        </a>
                                    </Button>
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
                                <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">{entry.description}</div>
                            </section>

                            <section id="ratings-section" className="space-y-8 border-t pt-12">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <MessageSquareQuote className="h-6 w-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900">Opiniones de clientes</h2>
                                </div>

                                <BusinessRatingForm businessId={entry.id} businessName={entry.name} />

                                <div className="space-y-6">
                                    {ratings.length > 0 ? (
                                        ratings.map((rating) => (
                                            <div key={rating.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-gray-900">{rating.userName}</p>
                                                        <div className="flex items-center gap-1">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} className={cn("h-3 w-3", i < rating.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200")} />
                                                            ))}
                                                            <span className="text-[10px] text-muted-foreground ml-2">
                                                                {format(new Date(rating.createdAt), 'dd MMMM, yyyy', { locale: es })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 text-sm italic">"{rating.comment}"</p>
                                                {(rating.adminResponse || rating.businessResponse) && (
                                                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                                        {rating.businessResponse && (
                                                            <div>
                                                                <p className="text-[10px] font-bold text-primary uppercase">Respuesta del Negocio</p>
                                                                <p className="text-xs text-gray-600">{rating.businessResponse}</p>
                                                            </div>
                                                        )}
                                                        {rating.adminResponse && (
                                                            <div>
                                                                <p className="text-[10px] font-bold text-blue-600 uppercase">Nota de Moderación</p>
                                                                <p className="text-xs text-gray-600">{rating.adminResponse}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-10 bg-white rounded-2xl border border-dashed text-muted-foreground">
                                            Aún no hay opiniones publicadas. ¡Sé el primero en calificar!
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <aside className="space-y-6">
                            <div className="bg-white p-8 rounded-[2rem] border shadow-sm space-y-6">
                                <h3 className="font-bold text-xl">Contacto</h3>
                                <div className="space-y-4 text-sm">
                                    {entry.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary"/><span>{entry.phone}</span></div>}
                                    {entry.address && <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary"/><span>{entry.address}</span></div>}
                                    {entry.ownerEmail && <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary"/><span>{entry.ownerEmail}</span></div>}
                                </div>
                                <div className="pt-6 border-t flex flex-wrap gap-4">
                                    {entry.socialInstagram && <a href={entry.socialInstagram} target="_blank" rel="noopener noreferrer"><InstagramIcon /></a>}
                                    {entry.socialFacebook && <a href={entry.socialFacebook} target="_blank" rel="noopener noreferrer"><FacebookIcon /></a>}
                                    {entry.socialTiktok && <a href={entry.socialTiktok} target="_blank" rel="noopener noreferrer"><TikTokIcon /></a>}
                                </div>
                                
                                <BusinessCatalogQR businessId={entry.id} />
                            </div>
                            
                            <Button asChild size="lg" className="w-full rounded-[2rem] h-16 text-lg font-black group text-white bg-primary">
                                <Link href={`/catalog/${entry.id}`} target="_blank" rel="noopener noreferrer">
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
