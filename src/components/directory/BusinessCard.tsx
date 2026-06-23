
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, CheckCircle2 } from 'lucide-react';
import type { BusinessDirectoryEntry } from '@/models/business-directory';
import { cn } from '@/lib/utils';

interface BusinessCardProps {
    entry: BusinessDirectoryEntry;
}

export default function BusinessCard({ entry }: BusinessCardProps) {
    return (
        <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-100 h-full flex flex-col">
            <div className="relative aspect-video w-full bg-muted overflow-hidden">
                {entry.logoUrl ? (
                    <Image 
                        src={entry.logoUrl} 
                        alt={entry.name} 
                        fill 
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                        <span className="text-4xl font-bold">{entry.name.charAt(0)}</span>
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
                                {entry.name}
                            </h3>
                            {entry.isVerified && (
                                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                            )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                            {entry.category}
                        </Badge>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {entry.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-foreground">{entry.rating.toFixed(1)}</span>
                        <span>({entry.reviewCount})</span>
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
                    <Link href={`/negocio/${entry.id}`}>
                        Ver Perfil
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
