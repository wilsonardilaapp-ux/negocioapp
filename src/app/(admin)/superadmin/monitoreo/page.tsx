"use client";

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import type { SystemService } from '@/models/system-service';
import { Server, CheckCircle, XCircle } from 'lucide-react';

export default function MonitoringPage() {
  const firestore = useFirestore();

  const servicesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'systemServices');
  }, [firestore]);

  const { data: services, isLoading } = useCollection<SystemService>(servicesQuery);

  const getStatusVariant = (status: string) => {
    return status === 'active' ? 'default' : 'destructive';
  };

  const getStatusIcon = (status: string) => {
    return status === 'active' 
      ? <CheckCircle className="h-4 w-4 text-green-500" /> 
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monitoreo de Servicios del Sistema</CardTitle>
          <CardDescription>
            Visualiza el estado y la salud de los servicios de la plataforma en tiempo real.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
         <Card>
            <CardContent className="p-10 flex items-center justify-center">
                <p>Cargando estado de los servicios...</p>
            </CardContent>
         </Card>
      ) : services && services.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      {service.name}
                    </CardTitle>
                    <CardDescription>
                        Última actualización: {new Date(service.lastUpdate).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(service.status)}>
                    {service.status === 'active' ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                 <div className="flex items-center justify-between space-x-2 rounded-lg border p-4 bg-secondary/50">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      Estado Actual
                    </p>
                    <p className="text-sm text-muted-foreground">
                      El servicio se encuentra actualmente {service.status === 'active' ? 'operativo' : 'inactivo'}.
                    </p>
                  </div>
                  {getStatusIcon(service.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
            <div className="p-4 bg-secondary rounded-full">
              <Server className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No hay servicios para monitorear</h3>
            <p className="text-muted-foreground max-w-sm">
              Aún no se han configurado servicios en el sistema. Ve a la sección de "Servicios" para añadir el primero.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
