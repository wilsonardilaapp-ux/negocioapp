
'use client';

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import type { User as UserType } from '@/models/user';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from "lucide-react";

const LoadingScreen = () => (
    <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-center flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Cargando y verificando acceso de Super Admin...</p>
        </div>
    </div>
);

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Fetch user profile data once
  useEffect(() => {
    if (isUserLoading || !user || !firestore) {
        // If the user isn't loaded yet, we can't fetch the profile.
        // We set loading to false only if we know for sure there's no user.
        if (!isUserLoading && !user) {
            setIsProfileLoading(false);
        }
        return;
    }
    
    let isMounted = true;
    const fetchProfile = async () => {
        setIsProfileLoading(true);
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (isMounted) {
                if (userDocSnap.exists()) {
                    setUserProfile(userDocSnap.data() as UserType);
                } else {
                    setUserProfile(null); // User document not found
                }
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            if (isMounted) {
                setUserProfile(null);
            }
        } finally {
            if (isMounted) {
                setIsProfileLoading(false);
            }
        }
    };

    fetchProfile();

    return () => {
        isMounted = false;
    };
  }, [user, firestore, isUserLoading]);

  // Handle redirection
  useEffect(() => {
    // Wait until both user auth and profile fetch are complete
    if (isUserLoading || isProfileLoading) {
      return;
    }
    
    // If no user, redirect to login
    if (!user) {
      router.replace("/login");
      return;
    }
    
    // If user exists but is not a super_admin, redirect to client dashboard
    if (!userProfile || userProfile.role !== 'super_admin') {
      router.replace("/");
    }
  }, [user, isUserLoading, userProfile, isProfileLoading, router]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await auth.signOut();
      router.push('/login'); // Explicit redirect on logout
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  // After loading, if the user is not a valid super admin,
  // we render the loading screen while the redirect effect takes place.
  if (!user || !userProfile || userProfile.role !== 'super_admin') {
    return <LoadingScreen />;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/superadmin" className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold font-headline">Negocio V03</span>
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
                    <AvatarImage src={user.photoURL ?? "https://picsum.photos/seed/admin/100/100"} alt="Super Admin" />
                    <AvatarFallback>{user.email?.[0].toUpperCase() ?? 'SA'}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-medium">{user.displayName ?? "Super Admin"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.displayName ?? "Super Admin"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
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
