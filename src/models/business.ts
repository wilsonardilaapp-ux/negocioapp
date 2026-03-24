
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'pending_payment';

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
    description: string;
    googleAnalyticsId?: string; // Add the optional GA ID field
    vatRate?: number;
    deliveryFee?: number;
    packagingFee?: number;
    planName?: string;
    status: EntityStatus;
    imageLimit?: number;
    productLimit?: number;
};

    