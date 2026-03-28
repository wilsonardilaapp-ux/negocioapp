'use server';

import { revalidatePath } from 'next/cache';
import { getAdminFirestore } from '@/firebase/server-init';
import type { Module } from '@/models/module';

const slugify = (text: string) => 
  text
    .toLowerCase()
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

export async function saveModule(
  data: {
    id?: string;
    name: string;
    description: string;
    limit: number;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const moduleId = data.id || slugify(data.name);
    const moduleRef = firestore.collection('modules').doc(moduleId);
    
    const isEditing = !!data.id;

    const moduleData: Partial<Module> = {
      name: data.name,
      description: data.description,
      limit: data.limit,
    };

    if (!isEditing) {
      moduleData.id = moduleId;
      moduleData.status = 'active';
      moduleData.createdAt = new Date().toISOString();
    } else {
      (moduleData as any).updatedAt = new Date().toISOString();
    }

    await moduleRef.set(moduleData, { merge: true });
    
    revalidatePath('/superadmin/modulos');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error guardando módulo:", error);
    return { success: false, error: error.message };
  }
}
