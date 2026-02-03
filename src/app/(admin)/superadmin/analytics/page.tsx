
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell } from "recharts";
import { Building, TestTube, Users, FileText, ShoppingCart, Loader2, DollarSign } from "lucide-react";
import type { User } from "@/models/user";
import type { Order } from "@/models/order";
import { useEffect, useState } from "react";
import type { Product } from "@/models/product";
import type { LandingPageData } from "@/models/landing-page";
import type { ContactSubmission } from "@/models/contact-submission";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export default function AnalyticsPage() {
  const firestore = useFirestore();

  // State for aggregated data
  const [aggregatedData, setAggregatedData] = useState<{
    landingPages: LandingPageData[],
    submissions: ContactSubmission[],
    products: Product[],
    orders: Order[]
  }>({
    landingPages: [],
    submissions: [],
    products: [],
    orders: [],
  });
  const [isAggregating, setIsAggregating] = useState(true);

  // Queries for top-level collections
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const businessesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'businesses') : null, [firestore]);

  const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);
  const { data: businesses, isLoading: businessesLoading } = useCollection(businessesQuery);

  // Effect to fetch and aggregate sub-collection data
  useEffect(() => {
    if (!firestore || !businesses) return;

    const aggregateSubcollections = async () => {
        setIsAggregating(true);
        const allLandingPages: LandingPageData[] = [];
        const allSubmissions: ContactSubmission[] = [];
        const allProducts: Product[] = [];
        const allOrders: Order[] = [];

        for (const business of businesses) {
            const pagesQuery = query(collection(firestore, 'businesses', business.id, 'landingPages'));
            const submissionsQuery = query(collection(firestore, 'businesses', business.id, 'contactSubmissions'));
            const productsQuery = query(collection(firestore, 'businesses', business.id, 'products'));
            const ordersQuery = query(collection(firestore, 'businesses', business.id, 'orders'));

            const [pagesSnap, submissionsSnap, productsSnap, ordersSnap] = await Promise.all([
                getDocs(pagesQuery),
                getDocs(submissionsQuery),
                getDocs(productsQuery),
                getDocs(ordersQuery),
            ]);

            pagesSnap.forEach(doc => allLandingPages.push({ ...doc.data() as LandingPageData, id: doc.id } as any));
            submissionsSnap.forEach(doc => allSubmissions.push({ ...doc.data() as ContactSubmission, id: doc.id } as any));
            productsSnap.forEach(doc => allProducts.push({ ...doc.data() as Product, id: doc.id } as any));
            ordersSnap.forEach(doc => allOrders.push({ ...doc.data() as Order, id: doc.id } as any));
        }

        setAggregatedData({
            landingPages: allLandingPages,
            submissions: allSubmissions,
            products: allProducts,
            orders: allOrders,
        });
        setIsAggregating(false);
    };

    aggregateSubcollections();
  }, [firestore, businesses]);

  const isLoading = usersLoading || businessesLoading || isAggregating;

  const totalSales = useMemoFirebase(() => {
    if (!aggregatedData.orders) return 0;
    return aggregatedData.orders.reduce((acc, order) => acc + order.subtotal, 0);
  }, [aggregatedData.orders]);

  const kpiData = [
      { title: "Empresas Registradas", value: businesses?.length.toString() ?? "0", icon: Building, change: "+15.2%", period: "el último mes" },
      { title: "Landing Pages", value: aggregatedData.landingPages.length.toString(), icon: TestTube, change: "+8.9%", period: "esta semana" },
      { title: "Envíos de Formularios", value: aggregatedData.submissions.length.toString(), icon: FileText, change: "+112", period: "hoy" },
      { title: "Productos en Catálogo", value: aggregatedData.products.length.toString(), icon: ShoppingCart, change: "+0", period: "esta semana" },
      { title: "Nuevos Usuarios", value: users?.length.toString() ?? "0", icon: Users, change: "+22.5%", period: "el último mes" },
      { title: "Ventas Totales", value: formatCurrency(totalSales), icon: DollarSign, change: "+12%", period: "el último mes" },
  ];

  // --- Chart Data Processing ---
  const userGrowthData = useMemoFirebase(() => {
    if (!users) return [];
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthlyCounts: { [key: string]: number } = {};

    users.forEach(user => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const month = monthNames[date.getMonth()];
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
      }
    });

    return monthNames.map(month => ({ month, count: monthlyCounts[month] || 0 }));
  }, [users]);
  
  const contentOverviewData = useMemoFirebase(() => {
      return [
        { name: 'Empresas', count: businesses?.length ?? 0 },
        { name: 'Landing Pages', count: aggregatedData.landingPages.length },
        { name: 'Productos', count: aggregatedData.products.length },
        { name: 'Formularios', count: aggregatedData.submissions.length },
      ];
  }, [businesses, aggregatedData]);
  
  const userRolesData = useMemoFirebase(() => {
    if (!users) return [];
    const roleCounts: { [key: string]: number } = {};
    users.forEach(user => {
        const roleName = user.role === 'super_admin' ? 'Super Admin' : 'Cliente Admin';
        roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
    });
    return Object.entries(roleCounts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
  
  const chartConfig = {
      count: {
        label: "Total",
        color: "hsl(var(--chart-1))",
      },
      value: {
        label: "Usuarios",
      }
  };

  return (
    <div className="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Métricas y Analíticas</CardTitle>
                <CardDescription>
                Visualiza los indicadores clave de rendimiento (KPIs) de la plataforma Negocio V03.
                </CardDescription>
            </CardHeader>
        </Card>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpiData.map(kpi => (
                <Card key={kpi.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="text-muted-foreground text-sm">...</span>
                            </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                                <p className="text-xs text-muted-foreground">{kpi.change} {kpi.period}</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Gráficos Avanzados</CardTitle>
                <CardDescription>
                Visualiza el rendimiento de la plataforma a través de diferentes métricas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="user-growth">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="user-growth">Crecimiento de Usuarios</TabsTrigger>
                        <TabsTrigger value="content-overview">Resumen de Contenido</TabsTrigger>
                        <TabsTrigger value="user-roles">Distribución de Roles</TabsTrigger>
                    </TabsList>
                    <TabsContent value="user-growth">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <LineChart data={userGrowthData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Line dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2} dot={true} />
                            </LineChart>
                        </ChartContainer>
                    </TabsContent>
                    <TabsContent value="content-overview">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <BarChart data={contentOverviewData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </TabsContent>
                    <TabsContent value="user-roles" className="flex justify-center">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                <Pie data={userRolesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {userRolesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
}
