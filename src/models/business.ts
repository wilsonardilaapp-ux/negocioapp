
export type Business = {
    id: string;
    name: string;
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
};
