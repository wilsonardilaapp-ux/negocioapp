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
  Share2,
  ShoppingCart,
  BarChart2,
  DollarSign,
  UserPlus,
  Users,
  TrendingUp,
  Sparkles,
  BookOpen,
  Star,
  MessageSquare,
  Smartphone,
  Bell,
  Mail,
  Megaphone,
  Ticket,
  LifeBuoy,
  Package,
  Box,
  CreditCard,
  Calculator,
  Layers,
  Receipt,
  Printer,
  Bot,
  Database,
  ShieldCheck,
  Lightbulb,
  User,
} from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

const allNavItems = [
  // 1-3: DASHBOARD Y LANDING
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/landing-page", icon: FileText, label: "Landing Page" },
  { href: "/dashboard/share-landing", icon: Share2, label: "Compartir Landing Page" },
  
  // 4-5: CATÁLOGO Y PRODUCTOS
  { href: "/dashboard/catalogo", icon: ShoppingCart, label: "Catálogo", moduleId: 'catalogo' },
  { href: "/dashboard/catalogo/estadisticas", icon: BarChart2, label: "Estadísticas de Productos", moduleId: 'catalogo' },
  
  // 6-10: MEDICIÓN Y ANALÍTICA
  { href: "/dashboard/medicion/numero-pedidos", icon: FileText, label: "N° Pedidos" },
  { href: "/dashboard/medicion/ticket-promedio", icon: DollarSign, label: "Ticket Promedio" },
  { href: "/dashboard/medicion/clientes-nuevos", icon: UserPlus, label: "Clientes Nuevos" },
  { href: "/dashboard/medicion/clientes-recurrentes", icon: Users, label: "Retención Clientes" },
  { href: "/dashboard/medicion/pedidos-por-canal", icon: TrendingUp, label: "Canales de Venta" },
  
  // 11-14: FIDELIZACIÓN Y BLOG
  { href: "/dashboard/loyalty", icon: Sparkles, label: "Fidelización", moduleId: 'loyalty' },
  { href: "/dashboard/share", icon: Share2, label: "Compartir Menú" },
  { href: "/dashboard/blog", icon: BookOpen, label: "Blog", moduleId: 'blog' },
  { href: "/dashboard/valoraciones-directorio", icon: Star, label: "Valoraciones del Directorio" },
  
  // 15-18: COMUNICACIÓN
  { href: "/dashboard/chatbot", icon: MessageSquare, label: "Asistente WHAPI", moduleId: 'whapi-whatsapp' },
  { href: "/dashboard/configuracion/ycloud", icon: Smartphone, label: "Asistente YCloud", moduleId: 'ycloud-whatsapp' },
  { href: "/dashboard/messages", icon: Bell, label: "Notificaciones" },
  { href: "/dashboard/mensajes-clientes", icon: Mail, label: "Mensajes de Clientes" },
  
  // 19-22: PARTNERS Y SOPORTE
  { href: "/dashboard/referidos", icon: Users, label: "Programa de Socios" },
  { href: "/dashboard/promotions", icon: Megaphone, label: "Promociones", moduleId: 'promotions' },
  { href: "/dashboard/cupones", icon: Ticket, label: "Cupones", moduleId: 'promotions' },
  { href: "/dashboard/contacto", icon: LifeBuoy, label: "Soporte" },
  
  // 23-25: OPERACIÓN VENTAS
  { href: "/dashboard/pedidos", icon: Package, label: "Pedidos", moduleId: 'catalogo' },
  { href: "/dashboard/empaque", icon: Box, label: "Empaque", moduleId: 'catalogo' },
  { href: "/dashboard/pagos", icon: CreditCard, label: "Pagos", moduleId: 'catalogo' },
  
  // 26-30: GESTIÓN Y CONFIGURACIÓN
  { href: "/dashboard/contabilidad", icon: Calculator, label: "Contabilidad", moduleId: 'contabilidad' },
  { href: "/dashboard/kardex", icon: Layers, label: "Inventario Kardex", moduleId: 'inventario-kardex' },
  { href: "/dashboard/configuracion/factura", icon: Receipt, label: "Editor Factura" },
  { href: "/dashboard/configuracion/impresoras", icon: Printer, label: "Impresoras" },
  { href: "/dashboard/configuracion/chatbot-menu", icon: Bot, label: "Chatbot Menú", moduleId: 'chatbot-menu-publico' },
  
  // 31-34: SISTEMA Y PERFIL
  { href: "/dashboard/backups", icon: Database, label: "Backups" },
  { href: "/dashboard/subscription", icon: ShieldCheck, label: "Suscripción" },
  { href: "/dashboard/suggestions", icon: Lightbulb, label: "Sugerencias", moduleId: 'motor-de-sugerencias-inteligentes' },
  { href: "/dashboard/perfil", icon: User, label: "Perfil" },
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
    <ScrollArea className="flex-1 h-full">
      <SidebarMenu className="px-2 pb-8">
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
    </ScrollArea>
  );
}