
export type GlobalConfig = {
    id: string;
    maintenance: boolean;
    logoURL: string;
    faviconUrl?: string; // Add faviconUrl
    theme: string;
    supportEmail: string;
    defaultLimits: number;
    allowUserRegistration: boolean;
    mainBusinessId?: string; // ID del negocio a mostrar en la página principal
};
