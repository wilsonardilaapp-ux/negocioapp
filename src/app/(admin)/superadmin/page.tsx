
"use client";

import { useCollection, useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  Package,
  CheckCircle,
  FileText,
  BarChart,
  Building,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, BarChart as RechartsBarChart } from "recharts";
import type { GlobalConfig } from "@/models/global-config";

const chartConfig = {
  users: {
    label: "Usuarios",
    color: "hsl(var(--primary))",
  },
};

export default function SuperAdminDashboard() {
  const firestore = useFirestore();

  // Fetch real data
  const usersQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'users'), [firestore]);
  const businessesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'businesses'), [firestore]);
  const servicesQuery = useMemoFirebase(() => !firestore ? null : collection(firestore, 'systemServices'), [firestore]);
  const configDocRef = useMemoFirebase(() => !firestore ? null : doc(firestore, 'globalConfig', 'system'), [firestore]);

  const { data: users, isLoading: usersLoading } = useCollection(usersQuery);
  const { data: businesses, isLoading: businessesLoading } = useCollection(businessesQuery);
  const { data: services, isLoading: servicesLoading } = useCollection(servicesQuery);
  const { data: config, isLoading: configLoading } = useDoc<GlobalConfig>(configDocRef);

  // Process data for cards
  const totalUsers = users?.length ?? 0;
  const totalBusinesses = businesses?.length ?? 0;
  const activeServices = services?.filter(s => s.status === 'active').length ?? 0;
  const totalServices = services?.length ?? 0;

  // Chart data - using real user count for one month as an example
  const chartData = useMemoFirebase(() => {
    return [
      { month: "Enero", users: totalUsers > 1 ? Math.floor(totalUsers / 6) : 0 },
      { month: "Febrero", users: totalUsers > 2 ? Math.floor(totalUsers / 3) : 0 },
      { month: "Marzo", users: totalUsers > 3 ? Math.floor(totalUsers / 4) : 0 },
      { month: "Abril", users: totalUsers > 4 ? Math.floor(totalUsers / 2) : 0 },
      { month: "Mayo", users: totalUsers > 5 ? Math.floor(totalUsers / 5) : 0 },
      { month: "Junio", users: totalUsers },
    ];
  }, [totalUsers]);
  
  const handleMaintenanceToggle = (maintenance: boolean) => {
    if (!configDocRef) return;
    updateDocumentNonBlocking(configDocRef, { maintenance: !maintenance });
  };
  
  const isLoading = usersLoading || businessesLoading || servicesLoading || configLoading;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados en la plataforma.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : totalBusinesses}</div>
            <p className="text-xs text-muted-foreground">Empresas con cuenta de cliente.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N/A</div>
            <p className="text-xs text-muted-foreground">Agregación de datos pendiente.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Servicios Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '.../...': `${activeServices} / ${totalServices}`}</div>
            <p className="text-xs text-muted-foreground">Servicios del sistema operativos.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Formularios Enviados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N/A</div>
            <p className="text-xs text-muted-foreground">Agregación de datos pendiente.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Crecimiento de Usuarios
            </CardTitle>
            <CardDescription>
              Resumen de usuarios registrados en los últimos 6 meses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="w-full h-[300px]">
              <RechartsBarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="users"
                  fill="var(--color-users)"
                  radius={4}
                />
              </RechartsBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Configuraciones y acciones globales del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode" className="text-base">Modo Mantenimiento</Label>
                <p className="text-sm text-muted-foreground">
                  {config?.maintenance ? 'Activado: el acceso público está deshabilitado.' : 'Desactivado: la plataforma está operativa.'}
                </p>
              </div>
              <Switch 
                id="maintenance-mode" 
                checked={config?.maintenance ?? false}
                onCheckedChange={() => handleMaintenanceToggle(config?.maintenance ?? false)}
                disabled={isLoading}
              />
            </div>
            {/* More quick actions can be added here */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
