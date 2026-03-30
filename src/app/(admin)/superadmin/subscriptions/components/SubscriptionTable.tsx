
"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Loader2, UserX } from "lucide-react";
import { format } from "date-fns";
import type { ClientWithSubscription } from "../hooks/useAllSubscriptions";
import { ChangePlanModal } from "./ChangePlanModal";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/models/subscription-plan";

interface SubscriptionTableProps {
  clients: ClientWithSubscription[];
  isLoading: boolean;
  allPlans: SubscriptionPlan[];
}

export function SubscriptionTable({ clients, isLoading, allPlans }: SubscriptionTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingClient, setEditingClient] = useState<ClientWithSubscription | null>(null);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchMatch =
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase());
      const planMatch = planFilter === "all" || (client.subscription?.plan || 'free') === planFilter;
      const statusMatch = statusFilter === "all" || (client.subscription?.status || 'canceled') === statusFilter;
      return searchMatch && planMatch && statusMatch;
    });
  }, [clients, searchTerm, planFilter, statusFilter]);

  const getPlanVariant = (plan: string | null | undefined) => {
    const planDetails = allPlans.find(p => p.id === plan);
    if (planDetails?.isMostPopular) return "default";
    switch (plan) {
      case "pro": return "default";
      case "enterprise": return "destructive"; // You can define a gold/yellow variant
      case "free": return "secondary";
      default: return "outline";
    }
  };

  const getStatusVariant = (status: string | null | undefined) => {
    switch (status) {
      case "active": return "default";
      case "trialing": return "secondary";
      case "past_due": return "destructive";
      case "canceled": return "outline";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por plan" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Planes</SelectItem>
                {allPlans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="past_due">Vencido</SelectItem>
                <SelectItem value="trialing">En prueba</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Negocio</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Forma de Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => {
                const isExpired = client.subscription?.currentPeriodEnd 
                    ? client.subscription.currentPeriodEnd.toDate() < new Date() 
                    : false;
                
                const planDetails = allPlans.find(p => p.id === client.subscription?.plan);
                const paymentMethod = client.subscription?.paymentMethod || 'stripe';

                return (
                  <TableRow key={client.userId}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>
                      <Badge variant={getPlanVariant(client.subscription?.plan)}>
                        {planDetails?.name || client.subscription?.plan || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{paymentMethod.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(client.subscription?.status)}>
                        {client.subscription?.status || "Cancelado"}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(isExpired && "text-red-500 font-bold")}>
                      {client.subscription?.currentPeriodEnd
                        ? format(client.subscription.currentPeriodEnd.toDate(), "dd/MM/yyyy")
                        : "Sin fecha"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditingClient(client)}>
                            Cambiar Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
            })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserX className="h-8 w-8 text-muted-foreground" />
                    <p className="font-semibold">No se encontraron clientes.</p>
                    <p className="text-sm text-muted-foreground">Ajusta los filtros o el término de búsqueda.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ChangePlanModal 
        client={editingClient}
        allPlans={allPlans}
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
      />
    </>
  );
}
