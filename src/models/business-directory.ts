
/**
 * @fileOverview Types for the Business Directory module.
 */

export type DirectoryCategory = 'Salud' | 'Bienestar' | 'Belleza' | 'Deportes' | 'Nutrición' | 'Otro';

export interface BusinessDirectoryEntry {
    id: string;
    businessId: string;
    name: string;
    description: string;
    logoUrl: string | null;
    category: DirectoryCategory;
    tags: string[];
    isVerified: boolean;
    featured: boolean;
    rating: number;
    reviewCount: number;
    listingDate: string; // ISO String
    updatedAt: string; // ISO String
    status: 'published' | 'hidden' | 'pending';
    
    /** 
     * @description Flag obligatorio para visibilidad pública.
     * Si es false, el negocio no aparecerá en el directorio ni será accesible por URL pública.
     */
    publicProfile: boolean; 

    // Public profile fields
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    socialLinks?: {
        instagram?: string;
        facebook?: string;
        whatsapp?: string;
    };

    /**
     * @description Notas internas del administrador (SENSIBLE - No mostrar en UI pública)
     */
    internalNotes?: string;
}

export const DIRECTORY_CATEGORIES: DirectoryCategory[] = [
    'Salud',
    'Bienestar',
    'Belleza',
    'Deportes',
    'Nutrición',
    'Otro'
];
