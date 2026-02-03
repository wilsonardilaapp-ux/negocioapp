'use server';

export type SuggestionType = "cross-sell" | "upsell" | "bundle";

export type DayOfWeek = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado" | "domingo";

export interface SuggestionRule {
    id: string;
    businessId: string;
    triggerItem: string; // ID del producto
    suggestedItem: string; // ID del producto
    suggestionType: SuggestionType;
    active: boolean;
    priority: number;
    timezone?: string;
    fallbackToAI?: boolean; // Nuevo campo para el respaldo de IA
    conditions: {
        timeRange?: { start: string; end: string };
        daysOfWeek?: DayOfWeek[];
        minMargin?: number;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        stock?: number;
    };
    metrics: {
        timesShown: number;
        timesAccepted: number;
        revenueGenerated: number;
        conversionRate: number;
    };
    createdAt: string;
    updatedAt: string;
}
