
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
  CalendarCheck
} from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/catalogo", icon: ShoppingCart, label: "Catálogo", moduleId: 'catalogo' },
  { href: "/dashboard/reservas/servicios", icon: CalendarCheck, label: "Reservas y Servicios", moduleId: 'reservas-agendamiento' },
  { href: "/dashboard/blog", icon: FileText, label: "Blog", moduleId: 'blog' },
  { href: "/dashboard/promotions", icon: Tag, label: "Promociones", moduleId: 'promotions' },
  { href: "/dashboard/contabilidad", icon: Calculator, label: "Contabilidad", moduleId: 'contabilidad' },
  { href: "/dashboard/kardex", icon: Package, label: "Inventario", moduleId: 'inventario-kardex' },
  { href: "/dashboard/perfil", icon: UserCircle, label: "Perfil" },
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
