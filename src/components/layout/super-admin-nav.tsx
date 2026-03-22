
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Server,
  Box,
  Activity,
  Plug,
  Settings,
  BarChart,
  FileText,
  CreditCard,
  TrendingUp,
  Package,
  UserCircle,
  HardDrive,
} from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

const navItems = [
  { href: "/superadmin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/superadmin/usuarios", icon: Users, label: "Usuarios" },
  { href: "/superadmin/subscriptions", icon: CreditCard, label: "Suscripciones" },
  { href: "/superadmin/revenue", icon: TrendingUp, label: "Ingresos" },
  { href: "/superadmin/plans", icon: Package, label: "Planes" },
  { href: "/superadmin/payment-methods", icon: CreditCard, label: "Pasarelas de Pago" },
  { href: "/superadmin/blog", icon: FileText, label: "Blog" },
  { href: "/superadmin/servicios", icon: Server, label: "Servicios" },
  { href: "/superadmin/modulos", icon: Box, label: "Módulos" },
  { href: "/superadmin/integraciones", icon: Plug, label: "Integraciones" },
  { href: "/superadmin/backups", icon: HardDrive, label: "Backups" },
  { href: "/superadmin/monitoreo", icon: Activity, label: "Monitoreo" },
  { href: "/superadmin/configuracion", icon: Settings, label: "Configuración" },
  { href: "/superadmin/analytics", icon: BarChart, label: "Métricas" },
  { href: "/superadmin/perfil", icon: UserCircle, label: "Perfil" },
];

export function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== "/superadmin" || pathname === "/superadmin")}
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
