
'use client';

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useAuth, useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

const LoadingScreen = () => (
    <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-center flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Cargando y verificando acceso...</p>
        </div>
    </div>
);

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading, profile } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await auth.signOut();
      // The FirebaseProvider will redirect to /login on auth state change.
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  if (isUserLoading) {
    return <LoadingScreen />;
  }

  // If loading is done and there's no user, the provider will redirect.
  // Render nothing to avoid a flash of content.
  if (!user) {
    return null;
  }
  
  // We now TRUST that the FirebaseProvider will handle redirection for non-super_admins.
  // This layout no longer needs to check the role, which prevents race conditions.

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/superadmin" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold font-headline">Zentry</span>
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
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
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
              <DropdownMenuItem asChild><Link href="/">Página principal</Link></DropdownMenuItem>
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
          <div className="ml-auto">
            {/* Header content for admin panel can go here */}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
