
"use client"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { useUser, useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { FileText, ShoppingCart, MessageSquare, CheckCircle, XCircle, ShoppingBag, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { collection, doc } from "firebase/firestore";
import type { Product } from "@/models/product";
import type { ContactSubmission } from "@/models/contact-submission";
import type { LandingPageData } from "@/models/landing-page";
import type { Order } from "@/models/order";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, Pie, PieChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

    // Query for products
    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'businesses', user.uid, 'products');
    }, [firestore, user]);
    const { data: products } = useCollection<Product>(productsQuery);

    // Query for messages
    const messagesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'businesses', user.uid, 'contactSubmissions');
    }, [firestore, user]);
    const { data: messages } = useCollection<ContactSubmission>(messagesQuery);
    
    // Query for landing page status
    const landingPageRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'businesses', user.uid, 'landingPages', 'main');
    }, [firestore, user]);
    const { data: landingPage } = useDoc<LandingPageData>(landingPageRef);

    // Query for orders
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'businesses', user.uid, 'orders');
    }, [firestore, user]);
    const { data: orders } = useCollection<Order>(ordersQuery);

    const productCount = products?.length ?? 0;
    const messageCount = messages?.length ?? 0;
    const orderCount = orders?.length ?? 0;
    const isLandingPageCreated = !!landingPage;

    // --- Chart Data Processing ---
    const monthlySales = useMemo(() => {
        if (!orders) return [];
        
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const sales = new Array(12).fill(0);
        
        orders.forEach(order => {
            const date = new Date(order.orderDate);
            if (!isNaN(date.getTime())) {
                const monthIndex = date.getMonth();
                const amount = Number(order.total || order.subtotal || 0);
                sales[monthIndex] += amount;
            }
        });

        return monthNames.map((name, index) => ({
            month: name,
            total: sales[index]
        })).filter(d => d.total > 0);
    }, [orders]);

    const salesByStatus = useMemo(() => {
        if (!orders) return [];
        const statusCount: { [key: string]: number } = {};
        orders.forEach(order => {
            statusCount[order.orderStatus] = (statusCount[order.orderStatus] || 0) + 1;
        });
        return Object.entries(statusCount).map(([status, count]) => ({ status, count }));
    }, [orders]);

    const salesByProduct = useMemo(() => {
        if (!orders) return [];
        const productSales: { [key: string]: number } = {};
        orders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const name = item.productName;
                    productSales[name] = (productSales[name] || 0) + item.quantity;
                });
            } else {
                const legacyOrder = order as any;
                const name = legacyOrder.productName || 'N/A';
                const quantity = legacyOrder.quantity || 0;
                productSales[name] = (productSales[name] || 0) + quantity;
            }
        });
        return Object.entries(productSales).map(([name, quantity]) => ({ name, quantity }));
    }, [orders]);

    // --- Handlers de Exportación ---
    const handleExportExcel = () => {
        setIsExporting('excel');
        try {
            const wb = XLSX.utils.book_new();

            // Hoja 1: Ventas por Mes
            const wsSales = XLSX.utils.json_to_sheet(monthlySales.map(d => ({
                'Mes': d.month,
                'Total Ventas ($)': d.total
            })));
            XLSX.utils.book_append_sheet(wb, wsSales, "Ventas Mensuales");

            // Hoja 2: Pedidos por Estado
            const wsStatus = XLSX.utils.json_to_sheet(salesByStatus.map(d => ({
                'Estado': d.status,
                'Cantidad': d.count
            })));
            XLSX.utils.book_append_sheet(wb, wsStatus, "Estado de Pedidos");

            // Hoja 3: Productos Vendidos
            const wsProducts = XLSX.utils.json_to_sheet(salesByProduct.map(d => ({
                'Producto': d.name,
                'Unidades Vendidas': d.quantity
            })));
            XLSX.utils.book_append_sheet(wb, wsProducts, "Ranking Productos");

            XLSX.writeFile(wb, `Reporte_Negocio_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast({ title: "Excel generado", description: "El reporte se ha descargado correctamente." });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo generar el archivo Excel." });
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportPDF = async () => {
        setIsExporting('pdf');
        const element = document.getElementById('analytics-section');
        
        try {
            // Inicialización de jsPDF
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // 1. Cabecera del Reporte
            pdf.setFontSize(22);
            pdf.setTextColor(40, 40, 40);
            pdf.text("Reporte Ejecutivo de Ventas", 14, 22);
            
            pdf.setFontSize(10);
            pdf.setTextColor(100);
            pdf.text(`Fecha de emisión: ${new Date().toLocaleString('es-CO')}`, 14, 30);
            pdf.text(`Generado para: ${user?.email || 'Administrador Markix'}`, 14, 35);
            
            // Línea de separación
            pdf.setDrawColor(220);
            pdf.line(14, 40, pageWidth - 14, 40);

            // 2. Tabla de KPIs (Resumen Directo)
            const kpis = [
                ["Métrica del Negocio", "Valor Actual"],
                ["Pedidos Totales Procesados", orderCount.toString()],
                ["Productos Activos en Catálogo", productCount.toString()],
                ["Mensajes de Clientes Recibidos", messageCount.toString()]
            ];
            
            (pdf as any).autoTable({
                startY: 45,
                head: [kpis[0]],
                body: kpis.slice(1),
                theme: 'striped',
                headStyles: { fillColor: [74, 175, 80], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 4 }
            });

            const kpiTableEndY = (pdf as any).lastAutoTable.finalY || 65;

            // 3. Captura Visual de Gráfica (Intento Resiliente)
            if (element) {
                try {
                    const canvas = await html2canvas(element, { 
                        scale: 2, 
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = pageWidth - 28;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    // Solo añadir si cabe en la página
                    if (kpiTableEndY + imgHeight + 20 < 280) {
                        pdf.addImage(imgData, 'PNG', 14, kpiTableEndY + 10, imgWidth, imgHeight);
                    } else {
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 14, 20, imgWidth, imgHeight);
                    }
                } catch (canvasErr) {
                    console.warn("Fallo captura html2canvas, se omite imagen:", canvasErr);
                }
            }

            // 4. Detalle de Ventas Mensuales (Nueva Página)
            pdf.addPage();
            pdf.setFontSize(14);
            pdf.setTextColor(40);
            pdf.text("Desglose Histórico de Ventas", 14, 20);
            
            (pdf as any).autoTable({
                startY: 25,
                head: [['Mes de Operación', 'Ventas Acumuladas ($)']],
                body: monthlySales.map(d => [d.month, `$ ${d.total.toLocaleString('es-CO')}`]),
                theme: 'grid',
                headStyles: { fillColor: [59, 130, 246] },
                styles: { fontSize: 9 }
            });

            pdf.save(`Reporte_Ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`);
            toast({ title: "PDF generado", description: "El reporte ejecutivo está listo para descarga." });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({ 
                variant: "destructive", 
                title: "Error al generar PDF", 
                description: "Ocurrió un fallo técnico en la generación del documento." 
            });
        } finally {
            setIsExporting(null);
        }
    };

    const lineChartConfig = {
        total: { label: "Ventas", color: "hsl(var(--chart-1))" },
    };
     const barChartConfig = {
        count: { label: "Pedidos", color: "hsl(var(--chart-2))" },
    };
    const pieChartConfig = {
        quantity: { label: "Cantidad" },
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Bienvenido a tu Panel, {user?.displayName ?? user?.email}</CardTitle>
                    <CardDescription>
                        Desde aquí puedes gestionar tu negocio en Negocio V03.
                    </CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Editor de Landing Page</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLandingPageCreated ? (
                           <div className="flex items-center gap-2">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                                <div>
                                    <div className="text-2xl font-bold">Creada</div>
                                    <p className="text-xs text-muted-foreground">Tu página ya está configurada.</p>
                                </div>
                           </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <XCircle className="h-8 w-8 text-destructive" />
                                <div>
                                    <div className="text-2xl font-bold">No creada</div>
                                    <p className="text-xs text-muted-foreground">Crea una página atractiva para tus clientes.</p>
                                </div>
                           </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Productos en Catálogo</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{productCount}</div>
                        <p className="text-xs text-muted-foreground">{productCount === 1 ? "Tienes 1 producto en tu catálogo." : `Tienes ${productCount} productos en tu catálogo.`}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mensajes Recibidos</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{messageCount}</div>
                        <p className="text-xs text-muted-foreground">{messageCount === 0 ? "Aún no tienes mensajes de clientes." : `Has recibido ${messageCount} mensajes.`}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos Recibidos</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orderCount}</div>
                        <p className="text-xs text-muted-foreground">{orderCount === 0 ? "Aún no has recibido pedidos." : `Tienes ${orderCount} pedidos en total.`}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <CardTitle>Análisis de Ventas</CardTitle>
                        <CardDescription>Visualiza el rendimiento de tu negocio.</CardDescription>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportExcel}
                            disabled={isExporting !== null}
                            className="flex-1 md:flex-none font-bold gap-2"
                        >
                            {isExporting === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
                            Exportar Excel
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleExportPDF}
                            disabled={isExporting !== null}
                            className="flex-1 md:flex-none font-bold gap-2"
                        >
                            {isExporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-primary" />}
                            Exportar PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent id="analytics-section">
                    <Tabs defaultValue="line">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="line">Ventas por Mes</TabsTrigger>
                            <TabsTrigger value="bar">Pedidos por Estado</TabsTrigger>
                            <TabsTrigger value="pie">Productos Vendidos</TabsTrigger>
                        </TabsList>
                        <TabsContent value="line">
                            <ChartContainer config={lineChartConfig} className="h-[300px] w-full">
                                <LineChart data={monthlySales}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line dataKey="total" type="monotone" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ChartContainer>
                        </TabsContent>
                        <TabsContent value="bar">
                            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                                <BarChart data={salesByStatus}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </TabsContent>
                        <TabsContent value="pie" className="flex justify-center">
                             <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                                    <Pie data={salesByProduct} dataKey="quantity" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="hsl(var(--chart-1))" />
                                </PieChart>
                            </ChartContainer>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

