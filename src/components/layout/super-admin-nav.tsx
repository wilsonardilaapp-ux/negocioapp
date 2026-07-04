"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from 'firebase/firestore';
import type { Module } from '@/models/module';
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
  Building,
  Bell,
  Mail,
  ScanLine,
  Calculator,
  Bot,
  Search,
  Star,
  Gift,
  Cookie,
} from "lucide-react";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

const navItemsList = [
  { href: "/superadmin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/superadmin/usuarios", icon: Users, label: "Usuarios" },
  { href: "/superadmin/negocios", icon: Building, label: "Negocios" },
  { href: "/superadmin/affiliates", icon: Gift, label: "Programa Socios" },
  { href: "/superadmin/business-directory", icon: Search, label: "Directorio", moduleId: 'business-directory' },
  { href: "/superadmin/valoraciones", icon: Star, label: "Valoraciones" },
  { href: "/superadmin/subscriptions", icon: CreditCard, label: "Suscripciones" },
  { href: "/superadmin/revenue", icon: TrendingUp, label: "Ingresos" },
  { href: "/superadmin/plans", icon: Package, label: "Planes" },
  { href: "/superadmin/hybrid-plans", icon: Package, label: "Planes Híbridos" },
  { href: "/superadmin/hybrid-billing", icon: Calculator, label: "Facturación Híbrida" },
  { href: "/superadmin/payment-methods", icon: CreditCard, label: "Pasarelas de Pago" },
  { href: "/superadmin/blog", icon: FileText, label: "Blog" },
  { href: "/superadmin/integraciones", icon: Plug, label: "Integraciones" },
  { href: "/superadmin/chatbot-ia", icon: Bot, label: "Chatbot IA" },
  { href: "/superadmin/notifications", icon: Bell, label: "Notificaciones" },
  { href: "/superadmin/contacto", icon: Mail, label: "Bandeja de Entrada" },
  { href: "/superadmin/landing-public", icon: FileText, label: "Editor de Landing" },
  { href: "/superadmin/servicios", icon: Server, label: "Servicios" },
  { href: "/superadmin/modulos", icon: Box, label: "Módulos" },
  { href: "/superadmin/monitoreo", icon: Activity, label: "Monitoreo" },
  { href: "/superadmin/pistola-scanner", icon: ScanLine, label: "Pistola Escáner" },
  { href: "/superadmin/configuracion", icon: Settings, label: "Configuración" },
  { href: "/superadmin/cookies", icon: Cookie, label: "Cookies" },
  { href: "/superadmin/analytics", icon: BarChart, label: "Métricas" },
  { href: "/superadmin/perfil", icon: UserCircle, label: "Perfil" },
];

export function SuperAdminNav() {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { setOpenMobile } = useSidebar();

  const modulesQuery = useMemoFirebase(
    () => (!firestore ? null : collection(firestore, 'modules')),
    [firestore]
  );
  const { data: modules } = useCollection<Module>(modulesQuery);

  const navItems = useMemo(() => {
    return navItemsList.filter(item => {
      if (!item.moduleId) return true;
      const module = modules?.find(m => m.id === item.moduleId);
      return module?.status === 'active';
    });
  }, [modules]);

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== "/superadmin" || pathname === "/superadmin")}
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
