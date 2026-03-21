"use client";

import { useState, useEffect } from "react";
import { useFirestore } from "@/firebase";
import { collection, onSnapshot, doc, getDoc, type Unsubscribe, type Timestamp } from "firebase/firestore";
import type { User } from "@/models/user";
import type { Subscription } from "@/models/subscription";

export interface ClientWithSubscription extends User {
  userId: string;
  subscription: Subscription | null;
}

export function useAllSubscriptions() {
  const firestore = useFirestore();
  const [clients, setClients] = useState<ClientWithSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!firestore) return;

    setIsLoading(true);
    const usersCollectionRef = collection(firestore, "users");
    
    // Listen for changes in the users collection
    const unsubscribeUsers = onSnapshot(
      usersCollectionRef,
      async (usersSnapshot) => {
        try {
          const usersData = usersSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as User));

          // For each user, fetch their subscription data
          const clientsWithSubs = await Promise.all(
            usersData.map(async (user) => {
              const subDocRef = doc(firestore, `businesses/${user.id}/subscription`, "current");
              const subSnap = await getDoc(subDocRef);
              
              const subscription = subSnap.exists() 
                ? (subSnap.data() as Subscription) 
                : null;
                
              return {
                ...user,
                userId: user.id, // Ensure userId is present for convenience
                subscription,
              };
            })
          );
          
          setClients(clientsWithSubs);
          setError(null);
        } catch (e: any) {
          console.error("Error fetching subscription data for users:", e);
          setError(e);
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        console.error("Error listening to users collection:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribeUsers();
  }, [firestore]);

  return { clients, isLoading, error };
}
