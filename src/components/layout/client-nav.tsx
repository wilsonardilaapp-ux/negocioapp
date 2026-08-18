"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from 'react';
import { useSubscription } from "@/hooks/useSubscription";
import { useUser } from "@/firebase";
import { normalizeModuleId } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  MessageSquare,
  CreditCard,
  ShoppingBag,
  BarChart,
  UserCircle,
  Package,
  Share2,
  Calculator,
  Tag,
  Ticket,
  Bot,
  Smartphone,
  CalendarCheck,
  Bell,
  Mail,
  Printer,
  FileEdit,
  Store,
  Users,
  Megaphone,
  Star,
  Gift,
  Share
} from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  
  // OPERACIÓN Y VENTAS
  { href: "/dashboard/catalogo", icon: ShoppingCart, label: "Catálogo de Productos", moduleId: 'catalogo' },
  { href: "/dashboard/pedidos", icon: ShoppingBag, label: "Pedidos y Ventas", moduleId: 'catalogo' },
  { href: "/dashboard/empaque", icon: Package, label: "Control de Empaque", moduleId: 'catalogo' },
  { href: "/dashboard/pagos", icon: CreditCard, label: "Métodos de Pago", moduleId: 'catalogo' },
  { href: "/dashboard/configuracion/factura", icon: FileEdit, label: "Editor de Factura" },
  { href: "/dashboard/configuracion/impresoras", icon: Printer, label: "Impresoras POS" },
  { href: "/dashboard/share", icon: Share2, label: "Compartir Catálogo" },
  { href: "/dashboard/share-landing", icon: Share, label: "Compartir Landing" },
  
  // MARKETING Y FIDELIZACIÓN
  { href: "/dashboard/blog", icon: FileText, label: "Blog Profesional", moduleId: 'blog' },
  { href: "/dashboard/promotions", icon: Megaphone, label: "Promociones", moduleId: 'promotions' },
  { href: "/dashboard/cupones", icon: Ticket, label: "Cupones de Descuento", moduleId: 'promotions' },
  { href: "/dashboard/loyalty", icon: Star, label: "Fidelización (IA)", moduleId: 'loyalty' },
  { href: "/dashboard/valoraciones-directorio", icon: Users, label: "Valoraciones", moduleId: 'business-directory' },
  { href: "/dashboard/referidos", icon: Gift, label: "Programa de Socios" },
  
  // GESTIÓN Y CONTROL
  { href: "/dashboard/reservas/servicios", icon: CalendarCheck, label: "Reservas y Servicios", moduleId: 'reservas-agendamiento' },
  { href: "/dashboard/contabilidad", icon: Calculator, label: "Contabilidad", moduleId: 'contabilidad' },
  { href: "/dashboard/kardex", icon: Package, label: "Inventario Kardex", moduleId: 'inventario-kardex' },
  { href: "/dashboard/pistola-scanner", icon: Smartphone, label: "Pistola Escáner", moduleId: 'pistola-escaner' },
  
  // COMUNICACIÓN
  { href: "/dashboard/messages", icon: Bell, label: "Notificaciones Admin" },
  { href: "/dashboard/mensajes-clientes", icon: Mail, label: "Mensajes de Clientes" },
  { href: "/dashboard/chatbot", icon: MessageSquare, label: "Asistente WHAPI", moduleId: 'whapi-whatsapp' },
  { href: "/dashboard/configuracion/ycloud", icon: Bot, label: "Asistente YCloud", moduleId: 'ycloud-whatsapp' },
  
  // PERFIL Y SISTEMA
  { href: "/dashboard/perfil", icon: UserCircle, label: "Perfil del Negocio" },
];

export function ClientNav() {
  const pathname = usePathname();
  const { profile } = useUser();
  const { setOpenMobile } = useSidebar();
  const { isModuleAuthorized } = useSubscription();

  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      if (!item.moduleId) return true;
      if (profile?.role === 'super_admin') return true;
      return isModuleAuthorized(normalizeModuleId(item.moduleId));
    });
  }, [isModuleAuthorized, profile?.role]);

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            onClick={() => setOpenMobile(false)}
            tooltip={item.label}
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
