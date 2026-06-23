/**
 * @fileOverview Types for the Directory Ads module.
 */

export type AdFormat = 'google_display' | 'meta_feed' | 'meta_story';
export type AdPosition = 'top' | 'mid' | 'grid' | 'sidebar';

export interface DirectoryAd {
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    linkUrl: string;
    format: AdFormat;
    position: AdPosition;
    active: boolean;
    views: number;
    clicks: number;
    createdAt: string;
    updatedAt: string;
    businessId?: string; // Opcional: si el anuncio pertenece a un negocio del directorio
}

export const AD_FORMAT_LABELS: Record<AdFormat, string> = {
    google_display: 'Google Display (Banner)',
    meta_feed: 'Meta Feed (Cuadrado)',
    meta_story: 'Meta Story (Vertical)'
};

export const AD_POSITION_LABELS: Record<AdPosition, string> = {
    top: 'Cabecera Superior',
    mid: 'Entre Resultados',
    grid: 'Dentro de Rejilla',
    sidebar: 'Barra Lateral'
};
