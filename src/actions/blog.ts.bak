
'use server';

import { revalidatePath } from 'next/cache';
import { getAdminFirestore } from '@/firebase/server-init';
import type { BlogPost } from '@/models/blog-post';
import { Timestamp } from 'firebase-admin/firestore';


const GLOBAL_POST_LIMIT = 50;

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
    const firestore = await getAdminFirestore();

    const postsCollection = firestore.collection('blog_posts');
    const snapshot = await postsCollection.count().get();
    const postCount = snapshot.data().count;

    if (postCount >= GLOBAL_POST_LIMIT) {
        return { success: false, error: 'Se ha alcanzado el límite máximo de posts permitidos.' };
    }

    const rawData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        imageUrl: formData.get('imageUrl') as string,
        isActive: formData.get('isActive') === 'on',
        seoTitle: formData.get('seoTitle') as string,
        seoDescription: formData.get('seoDescription') as string,
        seoKeywords: (formData.get('seoKeywords') as string).split(',').map(k => k.trim()).filter(k => k),
        businessId: formData.get('businessId') as string | undefined,
    };

    if (!rawData.title || !rawData.content || !rawData.imageUrl) {
        return { success: false, error: 'Título, contenido y URL de imagen son requeridos.' };
    }
    
    // Admin SDK uses native Date or Timestamp objects
    const now = new Date();

    const newPostData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Date, updatedAt: Date } = {
        title: rawData.title,
        content: rawData.content,
        imageUrl: rawData.imageUrl,
        isActive: rawData.isActive,
        seoTitle: rawData.seoTitle,
        seoDescription: rawData.seoDescription,
        seoKeywords: rawData.seoKeywords,
        slug: slugify(rawData.title),
        createdAt: now,
        updatedAt: now,
        ...(rawData.businessId && { businessId: rawData.businessId }),
    };

    try {
        await postsCollection.add(newPostData);
    } catch (error: any) {
        return { success: false, error: `Error al guardar en Firestore: ${error.message}` };
    }

    const revalidationPath = rawData.businessId ? '/dashboard/blog' : '/superadmin/blog';
    revalidatePath(revalidationPath);
    revalidatePath('/blog');
    return { success: true, message: 'Post creado con éxito.' };
}


export async function updatePost(formData: FormData) {
    const firestore = await getAdminFirestore();

    const postId = formData.get('id') as string;
    if (!postId) {
        return { success: false, error: 'ID del post no encontrado.' };
    }

    const postRef = firestore.collection('blog_posts').doc(postId);
    
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
        return { success: false, error: 'Post no encontrado.' };
    }
    const existingPostData = postSnap.data();

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
        updatedAt: new Date(),
    };

    try {
        await postRef.update(updatedData);
    } catch (error: any) {
        return { success: false, error: `Error al actualizar en Firestore: ${error.message}` };
    }
    
    const revalidationPath = existingPostData?.businessId ? '/dashboard/blog' : '/superadmin/blog';
    revalidatePath(revalidationPath);
    revalidatePath('/blog');
    revalidatePath(`/blog/${updatedData.slug}`);

    return { success: true, message: 'Post actualizado con éxito.' };
}

export async function deletePost(postId: string) {
  if (!postId) {
    return { success: false, error: 'Post ID is required.' };
  }

  const firestore = await getAdminFirestore();
  const postRef = firestore.collection('blog_posts').doc(postId);

  try {
    const doc = await postRef.get();
    if (!doc.exists) {
      return { success: false, error: 'Post not found.' };
    }
    const postData = doc.data();

    await postRef.delete();

    // Revalidate paths
    const revalidationPath = postData?.businessId ? '/dashboard/blog' : '/superadmin/blog';
    revalidatePath(revalidationPath);
    revalidatePath('/blog');
    if (postData?.slug) {
        if (postData?.businessId) {
             revalidatePath(`/blog/${postData.businessId}/${postData.slug}`);
        } else {
             revalidatePath(`/blog/${postData.slug}`); // Assuming global posts have a different structure
        }
    }

    return { success: true, message: 'Post eliminado con éxito.' };

  } catch (error: any) {
    return { success: false, error: `Error al eliminar el post: ${error.message}` };
  }
}
