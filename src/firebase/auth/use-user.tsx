'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { User as UserProfile } from '@/models/user';

// --- LISTA BLANCA ESTRICTA DE SUPER ADMINISTRADORES ---
// Cualquier correo en esta lista tendrá acceso total al panel /superadmin
export const SUPER_ADMIN_EMAILS = [
  'allseosoporte@gmail.com',
  'admin@zentry.com',
  'admin@ecosalud.com',
  'alexjfweb@gmail.com'
];

/**
 * Determina el estado de actividad basado en la última fecha de uso.
 */
const getActivityStatus = (lastActiveAtISO: string): string => {
  const now = new Date();
  const lastActive = new Date(lastActiveAtISO);
  const diffInDays = (now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24);

  if (diffInDays < 3) return 'active';
  if (diffInDays <= 7) return 'at_risk';
  return 'dormant';
};

export function useUser() {
  const { auth, firestore, isNetworkEnabled } = useFirebase();
  const [authState, setAuthState] = useState<{ user: User | null; isLoading: boolean; error: Error | null; }>({
    user: null,
    isLoading: true,
    error: null,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const isRedirecting = useRef(false);

  // 1. Monitorear cambios en Firebase Auth
  useEffect(() => {
    if (!auth || !isNetworkEnabled) return;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthState({ user, isLoading: false, error: null });
        if (!user) {
            setProfile(null);
            setProfileLoading(false);
        }
    }, (error) => {
        console.error("Auth State Error:", error);
        setAuthState({ user: null, isLoading: false, error });
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [auth, isNetworkEnabled]);

  // 2. Obtener Perfil y Autosanación de Roles
  useEffect(() => {
    if (!firestore || !authState.user) return;

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', authState.user.uid);
    const userEmail = authState.user.email?.toLowerCase().trim() || '';

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // --- LÓGICA DE SEGURIDAD: AUTOSANACIÓN DE ROLES ---
            const isAuthorizedAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
            
            if (data.role === 'super_admin' && !isAuthorizedAdmin) {
                // Degradación de seguridad para usuarios no autorizados que intentan usurpar el rol
                console.warn(`[Seguridad] Degradando usuario no autorizado: ${userEmail}`);
                const correctedProfile = { ...data, role: 'cliente_admin' as const };
                setProfile(correctedProfile);
                updateDocumentNonBlocking(userDocRef, { role: 'cliente_admin' });
            } else if (data.role !== 'super_admin' && isAuthorizedAdmin) {
                // Auto-ascensión para correos en la lista blanca
                console.log(`[Seguridad] Elevando privilegios para admin autorizado: ${userEmail}`);
                const correctedProfile = { ...data, role: 'super_admin' as const };
                setProfile(correctedProfile);
                updateDocumentNonBlocking(userDocRef, { role: 'super_admin' });
            } else {
                setProfile(data);
            }
        } else {
            // Auto-creación del perfil si el usuario existe en Auth pero no en Firestore
            const isAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
            const newProfile: UserProfile = {
                id: authState.user!.uid,
                name: authState.user!.displayName || 'Usuario',
                email: userEmail,
                role: isAdmin ? 'super_admin' : 'cliente_admin',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile, { merge: true });
            setProfile(newProfile);
        }
        setProfileLoading(false);
    }, (error) => {
        console.error("Firestore Profile Listener Error:", error);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, authState.user]);

  // 3. Activity Tracker para Negocios (SaaS Tenant Activity)
  useEffect(() => {
    if (!firestore || !authState.user || !profile || profile.role !== 'cliente_admin') return;

    const trackActivity = async () => {
        try {
            const businessId = authState.user!.uid;
            const businessRef = doc(firestore, 'businesses', businessId);
            const businessSnap = await getDoc(businessRef);

            if (businessSnap.exists()) {
                const data = businessSnap.data();
                const lastActiveAt = data.lastActiveAt;
                const now = new Date();
                
                let shouldUpdate = true;
                if (lastActiveAt) {
                    const lastDate = new Date(lastActiveAt);
                    const diffInMinutes = (now.getTime() - lastDate.getTime()) / (1000 * 60);
                    // Solo actualizar si pasaron más de 10 minutos para evitar escrituras excesivas
                    if (diffInMinutes < 10) {
                        shouldUpdate = false;
                    }
                }

                if (shouldUpdate) {
                    const nowISO = now.toISOString();
                    // Calculamos el estado basándonos en la fecha actual (que será 'active')
                    // pero mantenemos la lógica por si en el futuro se usa un valor histórico
                    const currentStatus = getActivityStatus(nowISO);
                    
                    updateDocumentNonBlocking(businessRef, {
                        lastActiveAt: nowISO,
                        activityStatus: currentStatus
                    });
                }
            }
        } catch (e) {
            console.error("[ActivityTracker] Error:", e);
        }
    };

    if (!authState.isLoading && !isProfileLoading) {
        trackActivity();
    }
  }, [firestore, authState.user, authState.isLoading, profile, isProfileLoading]);

  // 4. Lógica de Redirección Robusta
  useEffect(() => {
    if (authState.isLoading || isProfileLoading || isRedirecting.current) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');

    // Caso: No hay usuario autenticado
    if (!authState.user) {
        if (isDashboardPage || isSuperAdminPage) {
            isRedirecting.current = true;
            router.replace('/login');
        }
        return;
    }

    // Caso: Usuario autenticado con perfil cargado
    if (profile) {
        const role = profile.role;
        const isAdmin = role === 'super_admin';

        if (isAdmin) {
            // El Super Admin siempre debe ser redirigido a /superadmin desde cualquier otra ruta protegida o de auth
            if (isAuthPage || isDashboardPage || pathname === '/') {
                isRedirecting.current = true;
                router.replace('/superadmin');
            }
        } else {
            // Los Clientes no pueden entrar en /superadmin
            if (isAuthPage || isSuperAdminPage) {
                isRedirecting.current = true;
                router.replace('/dashboard');
            }
        }
    }

    // Resetear flag de redirección tras el ciclo de renderizado para evitar bloqueos
    const timer = setTimeout(() => {
        isRedirecting.current = false;
    }, 1000);
    
    return () => clearTimeout(timer);

  }, [authState.isLoading, authState.user, profile, isProfileLoading, pathname, router]);

  return {
    user: authState.user,
    profile: profile,
    isUserLoading: authState.isLoading,
    isProfileLoading: isProfileLoading,
    userError: authState.error,
  };
}
