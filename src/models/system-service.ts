export type SystemService = {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    limit: number;
    lastUpdate: string;
};