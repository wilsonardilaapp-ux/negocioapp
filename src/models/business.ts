
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'pending_payment';
export type DirectoryStatus = 'approved' | 'suspended' | 'hidden';

export type Business = {
    id: string;
    name: string;
    ownerName: string;
    ownerEmail: string;
    contactEmail?: string;
    phone?: string;
    logoURL: string;
    avatarUrl?: string;
    bannerUrl?: string;
    faviconUrl?: string;
    address?: string;
    website?: string;
    description: string;
    googleAnalyticsId?: string;
    vatRate?: number;
    deliveryFee?: number;
    packagingFee?: number;
    planName?: string;
    status: EntityStatus;
    imageLimit?: number | null;
    productLimit?: number | null;
    
    // Directorio Fields
    directoryEnabled?: boolean;
    directoryStatus?: DirectoryStatus;
    category?: string;
    tags?: string[];
    rating?: number;
    reviewCount?: number;
    socialLinks?: {
        instagram?: string;
        facebook?: string;
        whatsapp?: string;
    };
    internalNotes?: string;
};
