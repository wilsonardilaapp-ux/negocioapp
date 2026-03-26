
'use client';

import { useMemo, useState } from 'react';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, writeBatch } from 'firebase/firestore';
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
import { Printer, FileDown, Trash2 } from 'lucide-react';
import { DataTable } from './data-table';
import { columns } from './columns';
import type { Order, OrderStatus } from '@/models/order';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


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

  // New state for bulk actions
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [totalToDelete, setTotalToDelete] = useState(0);

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const ordersRef = collection(firestore, `businesses/${user.uid}/orders`);
    return query(ordersRef, orderBy('orderDate', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (!searchTerm) return orders;

    return orders.filter(
      (order) =>
        order.customerName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        order.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);
  
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


  // --- New Bulk Action Functions ---

  const selectByDateRange = () => {
    if (!dateFrom || !dateTo) {
      toast({ variant: 'destructive', description: '⚠️ Debes seleccionar fecha inicio y fecha fin' });
      return;
    }
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    if (from > to) {
      toast({ variant: 'destructive', description: '⚠️ La fecha inicio no puede ser mayor a la fecha fin' });
      return;
    }
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const ordersInRange = filteredOrders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= from && orderDate <= to;
    });

    if (ordersInRange.length === 0) {
      toast({ description: '📭 No se encontraron pedidos en ese rango' });
      return;
    }

    const newIds = ordersInRange.map(o => o.id);
    setSelectedOrders(prev => [...new Set([...prev, ...newIds])]);
    toast({ description: `✅ ${ordersInRange.length} pedido(s) seleccionado(s)` });
  };
  
  const clearSelection = () => {
    setSelectedOrders([]);
    setDateFrom('');
    setDateTo('');
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

  // --- End New Functions ---

  const handleDeleteOrder = async (orderId: string) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `businesses/${user.uid}/orders`, orderId);
    await deleteDoc(docRef);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (!firestore || !user) return;
    const docRef = doc(firestore, `businesses/${user.uid}/orders`, orderId);
    updateDocumentNonBlocking(docRef, { orderStatus: status });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!filteredOrders) return;
    const doc = new jsPDF();

    doc.autoTable({
      head: [['Cliente', 'Producto', 'Cantidad', 'Total', 'Estado', 'Fecha']],
      body: filteredOrders.map((order) => [
        order.customerName,
        order.productName,
        order.quantity,
        new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
        }).format(order.subtotal),
        order.orderStatus,
        new Date(order.orderDate).toLocaleDateString(),
      ]),
    });

    doc.save('pedidos.pdf');
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pedidos</CardTitle>
          <CardDescription>
            Revisa y administra los pedidos de tus clientes.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Listado de Pedidos</CardTitle>
              <CardDescription>
                Aquí puedes ver todos los pedidos recibidos.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button onClick={handleDownloadPDF}>
                <FileDown className="mr-2 h-4 w-4" />
                Descargar PDF
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
          
          {/* New Bulk Action Toolbar */}
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
                       <Button variant="outline" onClick={selectByDateRange} disabled={isDeleting}>Seleccionar</Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" disabled={selectedOrders.length === 0 || isDeleting}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar ({selectedOrders.length})
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
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
            data={filteredOrders || []}
            isLoading={isLoading}
            selectedOrderIds={selectedOrders}
          />
        </CardContent>
      </Card>
    </div>
  );
}
