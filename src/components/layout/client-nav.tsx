"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, writeBatch } from "firebase/firestore";
import type { Module } from "@/models/module";
import type { SystemService } from "@/models/system-service";
import { useMemo, useEffect, useRef } from 'react';
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
} from "lucide-react";
import { MessageCircle as MessageCircleIcon } from "@/components/icons";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/landing-page", icon: FileText, label: "Landing Page" },
  { href: "/dashboard/catalogo", icon: ShoppingCart, label: "Catálogo", moduleId: 'catalogo' },
  { href: "/dashboard/share", icon: Share2, label: "Compartir Menú" },
  { href: "/dashboard/blog", icon: FileText, label: "Blog", moduleId: 'blog' },
  { href: "/dashboard/promotions", icon: Tag, label: "Promociones" },
  { href: "/dashboard/cupones", icon: Ticket, label: "Cupones" },
  { href: "/dashboard/messages", icon: Bell, label: "Notificaciones" },
  { href: "/dashboard/mensajes-clientes", icon: Mail, label: "Mensajes de Clientes" },
  { href: "/dashboard/contacto", icon: MessageSquare, label: "Soporte" },
  { href: "/dashboard/pedidos", icon: ShoppingBag, label: "Pedidos" },
  { href: "/dashboard/empaque", icon: Package, label: "Empaque" },
  { href: "/dashboard/pagos", icon: CreditCard, label: "Pagos" },
  { href: "/dashboard/contabilidad", icon: Calculator, label: "Contabilidad", moduleId: 'contabilidad' },
  { href: "/dashboard/kardex", icon: Package, label: "Inventario Kardex", moduleId: 'inventario-kardex' },
  { href: "/dashboard/configuracion/factura", icon: FileText, label: "Editor Factura" },
  { href: "/dashboard/configuracion/impresoras", icon: Printer, label: "Impresoras" },
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

  const activeFeatures = useMemo(() => {
    return new Set(['catalogo', 'blog', 'promotions']);
  }, []);

  const navItems = allNavItems;

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
