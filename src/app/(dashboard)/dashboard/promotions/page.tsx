'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { usePromotions } from '@/hooks/use-promotions';
import { promotionService, CreatePromotionInput } from '@/services/promotion-service';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, Loader2, Tag, Frown, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Promotion } from '@/models/promotion';
import { useSubscription } from '@/hooks/useSubscription';
import { LimitBanner } from '@/components/dashboard/LimitBanner';
import { cn } from "@/lib/utils";

export default function PromotionsPage() {
  const { user } = useUser();
  const { promotions, isLoading: arePromosLoading } = usePromotions();
  const { toast } = useToast();
  const { limits, plan, promotionsCount, isModuleAuthorized, isLoading: isSubscriptionLoading } = useSubscription();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await promotionService.toggleActive(id, !current);
      toast({ title: 'Estado actualizado' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al actualizar' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await promotionService.deletePromotion(id);
      toast({ title: 'Promoción eliminada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  };

  const promoTypeLabel = (type: Promotion['type']) => {
    const labels = {
      percentage: '% Descuento',
      fixed: 'Valor Fijo',
      bogo: '2x1 / BOGO',
      free_item: 'Ítem Gratis',
      bundle: 'Paquete',
    };
    return labels[type];
  };

  const promoTypeColor = (type: Promotion['type']) => {
    const colors = {
      percentage: 'bg-blue-100 text-blue-800',
      fixed: 'bg-green-100 text-green-800',
      bogo: 'bg-orange-100 text-orange-800',
      free_item: 'bg-purple-100 text-purple-800',
      bundle: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type];
  };

  const isLoading = isSubscriptionLoading || arePromosLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  // Sincronización con el sidebar: Usamos isModuleAuthorized('promotions')
  if (!isModuleAuthorized('promotions')) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Módulo de Promociones Desactivado</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
                <Frown className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">Funcionalidad no disponible</h3>
                <p className="text-muted-foreground max-w-sm">
                    El módulo de "Promociones" no está activo en tu cuenta o plan. Por favor, contacta al administrador de la plataforma para más información sobre cómo habilitarlo.
                </p>
            </CardContent>
        </Card>
    );
  }

  const promoLimitReached = limits.promotions !== -1 && promotionsCount >= limits.promotions;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Promociones</CardTitle>
            <CardDescription>Crea y gestiona las promociones de tu negocio.</CardDescription>
          </div>
          <Button onClick={() => { setEditingPromo(null); setIsDialogOpen(true); }} disabled={promoLimitReached}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Promoción
          </Button>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 p-3 text-sm">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                    Límite de promociones: <span className="font-bold">{promotionsCount} / {limits.promotions === -1 ? '∞' : limits.promotions}</span>.
                </p>
            </div>
        </CardContent>
      </Card>

      <LimitBanner current={promotionsCount} limit={limits.promotions} label="promociones" plan={plan} />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="expired">Vencidas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aplica a</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">{promo.title}</TableCell>
                    <TableCell>
                      <Badge className={promoTypeColor(promo.type)} variant="outline">
                        {promoTypeLabel(promo.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{promo.applicableTo.replace('_', ' ')}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(promo.validFrom), 'dd/MM/yy')} - {format(new Date(promo.validUntil), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={promo.isActive} 
                          onCheckedChange={() => handleToggleActive(promo.id, promo.isActive)}
                          disabled={promo.usageLimit! > 0 && promo.usageCount >= promo.usageLimit!}
                        />
                        {promo.usageLimit! > 0 && promo.usageCount >= promo.usageLimit! && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Límite alcanzado</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingPromo(promo); setIsDialogOpen(true); }}>
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
                              <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(promo.id)} className="bg-destructive text-white">Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {promotions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No tienes promociones creadas aún.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <PromotionDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        promo={editingPromo} 
        companyId={user?.uid!} 
      />
    </div>
  );
}

function PromotionDialog({ isOpen, onClose, promo, companyId }: { isOpen: boolean, onClose: () => void, promo: Promotion | null, companyId: string }) {
  const { toast } = useToast();
  
  const initialDefaults = {
    type: 'percentage' as const,
    applicableTo: 'all_catalog' as const,
    isActive: true,
    showInCatalog: true,
    showInCheckout: true,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discountValue: 0,
    minQuantity: 0,
    usageLimit: 0,
    title: '',
    description: '',
  };

  const [formData, setFormData] = useState<Partial<Promotion>>(promo || initialDefaults);

  useEffect(() => {
    if (isOpen) {
      setFormData(promo || initialDefaults);
    }
  }, [isOpen, promo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title?.trim() || !formData.description?.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'Título y descripción son obligatorios.' });
        return;
    }

    if (formData.validUntil! < formData.validFrom!) {
      toast({ variant: 'destructive', title: 'Error', description: 'La fecha de fin debe ser posterior al inicio.' });
      return;
    }

    try {
      if (promo) {
        await promotionService.updatePromotion(promo.id, formData);
      } else {
        await promotionService.createPromotion({
          ...formData as CreatePromotionInput,
          companyId,
        });
      }
      toast({ title: 'Éxito', description: 'Promoción guardada correctamente.' });
      onClose();
    } catch (error) {
      console.error("Error saving promo:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la promoción. Verifica tu conexión o permisos.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{promo ? 'Editar' : 'Nueva'} Promoción</DialogTitle>
          <DialogDescription>Define los parámetros de la oferta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label>Título *</Label>
            <Input required value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ej: Descuento de Verano" />
          </div>
          <div className="grid gap-2">
            <Label>Descripción *</Label>
            <Textarea required value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Explica la promoción..." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo de promoción *</Label>
              <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">% Descuento</SelectItem>
                  <SelectItem value="fixed">Valor Fijo</SelectItem>
                  <SelectItem value="bogo">2x1 / BOGO</SelectItem>
                  <SelectItem value="free_item">Ítem Gratis</SelectItem>
                  <SelectItem value="bundle">Paquete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData.type === 'percentage' || formData.type === 'fixed' || formData.type === 'bundle') && (
              <div className="grid gap-2">
                <Label>{formData.type === 'percentage' ? 'Valor %' : 'Valor del descuento/paquete'}</Label>
                <Input type="number" value={formData.discountValue} onChange={e => setFormData({ ...formData, discountValue: Number(e.target.value) })} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Aplica a *</Label>
              <Select value={formData.applicableTo} onValueChange={(v: any) => setFormData({ ...formData, applicableTo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_catalog">Todo el catálogo</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                  <SelectItem value="specific_item">Producto / Servicio</SelectItem>
                  <SelectItem value="order">Orden / Pedido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.applicableTo === 'category' && (
              <div className="grid gap-2">
                <Label>Nombre de categoría</Label>
                <Input value={formData.categoryName || ''} onChange={e => setFormData({ ...formData, categoryName: e.target.value })} />
              </div>
            )}
            {formData.applicableTo === 'specific_item' && (
              <div className="grid gap-2">
                <Label>Nombre del producto/servicio</Label>
                <Input value={formData.itemName || ''} onChange={e => setFormData({ ...formData, itemName: e.target.value })} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Fecha inicio *</Label>
              <Input type="date" required value={formData.validFrom} onChange={e => setFormData({ ...formData, validFrom: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Fecha fin *</Label>
              <Input type="date" required value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Cantidad mínima</Label>
              <Input type="number" value={formData.minQuantity} onChange={e => setFormData({ ...formData, minQuantity: Number(e.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>Límite de usos (0 = ∞)</Label>
              <Input type="number" value={formData.usageLimit} onChange={e => setFormData({ ...formData, usageLimit: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={formData.showInCatalog} onCheckedChange={v => setFormData({ ...formData, showInCatalog: v })} />
              <Label>Ver en catálogo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.showInCheckout} onCheckedChange={v => setFormData({ ...formData, showInCheckout: v })} />
              <Label>Ver en checkout</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full">Guardar Promoción</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}