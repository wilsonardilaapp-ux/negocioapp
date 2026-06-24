
'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Star, TrendingUp, TrendingDown, Package, CheckCircle, HelpCircle, Loader2, BarChart } from 'lucide-react';
import type { Product } from '@/models/product';

export default function ProductStatsPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const productsQuery = useMemoFirebase(() => 
        user ? collection(firestore, 'businesses', user.uid, 'products') : null, 
    [firestore, user]);
    
    const { data: products, isLoading } = useCollection<Product>(productsQuery);

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

    if (isLoading) {
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
        { title: "Sin valoraciones", value: stats.unratedCount, icon: HelpCircle },
        { title: "Promedio catálogo", value: stats.avgRating.toFixed(1), icon: Star },
    ];

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
                            <kpi.icon className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

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
                            <HelpCircle className="h-5 w-5" /> Sin valoraciones
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
