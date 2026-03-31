
'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { User as UserProfile } from '@/models/user';

interface UserAuthState {
  user: User | null;
  profile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const SUPER_ADMIN_EMAILS = ['allseosoporte@gmail.com'];

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

  // Effect 1: Handle Auth State Changes ONLY
  useEffect(() => {
    if (!auth || !isNetworkEnabled) {
        setAuthState({ user: null, isLoading: false, error: null });
        return;
    };
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthState({ user, isLoading: false, error: null });
    }, (error) => {
        console.error("useUser: onAuthStateChanged error:", error);
        setAuthState({ user: null, isLoading: false, error });
    });

    return () => unsubscribe();
  }, [auth, isNetworkEnabled]);

  // Effect 2: Handle Profile Fetching based on Auth State
  useEffect(() => {
    if (!firestore || !authState.user) {
        setProfile(null);
        setProfileLoading(false);
        return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', authState.user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
        } else if (authState.user && SUPER_ADMIN_EMAILS.includes(authState.user.email || '')) {
            // Create a virtual profile for super admin if it doesn't exist
            setProfile({
                id: authState.user.uid,
                name: authState.user.displayName || 'Super Admin',
                email: authState.user.email!,
                role: 'super_admin',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
            });
        } else {
            setProfile(null);
        }
        setProfileLoading(false);
    }, (error) => {
        console.error("useUser: Profile onSnapshot error:", error);
        setProfile(null);
        setProfileLoading(false);
        // We set the auth error here if profile fails, to signal a problem
        setAuthState(prev => ({...prev, error}));
    });

    return () => unsubscribe();
  }, [firestore, authState.user]);

  // Effect 3: Handle Redirection based on combined state
  const isUserLoading = authState.isLoading || isProfileLoading;
  
  useEffect(() => {
    // Don't redirect while still figuring out who the user is
    if (isUserLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');
    const role = profile?.role;

    if (authState.user) {
        if (role === 'super_admin') {
            if (isAuthPage || isDashboardPage) {
                router.replace('/superadmin');
            }
        } else if (role) { // Any other defined role
            if (isAuthPage || isSuperAdminPage) {
                router.replace('/dashboard');
            }
        }
        // If user exists but profile is null (still loading or doesn't exist), we wait.
    } else {
        // No user logged in
        if (isDashboardPage || isSuperAdminPage) {
            router.replace('/login');
        }
    }
  }, [isUserLoading, authState.user, profile, pathname, router]);

  return {
    user: authState.user,
    profile: profile,
    isUserLoading: isUserLoading,
    userError: authState.error,
  };
}
