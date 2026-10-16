'use server';

import { getAdminFirestore } from "@/firebase/server-init";
import { checkShareCardsModuleActive } from "./share-cards-module";
import { SHARE_CARDS_MODULE } from "@/constants/share-cards";
import type { ShareCard } from "@/models/share-card";

const RESERVED_REFS = ["web", "whatsapp", "redes", "landing", "qr", "blog", "directorio", "mesa"];

export async function getBusinessShareCards(businessId: string): Promise<{ cards: ShareCard[]; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const snap = await firestore.collection(`businesses/${businessId}/share_cards`).orderBy("createdAt", "asc").get();
    const cards: ShareCard[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShareCard));
    return { cards };
  } catch (e: any) {
    return { cards: [], error: e.message };
  }
}

export async function saveShareCard(
  businessId: string, 
  data: { id?: string; name: string; ref: string }
): Promise<{ success: boolean; card?: ShareCard; error?: string }> {
  try {
    const { active, limit } = await checkShareCardsModuleActive(businessId);
    if (!active) {
      return { success: false, error: "El negocio no tiene activo el módulo Tarjetas de Seguimiento." };
    }

    const firestore = await getAdminFirestore();
    const colRef = firestore.collection(`businesses/${businessId}/share_cards`);

    const cleanName = data.name.trim().slice(0, 30);
    if (cleanName.length < 2) {
      return { success: false, error: "El nombre debe tener entre 2 y 30 caracteres." };
    }

    if (data.id) {
      // Edición de nombre solamente
      const cardRef = colRef.doc(data.id);
      const docSnap = await cardRef.get();
      if (!docSnap.exists) {
        return { success: false, error: "La tarjeta no existe." };
      }
      await cardRef.update({
        name: cleanName,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    }

    // Creación de nueva tarjeta
    const cleanRef = data.ref.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (cleanRef.length < 2 || cleanRef.length > 30) {
      return { success: false, error: "El identificador (ref) debe tener entre 2 y 30 caracteres válidos." };
    }

    if (RESERVED_REFS.includes(cleanRef)) {
      return { success: false, error: "El identificador coincide con un canal reservado del sistema." };
    }

    // Comprobar límite
    const existingSnap = await colRef.get();
    if (existingSnap.size >= limit) {
      return { success: false, error: `Has alcanzado el límite máximo de ${limit} tarjetas de seguimiento.` };
    }

    // Comprobar unicidad de ref en el negocio
    const refMatch = existingSnap.docs.find(d => d.data().ref === cleanRef);
    if (refMatch) {
      return { success: false, error: "Ya existe una tarjeta con este identificador (ref) en tu negocio." };
    }

    const newDocRef = colRef.doc();
    const newCard: ShareCard = {
      id: newDocRef.id,
      businessId,
      name: cleanName,
      ref: cleanRef,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await newDocRef.set(newCard);
    return { success: true, card: newCard };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function archiveShareCard(businessId: string, cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const cardRef = firestore.doc(`businesses/${businessId}/share_cards/${cardId}`);
    await cardRef.update({
      isArchived: true,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}


export async function validateAndResolveRef(businessId: string, rawRef: string | null | undefined): Promise<string> {
  if (!rawRef) return "web";
  const cleanRef = rawRef.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!cleanRef) return "web";

  // Canales base siempre permitidos
  const BASE_CHANNELS = ["web", "whatsapp", "redes", "landing", "qr", "blog"];
  if (BASE_CHANNELS.includes(cleanRef)) return cleanRef;

  // Si no hay businessId, fallback a web
  if (!businessId) return "web";

  try {
    // Validar si el negocio tiene activo el módulo de tarjetas
    const { active } = await checkShareCardsModuleActive(businessId);
    if (!active) {
      // Sin módulo activo, ref=directorio o cualquier ref personalizado cae a web (Acceso directo)
      return "web";
    }

    // Si el módulo está activo y el ref es "directorio"
    if (cleanRef === SHARE_CARDS_MODULE.CANAL_DIRECTORIO) {
      return SHARE_CARDS_MODULE.CANAL_DIRECTORIO;
    }

    // Verificar si existe la tarjeta en la subcolección del negocio (activa o archivada)
    const firestore = await getAdminFirestore();
    const querySnap = await firestore.collection(`businesses/${businessId}/share_cards`)
      .where("ref", "==", cleanRef)
      .limit(1)
      .get();

    if (!querySnap.empty) {
      return cleanRef; // Ref válido de este negocio
    }
  } catch (err) {
    console.error("Error al validar ref en servidor:", err);
  }

  // Si no coincide o es de otro negocio -> Acceso directo
  return "web";
}
