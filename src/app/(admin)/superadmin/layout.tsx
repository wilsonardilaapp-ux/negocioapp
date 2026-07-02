'use client';

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/icons";
import { SuperAdminNav } from "@/components/layout/super-admin-nav";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const LoadingScreen = () => (
    <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-center flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Verificando credenciales de administrador...</p>
        </div>
    </div>
);

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading, profile, isProfileLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  // Initialize Affiliate Config if it doesn't exist
  useEffect(() => {
    if (!firestore || profile?.role !== 'super_admin') return;

    const initAffiliateConfig = async () => {
      const configRef = doc(firestore, 'adminConfig', 'affiliates');
      const snap = await getDoc(configRef);
      if (!snap.exists()) {
        await setDoc(configRef, {
          programName: "Programa Socios",
          rewardReferent: 5,
          rewardReferree: 5,
          maxReferralsPerUser: null,
          isActive: true
        });
        console.log("[Affiliates] Configuración inicial creada.");
      }
    };
    initAffiliateConfig();
  }, [firestore, profile?.role]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  // Mostrar pantalla de carga solo mientras los datos esenciales se obtienen
  if (isUserLoading || isProfileLoading) {
    return <LoadingScreen />;
  }

  // Si no es un super_admin confirmado, no renderizar nada (el hook useUser manejará la patada a /dashboard)
  if (!user || profile?.role !== 'super_admin') {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/superadmin" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold font-headline">Markix</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SuperAdminNav />
        </SidebarContent>
        <SidebarFooter>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="justify-start w-full p-2 h-auto">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.photoURL ?? user?.photoURL ?? "https://picsum.photos/seed/admin/100/100"} alt="Super Admin" />
                    <AvatarFallback>{profile?.name?.[0].toUpperCase() ?? 'SA'}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium">{profile?.name ?? "Super Admin"}</p>
                    <p className="text-xs text-muted-foreground">Super Administrador</p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.name ?? "Super Admin"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/">Ir al sitio público</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-40 flex items-center h-16 px-4 bg-background/80 backdrop-blur-sm border-b md:px-6">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="ml-auto text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
            Panel de Control Global
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
