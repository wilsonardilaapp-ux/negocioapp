'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Product } from '@/models/product';
import { Loader2, Package } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

const ProductPackagingCard = ({ product }: { product: Product }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [packagingCost, setPackagingCost] = useState<number | undefined>(product.packagingCost);
    const [isSaving, setIsSaving] = useState(false);
    
    const hasPackaging = packagingCost !== undefined && packagingCost > 0;

    const saveCost = (cost: number) => {
        if (!user || !firestore) return;
        setIsSaving(true);
        const productRef = doc(firestore, `businesses/${user.uid}/products`, product.id);
        setDocumentNonBlocking(productRef, { packagingCost: cost }, { merge: true });
        // Simulate save time and show feedback
        setTimeout(() => {
            setIsSaving(false);
            toast({ description: `Costo de empaque para "${product.name}" guardado.` });
        }, 500);
    };

    const handleToggle = (enabled: boolean) => {
        const newCost = enabled ? 500 : 0;
        setPackagingCost(newCost);
        saveCost(newCost);
    };

    const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPackagingCost(Number(e.target.value));
    };

    return (
        <Card className="relative">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-4">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0">
                        <Image src={product.images?.[0] || 'https://picsum.photos/seed/product/200'} alt={product.name} fill sizes="4rem" className="object-cover" />
                    </div>
                    <div>
                        <p className="font-semibold line-clamp-2">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
                    </div>
                </div>
                <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                        <Label htmlFor={`pack-switch-${product.id}`} className="font-medium">¿Lleva empaque?</Label>
                        <Switch id={`pack-switch-${product.id}`} checked={hasPackaging} onCheckedChange={handleToggle} />
                    </div>
                    {hasPackaging ? (
                        <div className="space-y-2">
                             <div className="relative">
                                <Input 
                                    type="number" 
                                    value={packagingCost || ''} 
                                    onChange={handleCostChange}
                                    onBlur={(e) => saveCost(Number(e.target.value))}
                                    className="pl-7"
                                />
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            </div>
                            <p className="text-sm text-center font-semibold text-primary">
                                Total cliente: {formatCurrency(product.price + (packagingCost || 0))}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-center text-muted-foreground py-2">Sin costo de empaque configurado.</p>
                    )}
                </div>
                {isSaving && <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg"><Loader2 className="h-5 w-5 animate-spin"/></div>}
            </CardContent>
        </Card>
    );
};


export default function EmpaquePage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, `businesses/${user.uid}/products`);
    }, [firestore, user]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Empaque</CardTitle>
                    <CardDescription>
                        Configura qué productos llevan empaque y cuánto cuesta. El valor se mostrará al cliente en el carrito antes del IVA.
                    </CardDescription>
                </CardHeader>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : products && products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map(product => (
                        <ProductPackagingCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                 <Card className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold">No tienes productos</h3>
                    <p className="mt-2 text-muted-foreground">Agrega productos en el Catálogo para configurar su empaque.</p>
                </Card>
            )}
        </div>
    );
}
