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

export interface UserHookResult {
  user: User | null;
  profile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const SUPER_ADMIN_EMAILS = ['allseosoporte@gmail.com'];

export function useUser(): UserHookResult {
  const { auth, firestore, isNetworkEnabled } = useFirebase();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    profile: null,
    isUserLoading: true,
    userError: null,
  });
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait until network is enabled to set up listeners
    if (!auth || !firestore || !isNetworkEnabled) {
        // If services aren't ready, we are not strictly "loading a user", 
        // but we are not in a final state either. We keep loading true.
        return;
    }

    let profileUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = undefined;
        }

        if (currentUser) {
          const userDocRef = doc(firestore, 'users', currentUser.uid);
          profileUnsubscribe = onSnapshot(
            userDocRef,
            (userDocSnap) => {
              let profile: UserProfile | null = null;
              if (userDocSnap.exists()) {
                profile = userDocSnap.data() as UserProfile;
              } else if (SUPER_ADMIN_EMAILS.includes(currentUser.email || '')) {
                profile = {
                  id: currentUser.uid,
                  name: currentUser.displayName || 'Super Admin',
                  email: currentUser.email!,
                  role: 'super_admin',
                  status: 'active',
                  createdAt: new Date().toISOString(),
                  lastLogin: new Date().toISOString(),
                };
              }
              setUserAuthState({ user: currentUser, profile, isUserLoading: false, userError: null });
            },
            (error) => {
              console.error("useUser: Profile onSnapshot error:", error);
              setUserAuthState({ user: currentUser, profile: null, isUserLoading: false, userError: error });
            }
          );
        } else {
          setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("useUser: onAuthStateChanged error:", error);
        if (profileUnsubscribe) profileUnsubscribe();
        setUserAuthState({ user: null, profile: null, isUserLoading: false, userError: error });
      }
    );

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [auth, firestore, isNetworkEnabled]);
  
  // Logic for redirection, can also be moved here to be coupled with user state
  useEffect(() => {
    if (userAuthState.isUserLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');
    const role = userAuthState.profile?.role;

    if (userAuthState.user) {
        if (role === 'super_admin') {
            if (isAuthPage || isDashboardPage) {
                router.replace('/superadmin');
            }
        } else { // Assumes 'cliente_admin' or any other non-super-admin role
            if (isAuthPage || isSuperAdminPage) {
                router.replace('/dashboard');
            }
        }
    } else {
        // No user logged in
        if (isDashboardPage || isSuperAdminPage) {
            router.replace('/login');
        }
    }
  }, [userAuthState, pathname, router]);

  return userAuthState;
}
