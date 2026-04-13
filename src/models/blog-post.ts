import type { Timestamp } from 'firebase/firestore';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string; // HTML from Quill
  imageUrl: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  isActive: boolean;
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string;
  businessId?: string; // ID del negocio si es un post de cliente
};

export type BlogAppearanceConfig = {
  title: string;
  content: string;
  iconName: string;
};
