export type Module = {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive';
    createdAt: string;
    limit?: number; // Límite de registros permitidos
};
