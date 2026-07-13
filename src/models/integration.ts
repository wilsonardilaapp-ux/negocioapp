
export type CloudinaryFields = {
    cloud_name: string;
    api_key: string;
    api_secret: string;
};

export type WhapiFields = {
    apiKey: string;
    instanceId: string;
};

/**
 * Define un rango horario para la optimización de uso de IA.
 */
export type PeakHourRange = {
    start: string; // Formato "HH:mm" (ej. "09:00")
    end: string;   // Formato "HH:mm" (ej. "18:00")
};

/**
 * Estructura común para los proveedores de IA con soporte para optimización horaria.
 */
export type AIProviderFields = {
    google?: { 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
    openai?: { 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
    groq?: { 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
    nanobanana?: { 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
    deepseek?: { 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
    qwen?: { 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
    zai?: { 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
    custom?: { 
        endpoint: string; 
        apiKey: string;
        peakHours?: PeakHourRange[];
        timezone?: string;
        avoidInPeakHours?: boolean;
    };
};

export type Integration = {
    id: string;
    name: string;
    fields: string; // JSON string for API keys, etc.
    status: 'active' | 'inactive';
    updatedAt?: string;
};
