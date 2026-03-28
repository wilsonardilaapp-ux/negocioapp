
export type CloudinaryFields = {
    cloud_name: string;
    api_key: string;
    api_secret: string;
};

export type WhapiFields = {
    apiKey: string;
    instanceId: string;
};

export type AIProviderFields = {
    google: {
        apiKey: string;
    };
    openai: {
        apiKey: string;
    };
    groq: {
        apiKey: string;
    };
};

export type Integration = {
    id: string;
    name: string;
    fields: string; // JSON string for API keys, etc.
    status: 'active' | 'inactive';
    updatedAt?: string;
};
