"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Module } from "@/models/module";
import { useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  MessageSquare,
  CreditCard,
  ShoppingBag,
  BarChart,
  Lightbulb,
  UserCircle,
  Printer,
  Package,
  Share2,
  HardDrive,
  Calculator,
  Mail,
  Bell,
  ScanLine,
  Tag,
  Ticket,
  Loader2,
} from "lucide-react";
import { MessageCircle as MessageCircleIcon } from "@/components/icons";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/landing-page", icon: FileText, label: "Landing Page" },
  { href: "/dashboard/catalogo", icon: ShoppingCart, label: "Catálogo", moduleId: 'catalogo' },
  { href: "/dashboard/share", icon: Share2, label: "Compartir Menú", moduleId: 'catalogo' },
  { href: "/dashboard/blog", icon: FileText, label: "Blog", moduleId: 'blog' },
  { href: "/dashboard/promotions", icon: Tag, label: "Promociones", moduleId: 'promotions' },
  { href: "/dashboard/cupones", icon: Ticket, label: "Cupones", moduleId: 'promotions' },
  { href: "/dashboard/messages", icon: Bell, label: "Notificaciones" },
  { href: "/dashboard/mensajes-clientes", icon: Mail, label: "Mensajes de Clientes" },
  { href: "/dashboard/contacto", icon: MessageSquare, label: "Soporte" },
  { href: "/dashboard/pedidos", icon: ShoppingBag, label: "Pedidos", moduleId: 'catalogo' },
  { href: "/dashboard/empaque", icon: Package, label: "Empaque", moduleId: 'catalogo' },
  { href: "/dashboard/pagos", icon: CreditCard, label: "Pagos" },
  { href: "/dashboard/contabilidad", icon: Calculator, label: "Contabilidad", moduleId: 'contabilidad' },
  { href: "/dashboard/kardex", icon: Package, label: "Inventario Kardex", moduleId: 'inventario-kardex' },
  { href: "/dashboard/configuracion/factura", icon: FileText, label: "Editor Factura", moduleId: 'catalogo' },
  { href: "/dashboard/configuracion/impresoras", icon: Printer, label: "Impresoras", moduleId: 'catalogo' },
  { href: "/dashboard/pistola-scanner", icon: ScanLine, label: "Pistola Escáner", moduleId: 'pistola-escaner' },
  { href: "/dashboard/backups", icon: HardDrive, label: "Backups" },
  { href: "/dashboard/subscription", icon: CreditCard, label: "Suscripción" },
  { href: "/dashboard/perfil", icon: UserCircle, label: "Perfil" },
  { href: "/dashboard/chatbot", icon: MessageCircleIcon, label: "Asistente IA", moduleId: 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas'},
  { href: "/dashboard/suggestions", icon: Lightbulb, label: "Sugerencias", moduleId: 'motor-de-sugerencias-inteligentes' },
  { href: "/dashboard/analytics", icon: BarChart, label: "Métricas", moduleId: 'google-analytics' },
];

export function ClientNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const firestore = useFirestore();
  const { user } = useUser();

  // Consulta dinámica de módulos asignados al negocio con estado activo
  const modulesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, `businesses/${user.uid}/modules`),
      where("status", "==", "active")
    );
  }, [firestore, user]);

  const { data: activeModules, isLoading } = useCollection<Module>(modulesQuery);

  const activeModuleIds = useMemo(() => {
    if (!activeModules) return new Set<string>();
    return new Set(activeModules.map(m => m.id));
  }, [activeModules]);

  // Filtrar los elementos del menú según los módulos activos
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      // Si el ítem no tiene moduleId, es un elemento base visible para todos
      if (!item.moduleId) return true;
      // Si tiene moduleId, solo se muestra si el módulo está activo para el negocio
      return activeModuleIds.has(item.moduleId);
    });
  }, [activeModuleIds]);

  if (isLoading && !activeModules) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard")}
            tooltip={item.label}
            onClick={() => setOpenMobile(false)}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
