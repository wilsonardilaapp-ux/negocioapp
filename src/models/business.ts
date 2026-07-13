export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'pending_payment';
export type DirectoryStatus = 'approved' | 'suspended' | 'hidden';

export type LoyaltyConfig = {
    enabled: boolean;
    amountThreshold: number; // Ej: 1000 para otorgar 1 punto por cada $1000
};

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
    
    // Activity Tracking
    lastActiveAt?: string;
    activityStatus?: string;

    // Referral System
    referralCode?: string;
    referredByBusinessId?: string | null;

    // Directorio Fields
    directoryEnabled?: boolean;
    directoryStatus?: DirectoryStatus;
    category?: string;
    tags?: string[];
    rating?: number;
    reviewCount?: number;
    ratingDistribution?: Record<string, number>; // Distribución de 1 a 5 estrellas
    socialLinks?: {
        instagram?: string;
        facebook?: string;
        whatsapp?: string;
    };
    internalNotes?: string;
    limitesExtra?: {
        products?: number;
        blogPosts?: number;
        landingPages?: number;
        promotions?: number;
        coupons?: number;
        orders?: number;
        suggestions?: number;
        [key: string]: number | undefined;
    };
    loyaltyConfig?: LoyaltyConfig;
};
