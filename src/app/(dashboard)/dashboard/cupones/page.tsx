'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useCoupons } from '@/hooks/use-coupons';
import { couponService } from '@/services/coupon-service';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, Ticket, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Coupon, CouponType, UsageLimitType } from '@/models/coupon';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export default function CuponesPage() {
  const { user } = useUser();
  const { coupons, isLoading } = useCoupons();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await couponService.updateCoupon(id, { activo: !current });
      toast({ title: 'Estado actualizado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await couponService.deleteCoupon(id);
      toast({ title: 'Cupón eliminado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Gestión de Cupones</CardTitle>
            <CardDescription>Crea códigos de descuento para fidelizar a tus clientes.</CardDescription>
          </div>
          <Button onClick={() => { setEditingCoupon(null); setIsDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Cupón
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo / Valor</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => {
              const isExpired = new Date(coupon.fechaVencimiento) < new Date();
              const limitReached = coupon.limiteUsos > 0 && coupon.usosActuales >= coupon.limiteUsos;
              
              return (
                <TableRow key={coupon.id}>
                  <TableCell className="font-bold">{coupon.codigo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={coupon.tipo === 'porcentaje' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-green-200 text-green-700 bg-green-50'}>
                      {coupon.tipo === 'porcentaje' ? `${coupon.valor}%` : formatCurrency(coupon.valor)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className={cn("h-3.5 w-3.5", isExpired ? "text-destructive" : "text-muted-foreground")} />
                      <span className={isExpired ? "text-destructive font-medium" : ""}>
                        {format(new Date(coupon.fechaVencimiento), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <p>{coupon.usosActuales} / {coupon.limiteUsos === 0 ? '∞' : coupon.limiteUsos}</p>
                      {coupon.limiteUsos > 0 && (
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", limitReached ? "bg-destructive" : "bg-primary")} 
                            style={{ width: `${Math.min(100, (coupon.usosActuales / coupon.limiteUsos) * 100)}%` }} 
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={coupon.activo} 
                        onCheckedChange={() => handleToggleActive(coupon.id, coupon.activo)}
                        disabled={limitReached || isExpired}
                      />
                      {isExpired ? (
                        <Badge variant="destructive">Expirado</Badge>
                      ) : limitReached ? (
                        <Badge className="bg-yellow-500 text-white">Límite</Badge>
                      ) : (
                        <Badge variant={coupon.activo ? "default" : "secondary"}>
                          {coupon.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCoupon(coupon); setIsDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar cupón?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción eliminará el código "{coupon.codigo}" permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(coupon.id)} className="bg-destructive text-white">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {coupons.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No tienes cupones creados aún.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <CouponDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        coupon={editingCoupon} 
        businessId={user?.uid!} 
      />
    </div>
  );
}

function CouponDialog({ isOpen, onClose, coupon, businessId }: { isOpen: boolean, onClose: () => void, coupon: Coupon | null, businessId: string }) {
  const { toast } = useToast();
  
  const initialDefaults = {
    codigo: '',
    tipo: 'porcentaje' as CouponType,
    valor: 0,
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    limiteUsos: 0,
    usoPorCliente: 'ilimitado' as UsageLimitType,
    montoMinimo: 0,
    activo: true,
  };

  const [formData, setFormData] = useState<Partial<Coupon>>(initialDefaults);

  useEffect(() => {
    if (isOpen) {
      if (coupon) {
        setFormData({
          ...coupon,
          fechaVencimiento: new Date(coupon.fechaVencimiento).toISOString().split('T')[0]
        });
      } else {
        setFormData(initialDefaults);
      }
    }
  }, [isOpen, coupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.codigo?.trim() || formData.valor! <= 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'El código y el valor son obligatorios.' });
        return;
    }

    try {
      const dataToSave = {
        ...formData,
        codigo: formData.codigo.toUpperCase().trim(),
        businessId,
      };

      if (coupon) {
        await couponService.updateCoupon(coupon.id, dataToSave);
      } else {
        await couponService.createCoupon(dataToSave as any);
      }
      toast({ title: '¡Éxito!', description: 'El cupón ha sido guardado.' });
      onClose();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el cupón.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{coupon ? 'Editar' : 'Nuevo'} Cupón de Descuento</DialogTitle>
          <DialogDescription>Define las reglas de tu código promocional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Código del Cupón *</Label>
            <Input 
              required 
              value={formData.codigo || ''} 
              onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })} 
              placeholder="EJ: VERANO2024"
              className="font-bold tracking-widest"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v: CouponType) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                  <SelectItem value="valorFijo">Valor Fijo ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{formData.tipo === 'porcentaje' ? 'Valor (%)' : 'Valor ($)'}</Label>
              <Input type="number" required value={formData.valor} onChange={e => setFormData({ ...formData, valor: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
              <Input type="date" required value={formData.fechaVencimiento} onChange={e => setFormData({ ...formData, fechaVencimiento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Monto Mínimo Compra</Label>
              <Input type="number" value={formData.montoMinimo} onChange={e => setFormData({ ...formData, montoMinimo: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Límite Usos Totales</Label>
              <Input type="number" placeholder="0 = Ilimitado" value={formData.limiteUsos} onChange={e => setFormData({ ...formData, limiteUsos: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Uso por Cliente</Label>
              <Select value={formData.usoPorCliente} onValueChange={(v: UsageLimitType) => setFormData({ ...formData, usoPorCliente: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unaVez">Una sola vez</SelectItem>
                  <SelectItem value="ilimitado">Ilimitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Switch checked={formData.activo} onCheckedChange={v => setFormData({ ...formData, activo: v })} />
            <Label>Cupón Activo</Label>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full">Guardar Cupón</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
