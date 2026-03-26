
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Product } from '@/models/product';
import { Loader2, Package } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function EmpaqueConfigPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [savingId, setSavingId] = useState<string | null>(null);

    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, `businesses/${user.uid}/products`);
    }, [firestore, user]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    const handleCostChange = async (productId: string, cost: number) => {
        if (!user || !firestore) return;
        setSavingId(productId);
        const productRef = doc(firestore, `businesses/${user.uid}/products`, productId);
        await updateDocumentNonBlocking(productRef, { packagingCost: cost });
        setSavingId(null);
        toast({ title: 'Costo actualizado' });
    };

    const handleToggle = async (productId: string, currentCost: number | undefined) => {
        if (!user || !firestore) return;
        setSavingId(productId);
        const productRef = doc(firestore, `businesses/${user.uid}/products`, productId);
        // If it's currently off (or undefined), set a default. If on, set to 0.
        const newCost = (currentCost ?? 0) > 0 ? 0 : 500;
        await updateDocumentNonBlocking(productRef, { packagingCost: newCost });
        setSavingId(null);
        toast({ title: `Empaque ${newCost > 0 ? 'habilitado' : 'deshabilitado'}` });
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Empaque por Producto</CardTitle>
                    <CardDescription>
                        Configura qué productos requieren empaque y su costo. Este valor se sumará al total del cliente en el carrito.
                    </CardDescription>
                </CardHeader>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : products && products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {products.map(product => {
                        const hasPackaging = (product.packagingCost ?? 0) > 0;
                        return (
                            <Card key={product.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                                            <Image src={product.images[0] || 'https://picsum.photos/seed/product/200'} alt={product.name} fill sizes="4rem" className="object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-semibold line-clamp-2">{product.name}</p>
                                            <p className="text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <Label htmlFor={`pack-switch-${product.id}`} className="text-sm">¿Lleva empaque?</Label>
                                            <Switch
                                                id={`pack-switch-${product.id}`}
                                                checked={hasPackaging}
                                                onCheckedChange={() => handleToggle(product.id, product.packagingCost)}
                                                disabled={savingId === product.id}
                                            />
                                        </div>
                                        {hasPackaging && (
                                            <div className="space-y-2">
                                                <Label htmlFor={`cost-input-${product.id}`} className="text-sm">Costo del empaque</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        id={`cost-input-${product.id}`}
                                                        type="number"
                                                        defaultValue={product.packagingCost}
                                                        onBlur={(e) => handleCostChange(product.id, Number(e.target.value))}
                                                        disabled={savingId === product.id}
                                                    />
                                                    {savingId === product.id && <Loader2 className="h-4 w-4 animate-spin" />}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Total cliente: {formatCurrency(product.price + (product.packagingCost ?? 0))}
                                                </p>
                                            </div>
                                        )}
                                        {!hasPackaging && savingId !== product.id && (
                                            <p className="text-xs text-center text-muted-foreground py-2">
                                                Sin costo de empaque configurado.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
                        <Package className="h-16 w-16 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">No hay productos en tu catálogo</h3>
                        <p className="text-sm text-muted-foreground">Agrega productos en la sección "Catálogo" para configurar su empaque.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
