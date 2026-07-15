'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Printer, FileDown, Trash2, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable } from './data-table';
import { columns } from './columns';
import type { Order, OrderStatus } from '@/models/order';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { LimitBanner } from '@/components/dashboard/LimitBanner';
import { awardLoyaltyPoints } from '@/actions/loyalty';


declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function PedidosPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { plan, limits, ordersCount, isLoading: isSubscriptionLoading } = useSubscription();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [totalToDelete, setTotalToDelete] = useState(0);

  // --- LÓGICA DE PAGINACIÓN VISUAL ---
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const ordersRef = collection(firestore, `businesses/${user.uid}/orders`);
    return query(ordersRef, orderBy('orderDate', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading: areOrdersLoading } = useCollection<Order>(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    let result = orders;

    if (searchTerm) {
        result = result.filter(
          (order) =>
            order.customerName
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            (order.items?.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase()))) ||
            ((order as any).productName?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    if (dateFrom && dateTo) {
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        
        result = result.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate >= from && orderDate <= to;
        });
    }

    return result;
  }, [orders, searchTerm, dateFrom, dateTo]);

  // Reiniciar a la primera página si cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredOrders, currentPage]);
  
  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedOrders(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectRow = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };
  
  const isAllSelected = selectedOrders.length === filteredOrders.length && filteredOrders.length > 0;
  const isSomeSelected = selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length;

  const selectByDateRange = () => {
    if (!dateFrom || !dateTo) {
      toast({ variant: 'destructive', description: '⚠️ Debes seleccionar fecha inicio y fecha fin' });
      return;
    }
    // La lógica de filtrado ya está en el useMemo filteredOrders, 
    // este botón ahora sirve para forzar la UI si fuera necesario, 
    // pero el useMemo reacciona automáticamente.
    toast({ description: `✅ Filtrado por fecha aplicado` });
  };
  
  const clearSelection = () => {
    setSelectedOrders([]);
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };
  
  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };
  
  const deleteSelectedOrders = async () => {
    if (!firestore || !user) return;
    
    setIsDeleting(true);
    setDeleteProgress(0);
    setTotalToDelete(selectedOrders.length);
    let deletedCount = 0;

    try {
      const BATCH_SIZE = 500;
      const chunks = chunkArray([...selectedOrders], BATCH_SIZE);

      for (let i = 0; i < chunks.length; i++) {
        const batch = writeBatch(firestore);
        chunks[i].forEach(orderId => {
          batch.delete(doc(firestore, `businesses/${user.uid}/orders`, orderId));
        });
        await batch.commit();
        deletedCount += chunks[i].length;
        setDeleteProgress(Math.round((deletedCount / selectedOrders.length) * 100));
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      clearSelection();
      toast({ description: `✅ ${deletedCount} pedido(s) eliminado(s) correctamente` });

    } catch (error) {
      console.error('Error en eliminación masiva:', error);
      toast({ variant: 'destructive', description: `❌ Error parcial: eliminados ${deletedCount} de ${totalToDelete}` });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
      setTotalToDelete(0);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `businesses/${user.uid}/orders`, orderId);
    await deleteDoc(docRef);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `businesses/${user.uid}/orders`, orderId);
    await updateDocumentNonBlocking(docRef, { orderStatus: status });

    if (status === 'Entregado') {
        try {
            const orderSnap = await getDoc(docRef);
            if (orderSnap.exists()) {
                const orderData = orderSnap.data() as Order;
                if (orderData.customerPhone) {
                    await awardLoyaltyPoints(
                        user.uid, 
                        orderData.customerPhone, 
                        orderId, 
                        orderData.total || orderData.subtotal
                    );
                }
            }
        } catch (error) {
            console.error("Error al otorgar puntos por pedido entregado:", error);
        }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!filteredOrders) return;
    const doc = new jsPDF();

    doc.autoTable({
      head: [['Cliente', 'Pedido', 'Cantidad', 'Total', 'Estado', 'Fecha']],
      body: filteredOrders.map((order) => {
          const isNew = order.items && Array.isArray(order.items);
          const productText = isNew 
            ? (order.items!.length > 1 ? `${order.items![0].productName} y ${order.items!.length - 1} más` : order.items![0].productName)
            : (order as any).productName;
          
          const qty = isNew ? order.items!.reduce((s, i) => s + i.quantity, 0) : (order as any).quantity;
          const total = order.total || order.subtotal;

          return [
            order.customerName,
            productText,
            qty,
            new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(total),
            order.orderStatus,
            new Date(order.orderDate).toLocaleDateString(),
          ];
      }),
    });

    doc.save('pedidos.pdf');
  };

  const isLoading = areOrdersLoading || isSubscriptionLoading;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pedidos</CardTitle>
          <CardDescription>
            Revisa y administra los pedidos de tus clientes. Los pedidos ahora agrupan múltiples productos.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 p-3 text-sm">
                <Info className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                    Límite de pedidos/mes: <span className="font-bold">{ordersCount} / {limits.orders === -1 ? '∞' : limits.orders}</span>.
                </p>
            </div>
        </CardContent>
      </Card>

      <LimitBanner current={ordersCount} limit={limits.orders} label="pedidos/mes" plan={plan} />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Listado de Pedidos</CardTitle>
              <CardDescription>
                Visualiza tus ventas y actualiza estados de despacho.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleDownloadPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por cliente o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          
          <div className="my-4 p-4 border rounded-lg space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium">Seleccionar por rango de fechas</label>
                      <div className="flex items-center gap-2 mt-1">
                          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={isDeleting} />
                          <span className="text-muted-foreground">-</span>
                          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={isDeleting} />
                      </div>
                  </div>
                  <div className="flex gap-2">
                       <Button variant="outline" onClick={selectByDateRange} disabled={isDeleting}>Filtrar</Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" disabled={selectedOrders.length === 0 || isDeleting}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar ({selectedOrders.length})
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vas a eliminar permanentemente {selectedOrders.length} pedido(s). Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={deleteSelectedOrders} className="bg-destructive hover:bg-destructive/80">Sí, eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                  </div>
              </div>
              {selectedOrders.length > 0 && !isDeleting && (
                <div className="flex items-center gap-4 p-2 bg-orange-50 border border-orange-200 rounded-md text-sm text-orange-800">
                  <span>☑️ {selectedOrders.length} pedidos seleccionados</span>
                  {dateFrom && dateTo && (
                    <span className="hidden sm:inline">│ 📅 {format(new Date(dateFrom),'dd/MM/yy')} → {format(new Date(dateTo),'dd/MM/yy')}</span>
                  )}
                  <Button variant="ghost" size="sm" className="ml-auto text-orange-800 hover:bg-orange-100" onClick={clearSelection}>✕ Limpiar</Button>
                </div>
              )}
              {isDeleting && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md space-y-1">
                    <div className="flex justify-between text-sm font-medium text-orange-900">
                        <span>🔄 Eliminando pedidos...</span>
                        <span>{deleteProgress}%</span>
                    </div>
                    <Progress value={deleteProgress} className="h-2 [&>div]:bg-orange-500" />
                    <p className="text-xs text-muted-foreground">
                        {Math.round(deleteProgress * totalToDelete / 100)} de {totalToDelete} pedidos
                    </p>
                </div>
              )}
          </div>

          <DataTable
            columns={columns({ handleDeleteOrder, handleUpdateStatus, selectedOrders, onSelectAll: handleSelectAll, onSelectRow: handleSelectRow, isAllSelected, isSomeSelected })}
            data={paginatedOrders}
            isLoading={isLoading}
            selectedOrderIds={selectedOrders}
          />

          {/* CONTROLES DE PAGINACIÓN */}
          <div className="flex items-center justify-between py-4 border-t mt-4">
              <div className="text-sm text-muted-foreground font-medium">
                  Mostrando {paginatedOrders.length} de {filteredOrders.length} pedidos 
                  (Página {currentPage} de {totalPages || 1})
              </div>
              <div className="flex gap-2">
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isDeleting || areOrdersLoading}
                      className="font-bold"
                  >
                      <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                  </Button>
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage >= totalPages || isDeleting || areOrdersLoading}
                      className="font-bold"
                  >
                      Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
