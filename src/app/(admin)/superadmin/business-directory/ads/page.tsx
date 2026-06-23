'use client';

import { useState, useRef } from 'react';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
    PlusCircle, 
    Trash2, 
    Layout, 
    ExternalLink, 
    Eye, 
    MousePointer2, 
    UploadCloud, 
    Loader2,
    Image as ImageIcon,
    ArrowLeft
} from 'lucide-react';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import { useToast } from '@/hooks/use-toast';
import type { DirectoryAd, AdFormat, AdPosition } from '@/models/directory-ad';
import { AD_FORMAT_LABELS, AD_POSITION_LABELS } from '@/models/directory-ad';
import Link from 'next/link';
import Image from 'next/image';

const initialAdState: Omit<DirectoryAd, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'clicks'> = {
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    format: 'google_display',
    position: 'top',
    active: true,
};

export default function DirectoryAdsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [newAd, setNewAd] = useState(initialAdState);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const adsQuery = useMemoFirebase(
        () => (!firestore ? null : query(collection(firestore, 'directoryAds'), orderBy('createdAt', 'desc'))),
        [firestore]
    );

    const { data: ads, isLoading } = useCollection<DirectoryAd>(adsQuery);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            try {
                const result = await uploadMedia({ mediaDataUri: reader.result as string });
                setNewAd(prev => ({ ...prev, imageUrl: result.secure_url }));
                toast({ title: "Imagen cargada con éxito" });
            } catch (error: any) {
                toast({ variant: 'destructive', title: "Error al subir", description: error.message });
            } finally {
                setIsUploading(false);
            }
        };
    };

    const handleCreateAd = async () => {
        if (!firestore || !newAd.imageUrl || !newAd.title || !newAd.linkUrl) {
            toast({ variant: 'destructive', title: "Campos incompletos", description: "La imagen, el título y el enlace son obligatorios." });
            return;
        }

        const adId = doc(collection(firestore, 'directoryAds')).id;
        const now = new Date().toISOString();
        const adData: DirectoryAd = {
            ...newAd,
            id: adId,
            views: 0,
            clicks: 0,
            createdAt: now,
            updatedAt: now,
        };

        try {
            await setDocumentNonBlocking(doc(firestore, 'directoryAds', adId), adData);
            setNewAd(initialAdState);
            setIsCreating(false);
            toast({ title: "Anuncio creado", description: "El anuncio ya está disponible en el sistema." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo guardar el anuncio." });
        }
    };

    const handleDeleteAd = async (id: string) => {
        if (!firestore) return;
        try {
            await deleteDocumentNonBlocking(doc(firestore, 'directoryAds', id));
            toast({ title: "Anuncio eliminado" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error al eliminar" });
        }
    };

    const handleToggleActive = (ad: DirectoryAd) => {
        if (!firestore) return;
        const adRef = doc(firestore, 'directoryAds', ad.id);
        updateDocumentNonBlocking(adRef, { active: !ad.active, updatedAt: new Date().toISOString() });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/superadmin/business-directory">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight">Gestión de Publicidad</h1>
                        <p className="text-muted-foreground text-sm">Configura banners y anuncios para el directorio de negocios.</p>
                    </div>
                </div>
                <Button onClick={() => setIsCreating(true)} className="font-bold">
                    <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Anuncio
                </Button>
            </div>

            {isCreating && (
                <Card className="border-primary bg-primary/5 animate-in fade-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle>Crear Nuevo Anuncio</CardTitle>
                        <CardDescription>Define el formato y la posición del anuncio en el directorio.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <Label>Título Interno</Label>
                                <Input 
                                    placeholder="Ej. Promo Mes del Bienestar" 
                                    value={newAd.title}
                                    onChange={e => setNewAd(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label>URL de Destino</Label>
                                <Input 
                                    placeholder="https://..." 
                                    value={newAd.linkUrl}
                                    onChange={e => setNewAd(prev => ({ ...prev, linkUrl: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Formato</Label>
                                    <Select value={newAd.format} onValueChange={(v: AdFormat) => setNewAd(prev => ({ ...prev, format: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(AD_FORMAT_LABELS).map(([val, label]) => (
                                                <SelectItem key={val} value={val}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Posición</Label>
                                    <Select value={newAd.position} onValueChange={(v: AdPosition) => setNewAd(prev => ({ ...prev, position: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(AD_POSITION_LABELS).map(([val, label]) => (
                                                <SelectItem key={val} value={val}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label>Imagen del Anuncio</Label>
                            <div 
                                className="relative aspect-video border-2 border-dashed rounded-xl flex items-center justify-center bg-background cursor-pointer overflow-hidden group"
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                ) : newAd.imageUrl ? (
                                    <Image src={newAd.imageUrl} alt="Preview" fill className="object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <UploadCloud className="h-10 w-10" />
                                        <span className="text-xs font-bold uppercase">Subir Imagen</span>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
                            <p className="text-[10px] text-muted-foreground text-center">Recomendado: Google Display (728x90) | Meta Feed (1080x1080)</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 bg-background/50 border-t py-3">
                        <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
                        <Button onClick={handleCreateAd}>Publicar Anuncio</Button>
                    </CardFooter>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-full py-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" /></div>
                ) : ads?.length ? (
                    ads.map(ad => (
                        <Card key={ad.id} className={cn("overflow-hidden group", !ad.active && "opacity-60")}>
                            <div className="relative aspect-[16/6] bg-muted">
                                <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                                <div className="absolute top-2 right-2">
                                    <Badge className={ad.active ? "bg-green-500" : "bg-gray-500"}>
                                        {ad.active ? "Activo" : "Pausado"}
                                    </Badge>
                                </div>
                            </div>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg line-clamp-1">{ad.title}</h3>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <Badge variant="outline" className="text-[10px]">{AD_FORMAT_LABELS[ad.format]}</Badge>
                                        <Badge variant="secondary" className="text-[10px]">{AD_POSITION_LABELS[ad.position]}</Badge>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">{ad.views}</span>
                                            <span className="text-[9px] uppercase text-muted-foreground">Vistas</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold">{ad.clicks}</span>
                                            <span className="text-[9px] uppercase text-muted-foreground">Clics</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-4 pt-0 flex gap-2">
                                <div className="flex items-center gap-2 mr-auto">
                                    <Switch checked={ad.active} onCheckedChange={() => handleStatusToggle(ad)} />
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteAd(ad.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <Card className="col-span-full py-20 border-dashed">
                        <div className="flex flex-col items-center text-center gap-4">
                            <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
                            <p className="text-muted-foreground">No hay campañas publicitarias activas.</p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );

    function cn(...classes: any[]) {
        return classes.filter(Boolean).join(" ");
    }

    function handleStatusToggle(ad: DirectoryAd) {
        if (!firestore) return;
        updateDocumentNonBlocking(doc(firestore, 'directoryAds', ad.id), { 
            active: !ad.active,
            updatedAt: new Date().toISOString()
        });
    }
}
