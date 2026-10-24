export interface TrackingCard {
  id: string;
  name: string;        // Nombre visible del canal (ej: "WhatsApp", "TikTok")
  code: string;        // Código en URL (ej: "whatsapp", "tiktok")
  active: boolean;     // Activo o inactivo
  createdAt: string;
  visitsCount?: number;
  submissionsCount?: number;
}

export interface TrackingConfig {
  customAlias: string;
  updatedAt: string;
}

export interface ChannelPerformance {
  channelCode: string;
  channelName: string;
  visits: number;
  submissions: number;
  conversionRate: number;      // Porcentaje (submissions / visits * 100)
  confirmedPayments: number;   // Cantidad de pagos confirmados
  confirmedValueCOP: number;   // Suma total en COP
}

export interface TrackingTimelinePoint {
  date: string;
  visits: number;
  submissions: number;
}

export interface TrackingAnalyticsData {
  config: TrackingConfig;
  cards: TrackingCard[];
  performance: ChannelPerformance[];
  timeline: TrackingTimelinePoint[];
  totals: {
    visits: number;
    submissions: number;
    conversionRate: number;
    confirmedPayments: number;
    confirmedValueCOP: number;
  };
}
