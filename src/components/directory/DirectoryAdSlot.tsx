'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, getDocs, limit, increment } from 'firebase/firestore';
import type { DirectoryAd, AdFormat, AdPosition } from '@/models/directory-ad';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface DirectoryAdSlotProps {
    position: AdPosition;
    format: AdFormat;
    className?: string;
}

/**
 * @description Slot publicitario dinámico para el directorio. 
 * Busca anuncios activos para la posición y formato especificados.
 */
export default function DirectoryAdSlot({ position, format, className }: DirectoryAdSlotProps) {
    const firestore = useFirestore();
    const [ad, setAd] = useState<DirectoryAd | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchAd = async () => {
            try {
                const adsRef = collection(firestore, 'directoryAds');
                const q = query(
                    adsRef, 
                    where('active', '==', true),
                    where('position', '==', position),
                    where('format', '==', format),
                    limit(5) // Tomamos algunos para rotar aleatoriamente
                );

                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const randomAd = snapshot.docs[Math.floor(Math.random() * snapshot.docs.length)];
                    const adData = { id: randomAd.id, ...randomAd.data() } as DirectoryAd;
                    setAd(adData);

                    // Registrar vista de forma no bloqueante
                    updateDocumentNonBlocking(doc(firestore, 'directoryAds', adData.id), {
                        views: increment(1)
                    });
                }
            } catch (error) {
                console.error("Error loading ad slot:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAd();
    }, [firestore, position, format]);

    const handleClick = () => {
        if (!ad || !firestore) return;
        updateDocumentNonBlocking(doc(firestore, 'directoryAds', ad.id), {
            clicks: increment(1)
        });
    };

    if (isLoading) {
        return (
            <div className={cn("w-full bg-muted animate-pulse rounded-2xl", 
                format === 'google_display' ? 'h-24' : 'h-64',
                className
            )}>
                <div className="h-full w-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Publicidad</span>
                </div>
            </div>
        );
    }

    if (!ad) return null;

    return (
        <a 
            href={ad.linkUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={handleClick}
            className={cn(
                "group relative block w-full overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-xl",
                format === 'google_display' ? 'aspect-[8/1] md:aspect-[12/1]' : 'aspect-square',
                className
            )}
        >
            <div className="absolute top-2 right-2 z-10">
                <Badge className="bg-black/20 backdrop-blur-sm text-white border-none text-[8px] font-bold uppercase py-0 px-1.5 h-4">Patrocinado</Badge>
            </div>
            
            <Image 
                src={ad.imageUrl} 
                alt={ad.title} 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <p className="text-white text-xs font-bold flex items-center gap-1">
                    {ad.title} <ExternalLink className="h-3 w-3" />
                </p>
            </div>
        </a>
    );
}
