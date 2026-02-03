
"use client";

import { useMemo } from "react";
import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, FileDown } from "lucide-react";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import type { Order, OrderStatus } from "@/models/order";
import jsPDF from "jspdf";
import "jspdf-autotable";

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function PedidosPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const ordersRef = collection(firestore, `businesses/${user.uid}/orders`);
    return query(ordersRef, orderBy('orderDate', 'desc'));
  }, [firestore, user]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

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
  }
  
  const handleDownloadPDF = () => {
    if (!orders) return;
    const doc = new jsPDF();
    
    doc.autoTable({
        head: [['Cliente', 'Producto', 'Cantidad', 'Total', 'Estado', 'Fecha']],
        body: orders.map(order => [
            order.customerName,
            order.productName,
            order.quantity,
            new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(order.subtotal),
            order.orderStatus,
            new Date(order.orderDate).toLocaleDateString()
        ]),
    });

    doc.save('pedidos.pdf');
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Pedidos</CardTitle>
          <CardDescription>Revisa y administra los pedidos de tus clientes.</CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Listado de Pedidos</CardTitle>
                    <CardDescription>Aquí puedes ver todos los pedidos recibidos.</CardDescription>
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
            <DataTable 
                columns={columns({ handleDeleteOrder, handleUpdateStatus })} 
                data={orders || []} 
                isLoading={isLoading} 
            />
        </CardContent>
      </Card>
    </div>
  );
}
