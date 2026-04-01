'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Module } from "@/models/module";
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
} from "lucide-react";
import { MessageCircle as MessageCircleIcon } from "@/components/icons";

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/landing-page", icon: FileText, label: "Landing Page" },
  { href: "/dashboard/catalogo", icon: ShoppingCart, label: "Catálogo", moduleId: 'catalogo' },
  { href: "/dashboard/share", icon: Share2, label: "Compartir Menú" },
  { href: "/dashboard/blog", icon: FileText, label: "Blog", moduleId: 'blog' },
  { href: "/dashboard/messages", icon: Mail, label: "Mensajes" },
  { href: "/dashboard/contacto", icon: MessageSquare, label: "Soporte" },
  { href: "/dashboard/pedidos", icon: ShoppingBag, label: "Pedidos" },
  { href: "/dashboard/empaque", icon: Package, label: "Empaque" },
  { href: "/dashboard/pagos", icon: CreditCard, label: "Pagos" },
  { href: "/dashboard/contabilidad", icon: Calculator, label: "Contabilidad", moduleId: 'contabilidad' },
  { href: "/dashboard/kardex", icon: Package, label: "Inventario Kardex", moduleId: 'inventario-kardex' },
  { href: "/dashboard/configuracion/factura", icon: FileText, label: "Editor Factura" },
  { href: "/dashboard/configuracion/impresoras", icon: Printer, label: "Impresoras" },
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

  const modulesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return collection(firestore, 'businesses', user.uid, 'modules');
  }, [firestore, user?.uid]);
  
  const { data: modules, isLoading } = useCollection<Module>(modulesQuery);

  const handleLinkClick = () => {
    setOpenMobile(false);
  };
  
  const navItems = allNavItems.filter(item => {
    if (!item.moduleId) {
      return true;
    }
    const module = modules?.find(m => m.id === item.moduleId);
    return module?.status === 'active';
  });

  if (isLoading) {
      return (
         <SidebarMenu>
            {[...Array(6)].map((_, i) => (
              <SidebarMenuItem key={i}>
                <div className="h-8 w-full bg-muted/50 animate-pulse rounded-md" />
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      )
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard")}
            tooltip={item.label}
            onClick={handleLinkClick}
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
