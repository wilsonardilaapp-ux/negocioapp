
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, History, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import type { AffiliateConfig } from '@/models/affiliate-config';
import type { Referral } from '@/models/referral';
import type { ExtraCapacityLog } from '@/models/extra-capacity-log';
import type { Business } from '@/models/business';
import AffiliateConfigForm from './components/AffiliateConfigForm';
import ReferralsTable from './components/ReferralsTable';
import CapacityLogsTable from './components/CapacityLogsTable';

export default function AffiliatesAdminPage() {
  const { profile, isProfileLoading } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState('referrals');

  // 1. Validar acceso de Super Admin
  const isAuthorized = profile?.role === 'super_admin';

  // 2. Cargar Configuración Global
  const configRef = useMemoFirebase(() => isAuthorized ? doc(firestore, 'adminConfig', 'affiliates') : null, [firestore, isAuthorized]);
  const { data: config, isLoading: loadingConfig, error: configError } = useDoc<AffiliateConfig>(configRef);

  // 3. Cargar Negocios (para resolver nombres en tablas)
  const businessesQuery = useMemoFirebase(() => isAuthorized ? query(collection(firestore, 'businesses'), orderBy('name', 'asc')) : null, [firestore, isAuthorized]);
  const { data: businesses, isLoading: loadingBusinesses } = useCollection<Business>(businessesQuery);

  // 4. Cargar Referidos (Filtro inicial por Firestore)
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const referralsQuery = useMemoFirebase(() => {
    if (!isAuthorized) return null;
    const base = collection(firestore, 'referrals');
    if (statusFilter === 'all') return query(base, orderBy('createdAt', 'desc'));
    return query(base, where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
  }, [firestore, isAuthorized, statusFilter]);
  const { data: referrals, isLoading: loadingReferrals, error: referralsError } = useCollection<Referral>(referralsQuery);

  // 5. Cargar Logs de Capacidad
  const logsQuery = useMemoFirebase(() => isAuthorized ? query(collection(firestore, 'extraCapacityLogs'), orderBy('createdAt', 'desc')) : null, [firestore, isAuthorized]);
  const { data: logs, isLoading: loadingLogs, error: logsError } = useCollection<ExtraCapacityLog>(logsQuery);

  const anyError = configError || referralsError || logsError;
  const isPermissionError = anyError?.message?.includes('permission-denied');

  if (isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">Solo los super administradores pueden gestionar el programa de socios.</p>
      </div>
    );
  }

  if (isPermissionError) {
    return (
      <div className="p-6">
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error de Permisos
            </CardTitle>
            <CardDescription>
              No tienes permisos suficientes para leer las colecciones del programa de socios. 
              Verifica las reglas de seguridad de Firestore (Fase 4).
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-3xl font-black tracking-tight">Gestión del Programa de Socios</CardTitle>
          <CardDescription>Control global de referidos, recompensas y auditoría de capacidad.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="referrals" className="gap-2">
            <Users className="h-4 w-4" /> Referidos
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" /> Historial Logs
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" /> Configuración
          </TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-6">
          <ReferralsTable 
            referrals={referrals || []} 
            businesses={businesses || []} 
            isLoading={loadingReferrals || loadingBusinesses}
            onFilterChange={setStatusFilter}
            currentFilter={statusFilter}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <CapacityLogsTable 
            logs={logs || []} 
            businesses={businesses || []}
            isLoading={loadingLogs || loadingBusinesses}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <AffiliateConfigForm 
            config={config} 
            isLoading={loadingConfig} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
