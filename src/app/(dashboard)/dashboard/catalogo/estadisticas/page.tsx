'use client';

import { useMemo, useEffect, useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Star, 
    TrendingUp, 
    TrendingDown, 
    Package, 
    CheckCircle, 
    CircleHelp, 
    Loader2, 
    BarChart, 
    TriangleAlert,
    Clock,
    Check
} from 'lucide-react';
import type { Product } from '@/models/product';
import type { ProductAlert } from '@/models/product-alert';
import type { AdminNotification } from '@/models/notification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ProductStatsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);

    // --- DATOS: PRODUCTOS ---
    const productsQuery = useMemoFirebase(() => 
        user ? collection(firestore, 'businesses', user.uid, 'products') : null, 
    [firestore, user]);
    const { data: products, isLoading: isProductsLoading } = useCollection<Product>(productsQuery);

    // --- DATOS: ALERTAS ---
    const alertsQuery = useMemoFirebase(() => 
        user ? query(collection(firestore, 'businesses', user.uid, 'productAlerts'), orderBy('updatedAt', 'desc')) : null,
    [firestore, user]);
    const { data: alerts, isLoading: isAlertsLoading } = useCollection<ProductAlert>(alertsQuery);

    // --- LÓGICA: DETECCIÓN Y SINCRONIZACIÓN DE ALERTAS ---
    useEffect(() => {
        if (!products || !user || !firestore || isSyncing) return;

        const syncAlerts = async () => {
            setIsSyncing(true);
            const batch = writeBatch(firestore);
            let hasChanges = false;
            const now = new Date().toISOString();

            for (const product of products) {
                const existingAlert = alerts?.find(a => a.productId === product.id);
                const meetsAlertCriteria = product.ratingCount >= 3 && product.rating < 3.0;

                // Caso 1: Nuevo problema detectado
                if (meetsAlertCriteria && (!existingAlert || existingAlert.status === 'resolved')) {
                    const alertId = existingAlert?.id || doc(collection(firestore, 'placeholder')).id;
                    const alertRef = doc(firestore, `businesses/${user.uid}/productAlerts`, alertId);
                    
                    const newAlert: Omit<ProductAlert, 'id'> = {
                        businessId: user.uid,
                        productId: product.id,
                        productName: product.name,
                        rating: product.rating,
                        ratingCount: product.ratingCount,
                        status: 'pending',
                        createdAt: existingAlert?.createdAt || now,
                        updatedAt: now,
                    };
                    
                    batch.set(alertRef, newAlert);

                    // Generar notificación en la campana
                    const notificationRef = doc(collection(firestore, `businesses/${user.uid}/notifications`));
                    const notification: Omit<AdminNotification, 'id'> = {
                        fromSuperAdmin: true, // Sistema
                        subject: '⚠️ Producto con baja valoración',
                        body: `<p>Tu producto <strong>"${product.name}"</strong> tiene una valoración promedio de <strong>${product.rating.toFixed(1)} estrellas</strong> basada en ${product.ratingCount} opiniones.</p><p>Te recomendamos revisar la calidad o descripción del mismo.</p>`,
                        read: false,
                        createdAt: now,
                        type: 'alert',
                    };
                    batch.set(notificationRef, notification);
                    hasChanges = true;
                }
                
                // Caso 2: El producto se recuperó (subió a >= 3.0)
                if (!meetsAlertCriteria && existingAlert && existingAlert.status !== 'resolved') {
                    const alertRef = doc(firestore, `businesses/${user.uid}/productAlerts`, existingAlert.id);
                    batch.update(alertRef, { 
                        status: 'resolved',
                        updatedAt: now,
                        rating: product.rating,
                        ratingCount: product.ratingCount
                    });
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                try {
                    await batch.commit();
                } catch (e) {
                    console.error("Error syncing alerts:", e);
                }
            }
            setIsSyncing(false);
        };

        syncAlerts();
    }, [products, alerts, user, firestore, isSyncing]);

    // --- LÓGICA: ESTADÍSTICAS ---
    const stats = useMemo(() => {
        if (!products) return null;

        const ratedProducts = products.filter(p => p.ratingCount > 0);
        const unratedProducts = products.filter(p => p.ratingCount === 0);
        
        const bestRated = [...ratedProducts].sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.ratingCount - a.ratingCount;
        }).slice(0, 8);

        const worstRated = [...ratedProducts].sort((a, b) => {
            if (a.rating !== b.rating) return a.rating - b.rating;
            return b.ratingCount - a.ratingCount;
        }).slice(0, 8);

        const totalRatingSum = ratedProducts.reduce((acc, p) => acc + p.rating, 0);
        const avgCatalogRating = ratedProducts.length > 0 ? totalRatingSum / ratedProducts.length : 0;

        return {
            total: products.length,
            ratedCount: ratedProducts.length,
            unratedCount: unratedProducts.length,
            avgRating: avgCatalogRating,
            bestRated,
            worstRated,
            unratedList: unratedProducts.slice(0, 8)
        };
    }, [products]);

    const handleMarkAsReviewed = async (alertId: string) => {
        if (!user || !firestore) return;
        try {
            const alertRef = doc(firestore, `businesses/${user.uid}/productAlerts`, alertId);
            await updateDocumentNonBlocking(alertRef, { 
                status: 'reviewed',
                updatedAt: new Date().toISOString()
            });
            toast({ title: "Alerta actualizada", description: "El producto ha sido marcado como revisado." });
        } catch (e) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar la alerta." });
        }
    };

    if (isProductsLoading || isAlertsLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!stats || stats.total === 0) {
        return (
            <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Estadísticas de Productos</CardTitle>
                        <CardDescription>Aún no tienes productos registrados para generar estadísticas.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const kpis = [
        { title: "Total productos", value: stats.total, icon: Package },
        { title: "Productos valorados", value: stats.ratedCount, icon: CheckCircle },
        { title: "Sin valoraciones", value: stats.unratedCount, icon: CircleHelp },
        { title: "Promedio catálogo", value: stats.avgRating.toFixed(1), icon: Star },
    ];

    const activeAlerts = alerts?.filter(a => a.status !== 'resolved') || [];

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-2">
                        <BarChart className="h-8 w-8 text-primary" />
                        Análisis de Catálogo
                    </CardTitle>
                    <CardDescription className="text-lg">Monitorea la satisfacción de tus clientes y el rendimiento de tus productos.</CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map(kpi => (
                    <Card key={kpi.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.title}</CardTitle>
                            <kpi.icon className={cn("h-4 w-4 text-primary")} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* --- SECCIÓN: PRODUCTOS QUE REQUIEREN ATENCIÓN --- */}
            {activeAlerts.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/20">
                    <CardHeader>
                        <CardTitle className="text-orange-700 flex items-center gap-2">
                            <TriangleAlert className="h-5 w-5" />
                            Productos que requieren atención
                        </CardTitle>
                        <CardDescription>Productos con una valoración menor a 3.0 basada en 3 o más opiniones.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activeAlerts.map(alert => (
                                <div key={alert.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-orange-100 rounded-xl gap-4">
                                    <div className="space-y-1">
                                        <p className="font-bold text-gray-900">{alert.productName}</p>
                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1 text-orange-600">
                                                <Star className="h-3 w-3 fill-orange-600" />
                                                <span className="font-black">{alert.rating.toFixed(1)}</span>
                                                <span className="opacity-70">({alert.ratingCount} votos)</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>Última actualización: {format(new Date(alert.updatedAt), 'dd/MM/yyyy', { locale: es })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <Badge variant={alert.status === 'reviewed' ? 'secondary' : 'destructive'} className="capitalize">
                                            {alert.status === 'reviewed' ? 'Revisado' : 'Requiere revisión'}
                                        </Badge>
                                        {alert.status === 'pending' && (
                                            <Button size="sm" variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => handleMarkAsReviewed(alert.id)}>
                                                <Check className="h-4 w-4 mr-1" /> Marcar revisado
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Mejor Valorados */}
                <Card className="border-green-100">
                    <CardHeader className="bg-green-50/50 border-b border-green-100">
                        <CardTitle className="text-base flex items-center gap-2 text-green-700 font-bold">
                            <TrendingUp className="h-5 w-5" /> Productos Estrella
                        </CardTitle>
                        <CardDescription className="text-green-600/70">Tus artículos con mejores calificaciones.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {stats.bestRated.length > 0 ? stats.bestRated.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                                    <span className="text-sm font-bold text-gray-800 line-clamp-1">{p.name}</span>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-4 bg-green-100 text-green-700 px-2 py-1 rounded-md">
                                        <Star className="h-3 w-3 fill-green-700" />
                                        <span className="text-xs font-black">{p.rating.toFixed(1)} <span className="font-medium opacity-70">({p.ratingCount})</span></span>
                                    </div>
                                </div>
                            )) : <div className="p-8 text-center text-sm text-muted-foreground italic">No hay productos valorados aún.</div>}
                        </div>
                    </CardContent>
                </Card>

                {/* Peor Valorados */}
                <Card className="border-red-100">
                    <CardHeader className="bg-red-50/50 border-b border-red-100">
                        <CardTitle className="text-base flex items-center gap-2 text-red-700 font-bold">
                            <TrendingDown className="h-5 w-5" /> Requieren Atención
                        </CardTitle>
                        <CardDescription className="text-red-600/70">Productos con calificaciones bajas.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                             {stats.worstRated.length > 0 ? stats.worstRated.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                                    <span className="text-sm font-bold text-gray-800 line-clamp-1">{p.name}</span>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-4 bg-red-100 text-red-700 px-2 py-1 rounded-md">
                                        <Star className="h-3 w-3 fill-red-700" />
                                        <span className="text-xs font-black">{p.rating.toFixed(1)} <span className="font-medium opacity-70">({p.ratingCount})</span></span>
                                    </div>
                                </div>
                            )) : <div className="p-8 text-center text-sm text-muted-foreground italic">No hay productos valorados aún.</div>}
                        </div>
                    </CardContent>
                </Card>

                {/* Sin Valoraciones */}
                <Card className="border-gray-200">
                    <CardHeader className="bg-gray-50 border-b border-gray-200">
                        <CardTitle className="text-base flex items-center gap-2 text-gray-700 font-bold">
                            <CircleHelp className="h-5 w-5" /> Sin valoraciones
                        </CardTitle>
                        <CardDescription>Anima a tus clientes a calificar estos ítems.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {stats.unratedList.length > 0 ? stats.unratedList.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-4 hover:bg-muted/30 transition-colors">
                                    <span className="text-sm font-bold text-gray-800 line-clamp-1">{p.name}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0 ml-4">Sin votos</span>
                                </div>
                            )) : <div className="p-8 text-center text-sm text-muted-foreground italic">Todos tus productos tienen votos. ¡Excelente!</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
