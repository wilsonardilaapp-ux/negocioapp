
'use server';

import { revalidatePath } from 'next/cache';
import { getFirestore, collection, addDoc, getCountFromServer, doc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { BlogPost } from '@/models/blog-post';


const GLOBAL_POST_LIMIT = 50;

function getFirebaseInstance() {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export async function createPost(formData: FormData) {
    // Inicialización de Firebase específica para la Server Action
    const app = getFirebaseInstance();
    const firestore = getFirestore(app);

    // 1. Validar límite global
    const postsCollection = collection(firestore, 'blog_posts');
    const snapshot = await getCountFromServer(postsCollection);
    const postCount = snapshot.data().count;

    if (postCount >= GLOBAL_POST_LIMIT) {
        return { success: false, error: 'Se ha alcanzado el límite máximo de posts permitidos.' };
    }

    // 2. Procesar datos del formulario
    const rawData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        imageUrl: formData.get('imageUrl') as string,
        isActive: formData.get('isActive') === 'on',
        seoTitle: formData.get('seoTitle') as string,
        seoDescription: formData.get('seoDescription') as string,
        seoKeywords: (formData.get('seoKeywords') as string).split(',').map(k => k.trim()).filter(k => k),
        businessId: formData.get('businessId') as string | undefined, // Capturar businessId
    };

    if (!rawData.title || !rawData.content || !rawData.imageUrl) {
        return { success: false, error: 'Título, contenido y URL de imagen son requeridos.' };
    }

    const newPostData: Omit<BlogPost, 'id'> = {
        title: rawData.title,
        content: rawData.content,
        imageUrl: rawData.imageUrl,
        isActive: rawData.isActive,
        seoTitle: rawData.seoTitle,
        seoDescription: rawData.seoDescription,
        seoKeywords: rawData.seoKeywords,
        slug: slugify(rawData.title),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    
    if (rawData.businessId) {
        (newPostData as any).businessId = rawData.businessId;
    }


    // 3. Guardar en Firestore
    try {
        await addDoc(postsCollection, newPostData);
    } catch (error: any) {
        return { success: false, error: `Error al guardar en Firestore: ${error.message}` };
    }

    // 4. Revalidar y redirigir
    const revalidationPath = rawData.businessId ? '/dashboard/blog' : '/superadmin/blog';
    revalidatePath(revalidationPath);
    return { success: true, message: 'Post creado con éxito.' };
}


export async function updatePost(formData: FormData) {
    const app = getFirebaseInstance();
    const firestore = getFirestore(app);

    const postId = formData.get('id') as string;
    if (!postId) {
        return { success: false, error: 'ID del post no encontrado.' };
    }

    const postRef = doc(firestore, 'blog_posts', postId);

    const rawData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        imageUrl: formData.get('imageUrl') as string,
        isActive: formData.get('isActive') === 'on',
        seoTitle: formData.get('seoTitle') as string,
        seoDescription: formData.get('seoDescription') as string,
        seoKeywords: (formData.get('seoKeywords') as string).split(',').map(k => k.trim()).filter(k => k),
    };

    if (!rawData.title || !rawData.content || !rawData.imageUrl) {
        return { success: false, error: 'Título, contenido y URL de imagen son requeridos.' };
    }

    const updatedData = {
        title: rawData.title,
        slug: slugify(rawData.title),
        content: rawData.content,
        imageUrl: rawData.imageUrl,
        isActive: rawData.isActive,
        seoTitle: rawData.seoTitle,
        seoDescription: rawData.seoDescription,
        seoKeywords: rawData.seoKeywords,
        updatedAt: new Date().toISOString(),
    };

    try {
        await updateDoc(postRef, updatedData);
    } catch (error: any) {
        return { success: false, error: `Error al actualizar en Firestore: ${error.message}` };
    }
    
    const revalidationPath = '/dashboard/blog'; // Asumimos que la edición es desde el dashboard
    revalidatePath(revalidationPath);
    revalidatePath(`/blog/${updatedData.slug}`); // Revalidar la página pública del post

    return { success: true, message: 'Post actualizado con éxito.' };
}
