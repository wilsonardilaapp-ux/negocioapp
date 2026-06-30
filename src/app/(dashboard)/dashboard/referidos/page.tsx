'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Copy, 
  Check, 
  Users, 
  TrendingUp, 
  Gift, 
  ExternalLink,
  Share2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Business } from '@/models/business';
import type { Referral } from '@/models/referral';
import type { ExtraCapacityLog } from '@/models/extra-capacity-log';
import type { AffiliateConfig } from '@/models/affiliate-config';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ReferidosPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // 1. Obtener datos del negocio actual
  const businessRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'businesses', user.uid) : null),
    [firestore, user?.uid]
  );
  const { data: business, isLoading: loadingBusiness } = useDoc<Business>(businessRef);

  // 2. Obtener configuración de afiliados
  const configRef = useMemoFirebase(
    () => doc(firestore, 'adminConfig', 'affiliates'),
    [firestore]
  );
  const { data: config } = useDoc<AffiliateConfig>(configRef);

  // 3. Obtener lista de referidos (donde el negocio actual es el referente)
  const referralsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'referrals'),
      where('referentBusinessId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);
  const { data: referrals, isLoading: loadingReferrals } = useCollection<Referral>(referralsQuery);

  // 4. Obtener logs de capacidad extra para el conteo de recompensas
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'extraCapacityLogs'),
      where('businessId', '==', user.uid)
    );
  }, [firestore, user?.uid]);
  const { data: capacityLogs } = useCollection<ExtraCapacityLog>(logsQuery);

  // --- LÓGICA DE NEGOCIO ---

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined' || !business?.referralCode) return '';
    return `${window.location.origin}/register?ref=${business.referralCode}`;
  }, [business?.referralCode]);

  const stats = useMemo(() => {
    const list = referrals || [];
    return {
      total: list.length,
      confirmed: list.filter(r => r.status === 'paid_confirmed').length,
      pending: list.filter(r => r.status === 'pending_payment').length,
    };
  }, [referrals]);

  const totalEarnedCapacity = useMemo(() => {
    if (!capacityLogs) return 0;
    // Opción A: Filtrado en cliente por reason
    return capacityLogs
      .filter(log => log.reason.startsWith('referido_confirmado'))
      .reduce((sum, log) => sum + log.amount, 0);
  }, [capacityLogs]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({
      title: "Enlace copiado",
      description: "¡Ya puedes compartir tu enlace de socio!",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: Referral['status']) => {
    switch (status) {
      case 'paid_confirmed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmado</Badge>;
      case 'pending_payment':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pendiente de pago</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Programa de Socios</h1>
          <p className="text-muted-foreground">Invita a otros negocios y gana capacidad extra para tu catálogo.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
          <Gift className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold text-primary">
            +{config?.rewardReferent || 5} productos por cada referido pagado
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Compartidos</CardTitle>
            <Share2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{loadingReferrals ? "..." : stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Exitosos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{loadingReferrals ? "..." : stats.confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{loadingReferrals ? "..." : stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Capacidad Ganada</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">+{totalEarnedCapacity}</div>
            <p className="text-[10px] uppercase font-bold opacity-70">Productos extra totales</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generador de Enlace */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Tu Enlace de Socio</CardTitle>
            <CardDescription>Copia este enlace y compártelo con otros dueños de negocios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tu Código Único</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={business?.referralCode || ''} 
                  readOnly 
                  className="font-mono font-bold text-center text-lg bg-muted/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Enlace Personalizado</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="text-xs h-10"
                />
                <Button 
                  size="icon" 
                  variant={copied ? "default" : "outline"} 
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">¿Cómo funciona?</p>
              <ol className="text-xs space-y-2 text-gray-600">
                <li className="flex gap-2"><span>1.</span> Comparte tu enlace.</li>
                <li className="flex gap-2"><span>2.</span> Tu referido obtiene un beneficio al registrarse.</li>
                <li className="flex gap-2"><span>3.</span> Cuando tu referido realice su primer pago, <strong>ambos ganan capacidad extra de por vida.</strong></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Historial */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mis Invitaciones</CardTitle>
            <CardDescription>Seguimiento de los negocios que se han registrado con tu código.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReferrals ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : referrals && referrals.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Fecha Registro</TableHead>
                      <TableHead>Referido ID</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Recompensa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell className="text-xs font-medium">
                          {format(ref.createdAt.toDate(), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">
                          {ref.referreeBusinessId.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(ref.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {ref.referentRewardGranted ? (
                            <span className="text-xs font-black text-green-600">+{config?.rewardReferent || 5} items</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Pendiente</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <Users className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-700">Aún no tienes referidos</p>
                  <p className="text-xs text-muted-foreground max-w-[250px]">
                    Comparte tu enlace para empezar a ganar beneficios exclusivos.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
