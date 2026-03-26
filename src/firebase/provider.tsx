'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDocFromServer, getDocFromCache } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { useRouter, usePathname } from 'next/navigation';


interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  role: string | null;
  roleLoaded: boolean;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { // Renamed from UserAuthHookResult for consistency if desired, or keep as UserAuthHookResult
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const SUPER_ADMIN_EMAILS = ['allseosoporte@gmail.com'];

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
    role: null,
    roleLoaded: false,
  });
  
  const router = useRouter();
  const pathname = usePathname();

  // Effect 1: Manages auth state changes only.
  useEffect(() => {
    if (!auth) { 
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided."), role: null, roleLoaded: true });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        let role: string | null = null;
        let roleLoaded = false;
        if (currentUser) {
            try {
                const userDocRef = doc(firestore, 'users', currentUser.uid);
                const userDocSnap = await getDocFromServer(userDocRef);
                if (userDocSnap.exists()) {
                    role = userDocSnap.data().role as string ?? null;
                }
            } catch (error: any) {
                console.warn("Could not fetch role from server, trying cache. Error:", error.code);
                try {
                    const userDocRef = doc(firestore, 'users', currentUser.uid);
                    const userDocSnapFromCache = await getDocFromCache(userDocRef);
                    if (userDocSnapFromCache.exists()) {
                        role = userDocSnapFromCache.data().role as string ?? null;
                    } else {
                         if (SUPER_ADMIN_EMAILS.includes(currentUser.email || '')) {
                            console.log("Fallback after cache miss: Assigning 'super_admin' role based on email.");
                            role = 'super_admin';
                        }
                    }
                } catch (cacheError) {
                     console.error("Cache fetch failed. Using email fallback. Error:", cacheError);
                     if (SUPER_ADMIN_EMAILS.includes(currentUser.email || '')) {
                        console.log("Fallback in cache error: Assigning 'super_admin' role based on email.");
                        role = 'super_admin';
                    }
                }
            } finally {
                roleLoaded = true;
            }
        } else {
            roleLoaded = true;
        }
        setUserAuthState({ user: currentUser, isUserLoading: false, userError: null, role, roleLoaded });
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error, role: null, roleLoaded: true });
      }
    );
    return () => unsubscribe();
  }, [auth, firestore]);

  // Effect 2: Manages redirection logic.
  useEffect(() => {
    if (userAuthState.isUserLoading) return; // Wait until auth state is determined
    if (userAuthState.user && !userAuthState.roleLoaded) return; // Wait for role fetch attempt to complete

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password';
    const isDashboardPage = pathname.startsWith('/dashboard');
    const isSuperAdminPage = pathname.startsWith('/superadmin');
    const role = userAuthState.role;

    if (userAuthState.user) {
        if (role === 'super_admin') {
            if (isAuthPage || isDashboardPage) {
                router.replace('/superadmin');
            }
        } else { // Handles regular user and role === null (e.g., on fetch error)
            if (isAuthPage || isSuperAdminPage) {
                router.replace('/dashboard');
            }
        }
    } else { // No user logged in
        if (isDashboardPage || isSuperAdminPage) {
            router.replace('/login');
        }
    }
  }, [userAuthState, pathname, router]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { // Renamed from useAuthUser
  const { user, isUserLoading, userError } = useFirebase(); // Leverages the main hook
  return { user, isUserLoading, userError };
};
