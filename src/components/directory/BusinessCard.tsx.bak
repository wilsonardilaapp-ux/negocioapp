
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BusinessCardProps {
    entry: any; // Usamos any para permitir la transición fluida entre modelos
}

export default function BusinessCard({ entry }: BusinessCardProps) {
    // Normalización de campos: manejar tanto logoUrl como logoURL
    const logo = entry.logoUrl || entry.logoURL || null;
    const name = entry.name || 'Negocio';
    const rating = entry.rating || 5;
    const reviewCount = entry.reviewCount || 0;

    return (
        <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-100 h-full flex flex-col">
            <div className="relative aspect-video w-full bg-muted overflow-hidden">
                {logo ? (
                    <Image 
                        src={logo} 
                        alt={name} 
                        fill 
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                        <span className="text-4xl font-bold">{name.charAt(0)}</span>
                    </div>
                )}
                {entry.featured && (
                    <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600 border-none shadow-sm">
                        Destacado
                    </Badge>
                )}
            </div>
            
            <CardContent className="p-5 flex-grow space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
                                {name}
                            </h3>
                            {(entry.isVerified || entry.directoryStatus === 'approved') && (
                                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                            {entry.category || 'Comercio'}
                        </Badge>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {entry.description || 'Sin descripción disponible.'}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-foreground">{rating.toFixed(1)}</span>
                        <span>({reviewCount})</span>
                    </div>
                    {entry.address && (
                        <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{entry.address}</span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-5 pt-0">
                <Button asChild className="w-full font-bold" variant="outline">
                    <Link href={`/negocio/${entry.id}`} target="_blank" rel="noopener noreferrer">
                        Ver Perfil
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
